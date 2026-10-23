const express = require('express');
const router = express.Router();
const kycController = require('../controllers/kycController');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');

router.post('/submit', authMiddleware, roleMiddleware(['agent', 'buyer', 'renter']), kycController.submitKyc);
router.get('/status', authMiddleware, roleMiddleware(['agent', 'buyer', 'renter']), kycController.getKycStatus);

module.exports = router;
