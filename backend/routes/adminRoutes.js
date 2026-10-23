const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');

// Unprotected admin login
router.post('/login', adminController.adminLogin);

// Protect all other admin routes
router.use(authMiddleware);
router.use(roleMiddleware(['admin']));

router.get('/analytics', adminController.getDashboardAnalytics);
router.get('/users', adminController.getUsers);
router.get('/kyc/pending', adminController.getPendingKyc);
router.post('/kyc/verify', adminController.verifyKyc);
router.post('/land-registry/add', adminController.addToLandRegistry);
router.get('/reported-chats', adminController.getReportedConversations);
router.post('/reported-chats/resolve', adminController.resolveReport);

module.exports = router;
