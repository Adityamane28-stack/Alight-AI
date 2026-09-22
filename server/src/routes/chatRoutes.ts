import { Router } from 'express';
import { streamMessage } from '../controllers/chatController.js';
import { authenticate } from '../middleware/authMiddleware.js';

const router = Router();

// Chat streaming endpoint requires authentication
router.post('/stream', authenticate, streamMessage);

export default router;

