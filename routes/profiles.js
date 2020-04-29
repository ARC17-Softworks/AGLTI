const express = require('express');
const { createProfile, getMe } = require('../controllers/profiles');

const router = express.Router();

const { protect } = require('../middleware/auth');

router.post('/', protect, createProfile);
router.get('/me', protect, getMe);

module.exports = router;
