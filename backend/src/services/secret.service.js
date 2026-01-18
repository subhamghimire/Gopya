import { getPool } from '../db/pool.js';
import { nowUtc } from '../utils/crypto.js';
import bcrypt from 'bcrypt';

export async function saveSecret({
  token,
  ciphertext,
  iv,
  salt,
  passwordHash = null,
  expiresAt,
}) {
  const pool = getPool();
  const sql =
    'INSERT INTO secrets (token, encrypted_message, iv, salt, password_hash, expires_at) VALUES (?, ?, ?, ?, ?, ?)';
  await pool.execute(sql, [
    token,
    Buffer.from(ciphertext, 'base64'),
    Buffer.from(iv, 'base64'),
    Buffer.from(salt, 'base64'),
    passwordHash,
    expiresAt,
  ]);
  return token;
}

export async function consumeSecret(token, authKey) {
  const pool = getPool();
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [rows] = await conn.execute(
      'SELECT id, token, encrypted_message, iv, salt, password_hash, failed_attempts, expires_at, read_at, created_at FROM secrets WHERE token = ? FOR UPDATE',
      [token]
    );

    if (!rows || rows.length === 0) {
      await conn.rollback();
      return null;
    }

    const secret = rows[0];
    const now = nowUtc();

    if (secret.read_at || new Date(secret.expires_at) <= now) {
      await conn.execute('UPDATE secrets SET read_at = ? WHERE id = ?', [now, secret.id]);
      await conn.commit();
      return null;
    }
    
    // Authentication Gate
    if (secret.password_hash) {
        if (!authKey) {
            // No key provided for protected secret
             await conn.rollback();
             return null;
        }

        const match = await bcrypt.compare(authKey, secret.password_hash.toString());
        if (!match) {
            // Increment failed attempts
            const attempts = (secret.failed_attempts || 0) + 1;
            if (attempts >= 5) {
                // Burn it
                 await conn.execute('DELETE FROM secrets WHERE id = ?', [secret.id]);
            } else {
                 await conn.execute('UPDATE secrets SET failed_attempts = ? WHERE id = ?', [attempts, secret.id]);
            }
            await conn.commit();
            return null;
        }
    }

    // Success - Burn it
    await conn.execute('DELETE FROM secrets WHERE id = ?', [secret.id]);
    await conn.commit();

    return {
      ciphertext: Buffer.isBuffer(secret.encrypted_message)
        ? secret.encrypted_message.toString('base64')
        : secret.encrypted_message,
      iv: Buffer.isBuffer(secret.iv) ? secret.iv.toString('base64') : secret.iv,
      salt: Buffer.isBuffer(secret.salt) ? secret.salt.toString('base64') : secret.salt,
      passwordProtected: !!secret.password_hash,
      expiresAt: secret.expires_at,
      createdAt: secret.created_at,
    };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

