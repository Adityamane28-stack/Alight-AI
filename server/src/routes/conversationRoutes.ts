import { Router } from 'express';
import {
  listConversations,
  createConversation,
  getConversation,
  updateConversation,
  deleteConversation,
} from '../controllers/conversationController.js';
import { authenticate } from '../middleware/authMiddleware.js';

const router = Router();

// All conversation routes require authentication
router.use(authenticate);

router.get('/', listConversations);
router.post('/', createConversation);
router.get('/:id', getConversation);
router.patch('/:id', updateConversation);
router.delete('/:id', deleteConversation);

export default router;

