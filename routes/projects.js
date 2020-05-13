const express = require('express');
const {
	createProject,
	addPosition,
	removePosition,
} = require('../controllers/projectManagers');

const router = express.Router();

const { protect, authorize } = require('../middleware/auth');

// project manager routes
router.route('/').post(protect, createProject);
router.route('/position').post(protect, authorize('OWNER'), addPosition);
router
	.route('/position/:positionId')
	.delete(protect, authorize('OWNER'), removePosition);

module.exports = router;
