const express = require('express');
const {
	createProject,
	addPosition,
	removePosition,
	assignTask,
} = require('../controllers/projectManagers');
const { pushTask } = require('../controllers/developers');

const router = express.Router();

const { protect, authorize } = require('../middleware/auth');

// project manager routes
router.route('/').post(protect, createProject);
router.route('/position').post(protect, authorize('OWNER'), addPosition);
router
	.route('/position/:positionId')
	.delete(protect, authorize('OWNER'), removePosition);
router
	.route('/tasks/assign/:userId')
	.post(protect, authorize('OWNER'), assignTask);

// developer routes
router.route('/tasks/:taskId/push').put(protect, authorize('MEMBER'), pushTask);

module.exports = router;
