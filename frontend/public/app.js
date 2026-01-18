// Default to same-origin API; adjust if serving frontend elsewhere.
const apiBase = window.location.origin;
// bcryptjs bundle attaches to window.dcodeIO.bcrypt; expose for module scope.
const bcryptLib = (window.dcodeIO && window.dcodeIO.bcrypt) || undefined;

const secretEl = document.querySelector('#secret');
const passwordEl = document.querySelector('#password');
const expiryEl = document.querySelector('#expiry');
const createBtn = document.querySelector('#createBtn');
const createStatus = document.querySelector('#createStatus');
const createSection = document.querySelector('#createSection'); // New
const readSection = document.querySelector('#readSection');     // New

const linkContainer = document.querySelector('#linkContainer');
const shareUrl = document.querySelector('#shareUrl');
const copyBtn = document.querySelector('#copyBtn');             // New

const readStatus = document.querySelector('#readStatus');
const secretDisplay = document.querySelector('#secretDisplay');
const decryptedEl = document.querySelector('#decrypted');
const copyDecryptedBtn = document.querySelector('#copyDecryptedBtn'); // New

const toast = document.querySelector('#toast');                 // New
const toastMsg = document.querySelector('#toastMsg');           // New

function showToast(message) {
  toastMsg.textContent = message;
  toast.classList.remove('hidden');
  setTimeout(() => {
    toast.classList.add('hidden');
  }, 3000);
}

function copyToClipboard(text) {
  navigator.clipboard.writeText(text).then(() => {
    showToast('Copied to clipboard!');
  }).catch(err => {
    console.error('Failed to copy:', err);
    showToast('Failed to copy');
  });
}

function bufToBase64(buf) {
  return btoa(String.fromCharCode(...new Uint8Array(buf)));
}

function base64ToBuf(b64) {
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
}

function randomBytes(length) {
  const arr = new Uint8Array(length);
  crypto.getRandomValues(arr);
  return arr;
}

async function deriveKey(password, salt, iterations = 150000) {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

async function encryptSecret(plaintext, password) {
  const salt = randomBytes(16);
  const iv = randomBytes(12);
  const key = await deriveKey(password, salt);
  const enc = new TextEncoder();
  const cipherBuf = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    enc.encode(plaintext)
  );
  return {
    ciphertextB64: bufToBase64(cipherBuf),
    ivB64: bufToBase64(iv),
    saltB64: bufToBase64(salt),
  };
}

async function decryptSecret(ciphertextB64, ivB64, saltB64, password) {
  const iv = base64ToBuf(ivB64);
  const salt = base64ToBuf(saltB64);
  const key = await deriveKey(password, salt);
  const cipherBuf = base64ToBuf(ciphertextB64);
  const plainBuf = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    cipherBuf
  );
  const dec = new TextDecoder();
  return dec.decode(plainBuf);
}

async function digestMessage(message) {
    const msgUint8 = new TextEncoder().encode(message);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function handleCreate() {
  const plaintext = secretEl.value.trim();
  const password = passwordEl.value;
  const expiresInMinutes = parseInt(expiryEl.value, 10);

  if (!plaintext) {
    createStatus.textContent = 'Secret is required.';
    return;
  }

  createStatus.textContent = 'Encrypting...';
  let encryptionKey = password;
  let embedKey = null;

  if (!encryptionKey) {
    // Generate a random key for users without a password and embed in URL fragment.
    const rand = randomBytes(32);
    embedKey = bufToBase64(rand);
    encryptionKey = embedKey;
  }

  const { ciphertextB64, ivB64, saltB64 } = await encryptSecret(plaintext, encryptionKey);

  let passwordHash = null;
  // If user provided a password (or we generated one), we need an Auth Key.
  // Auth Key = SHA256(Encryption Key)
  // Server stores: Scrypt/Bcrypt(Auth Key)
  
  // For password-protected secrets, we MUST explicitly require the password to unlock.
  // For auto-generated keys (embedded), the "password" comes from the URL.
  
  // We always produce a passwordHash for the server, derived from the encryption key.
  // This creates the "Gate".
  if (!bcryptLib) {
      createStatus.textContent = 'Crypto library not loaded; refresh and try again.';
      return;
  }
  
  const authKey = await digestMessage(encryptionKey);
  passwordHash = bcryptLib.hashSync(authKey, 12);

  const payload = {
    ciphertext: ciphertextB64,
    iv: ivB64,
    salt: saltB64,
    passwordHash,
    expiresInMinutes,
  };

  createStatus.textContent = 'Submitting...';
  const resp = await fetch(`${apiBase}/api/secret`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!resp.ok) {
    createStatus.textContent = 'Failed to create secret.';
    return;
  }

  const data = await resp.json();
  const url = new URL(window.location.href);
  
  // If user set a password, DO NOT embed it.
  // If we generated the key, embed it.
  url.hash = `token=${data.token}${embedKey ? `&key=${encodeURIComponent(embedKey)}` : ''}`;
  
  shareUrl.value = url.toString();
  linkContainer.classList.remove('hidden');
  createStatus.textContent = 'Secret created. Share the link below.';
  secretEl.value = '';
  passwordEl.value = '';
}

createBtn.addEventListener('click', () => {
  handleCreate().catch((err) => {
    console.error('Unexpected error creating secret:', err);
    createStatus.textContent = 'Unexpected error creating secret.';
  });
});

copyBtn.addEventListener('click', () => {
  if (shareUrl.value) {
    copyToClipboard(shareUrl.value);
  }
});

copyDecryptedBtn.addEventListener('click', () => {
  if (decryptedEl.value) {
    copyToClipboard(decryptedEl.value);
  }
});

function parseHashOrQuery() {
  // Prefer hash (share link uses #token=...&key=...), but also support ?token=...
  const sources = [];
  if (window.location.hash) sources.push(new URLSearchParams(window.location.hash.substring(1)));
  if (window.location.search) sources.push(new URLSearchParams(window.location.search.substring(1)));
  for (const params of sources) {
    const token = params.get('token');
    const key = params.get('key');
    if (token) {
      console.debug('Parsed token from URL', { token, hasKey: !!key });
      return { token, key };
    }
  }
  console.debug('No token found in hash or query', {
    href: window.location.href,
    hash: window.location.hash,
    search: window.location.search,
  });
  return {};
}

async function loadSecretIfPresent() {
  const { token, key } = parseHashOrQuery();
  if (!token) {
    console.debug('No token found in URL; showing create form.');
    createSection.classList.remove('hidden'); // Show create by default
    readSection.classList.add('hidden');
    return;
  }

  // Switch to read view
  createSection.classList.add('hidden');
  readSection.classList.remove('hidden');

  readStatus.textContent = 'Fetching secret...';
  let password = key;
  if (!password) {
    password = window.prompt('Enter password to decrypt (if set):') || '';
  }

  // Derive Auth Key from the password/key provided
  const authKey = await digestMessage(password);

  console.debug('Fetching secret from API', { apiBase, token });
  let resp;
  try {
    resp = await fetch(`${apiBase}/api/secret/${encodeURIComponent(token)}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ authKey })
    });
  } catch (err) {
    console.error('Network error fetching secret:', err);
    readStatus.textContent = 'Network error fetching secret.';
    return;
  }
  
  if (resp.status === 404) {
      const err = await resp.json();
      if (err.error && err.error.includes('invalid password')) {
          readStatus.textContent = 'Invalid Password. Please refresh and try again.';
      } else {
        readStatus.textContent = 'Secret not found or already read/expired.';
      }
      return;
  }

  if (!resp.ok) {
     readStatus.textContent = 'Error fetching secret.';
     return;
  }
  
  const data = await resp.json();

  try {
    const plaintext = await decryptSecret(
      data.ciphertext,
      data.iv,
      data.salt,
      password
    );
    decryptedEl.value = plaintext;
    secretDisplay.classList.remove('hidden');
    readStatus.textContent = 'Decrypted below. This secret is now destroyed server-side.';
    // Clean URL hash to avoid reuse.
    history.replaceState(null, '', window.location.pathname);
  } catch (_e) {
    // This case should not happen often now that we have an auth gate, unless local decryption fails after server success.
    readStatus.textContent = 'Decryption failed (corrupted data?).';
  }
}

loadSecretIfPresent().catch((err) => {
  console.error('Error fetching secret:', err);
  readStatus.textContent = 'Error fetching secret.';
});

