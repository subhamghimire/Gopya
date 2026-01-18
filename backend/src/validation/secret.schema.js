import Joi from 'joi';

export const createSecretSchema = Joi.object({
  ciphertext: Joi.string().min(16).max(8192).required(),
  iv: Joi.string().min(12).max(64).required(),
  salt: Joi.string().min(16).max(128).required(),
  passwordHash: Joi.string().min(10).max(128).optional(),
  expiresInMinutes: Joi.number().integer().min(1).max(60 * 24 * 30).required(), // up to 30 days
});

