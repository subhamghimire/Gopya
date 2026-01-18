import { generateToken } from '../utils/crypto.js';
import { createSecretSchema } from '../validation/secret.schema.js';
import { saveSecret, consumeSecret } from '../services/secret.service.js';


export function validateToken(req, res, next) {
    const { token } = req.params;
    if (!token || typeof token !== 'string' || token.length !== 64) {
      return res.status(404).json({ error: 'Not found' });
    }
    next();
}

export async function createSecret(req, res, next) {
  try {
    const { error, value } = createSecretSchema.validate(req.body, { abortEarly: false });
    if (error) {
      return res.status(400).json({ error: 'Invalid payload', details: error.details });
    }

    const { ciphertext, iv, salt, passwordHash, expiresInMinutes } = value;
    const token = generateToken();
    const expiresAt = new Date(Date.now() + expiresInMinutes * 60 * 1000);

    await saveSecret({
      token,
      ciphertext,
      iv,
      salt,
      passwordHash: passwordHash || null,
      expiresAt,
    });

    res.status(201).json({ token, expiresAt });
  } catch (err) {
    next(err);
  }
}

export async function fetchSecretOnce(req, res, next) {
  try {
    const { token } = req.params;
    // Token validated by middleware

    const secret = await consumeSecret(token, req.body.authKey);
    if (!secret) {
      return res.status(404).json({ error: 'Not found or invalid password' });
    }

    res.json(secret);
  } catch (err) {
    next(err);
  }
}

