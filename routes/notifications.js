const express = require('express');

const router = express.Router();

const { getNotifications, markRead } = require('../controllers/notifications');

const { protect } = require('../middleware/auth');

router.route('/').get(protect, getNotifications);
router.route('/clear/:path').put(protect, markRead);

module.exports = router;
