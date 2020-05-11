const express = require('express');
const {
	createProject,
	addPosition,
} = require('../controllers/projectManagers');

const router = express.Router();

const { protect, authorize } = require('../middleware/auth');

// project manager routes
router.route('/').post(protect, createProject);
router.route('/position').post(protect, authorize('OWNER'), addPosition);

module.exports = router;
