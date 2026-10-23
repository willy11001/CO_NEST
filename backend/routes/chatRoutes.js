const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');
const authMiddleware = require('../middleware/authMiddleware');

router.post('/conversations', authMiddleware, chatController.startConversation);
router.get('/conversations', authMiddleware, chatController.getConversations);
router.post('/messages', authMiddleware, chatController.sendMessage);
router.get('/conversations/:conversationId/messages', authMiddleware, chatController.getMessages);
router.post('/block', authMiddleware, chatController.blockUser);
router.post('/unblock', authMiddleware, chatController.unblockUser);
router.get('/block-status', authMiddleware, chatController.getBlockStatus);
router.post('/report', authMiddleware, chatController.reportConversation);

module.exports = router;
