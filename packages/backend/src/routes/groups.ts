import express from 'express';
import * as groupController from '../controllers/groupController';
import { authenticateToken } from '../middlewares/auth';

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

router.post('/', groupController.createGroup);
router.get('/', groupController.getAllGroups);
router.post('/:groupId/join', groupController.joinGroup);
router.post('/:groupId/leave', groupController.leaveGroup);
router.post('/:groupId/transfer-ownership', groupController.transferOwnership);
router.delete('/:groupId', groupController.deleteGroup);

export default router;