const express = require('express');

const router = express.Router();

const { sendMessage } = require('../controllers/messages');

const { protect } = require('../middleware/auth');

router.route('/to/:userId').post(protect, sendMessage);

module.exports = router;
