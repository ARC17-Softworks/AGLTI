const express = require('express');

const { searchDevelopers } = require('../controllers/search');

const router = express.Router();

const { protect, authorize } = require('../middleware/auth');

router
	.route('/developers/:positionId')
	.get(protect, authorize('OWNER'), searchDevelopers);

module.exports = router;
