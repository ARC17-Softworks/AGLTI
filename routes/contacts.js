const express = require('express');

const router = express.Router();

const { sendRequestId, sendRequestEmail } = require('../controllers/contacts');

const { protect } = require('../middleware/auth');

router.route('/invite/:userId').put(protect, sendRequestId);
router.route('/invite').put(protect, sendRequestEmail);

module.exports = router;
