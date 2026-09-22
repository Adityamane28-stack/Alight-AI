import { Router } from 'express';
import { register, login, getMe, googleAuth, getGoogleConfig } from '../controllers/authController.js';
import { authenticate } from '../middleware/authMiddleware.js';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.get('/google/config', getGoogleConfig);
router.post('/google', googleAuth);
router.get('/me', authenticate, getMe);

export default router;

