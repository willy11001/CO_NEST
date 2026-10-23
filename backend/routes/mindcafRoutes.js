const express = require('express');
const router = express.Router();
const mindcafController = require('../controllers/mindcafController');

router.post('/verify', mindcafController.verifyTitle);

module.exports = router;
