import express from 'express';
import * as messageController from '../controllers/messageController';
import { authenticateToken } from '../middlewares/auth';

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

router.post('/', messageController.sendMessage);
router.get('/group/:groupId', messageController.getGroupMessages);
router.post('/:messageId/read', messageController.markAsRead);
router.get('/:messageId/smart-replies', messageController.getSmartReplies);

export default router;