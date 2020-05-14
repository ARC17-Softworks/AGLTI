const express = require('express');
const {
	createProject,
	addPosition,
	removePosition,
	assignTask,
	returnTask,
	closeTask,
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
router
	.route('/tasks/:taskId/return')
	.put(protect, authorize('OWNER'), returnTask);
router
	.route('/tasks/:taskId/close')
	.put(protect, authorize('OWNER'), closeTask);

// developer routes
router.route('/tasks/:taskId/push').put(protect, authorize('MEMBER'), pushTask);

module.exports = router;
