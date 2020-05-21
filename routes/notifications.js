const express = require('express');

const router = express.Router();

const { getNotifications } = require('../controllers/notifications');

const { protect } = require('../middleware/auth');

router.route('/').get(protect, getNotifications);

module.exports = router;
