import crypto from 'crypto';

export function generateToken() {
  // 32 bytes -> 64 hex chars; high entropy, unguessable
  return crypto.randomBytes(32).toString('hex');
}

export function nowUtc() {
  return new Date();
}

