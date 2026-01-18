import { Router } from 'express';
import { createSecret, fetchSecretOnce, validateToken } from '../controllers/secret.controller.js';

const router = Router();

router.post('/', createSecret);
// Retrieve (and burn) secret
router.post('/:token', validateToken, fetchSecretOnce);

export default router;
