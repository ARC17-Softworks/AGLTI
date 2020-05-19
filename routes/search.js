const express = require('express');

const { searchDevelopers, searchPositions } = require('../controllers/search');

const router = express.Router();

const { protect, authorize } = require('../middleware/auth');

router
	.route('/developers/:positionId')
	.get(protect, authorize('OWNER'), searchDevelopers);

router.route('/positions').get(protect, searchPositions);

module.exports = router;
