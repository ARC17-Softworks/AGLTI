const express = require('express');
const {
	createProject,
	addPosition,
	removePosition,
	assignTask,
	returnTask,
	closeTask,
	removeDeveloper,
	closeProject,
} = require('../controllers/projectManagers');

const { pushTask, leaveProject } = require('../controllers/developers');

const { currentProject, getProject } = require('../controllers/projects');

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
router
	.route('/members/:userId/remove')
	.delete(protect, authorize('OWNER'), removeDeveloper);
router.route('/close').delete(protect, authorize('OWNER'), closeProject);

// developer routes
router.route('/tasks/:taskId/push').put(protect, authorize('MEMBER'), pushTask);
router.route('/leave').delete(protect, authorize('MEMBER'), leaveProject);

// view routes
router.route('/').get(protect, authorize('BOTH'), currentProject);
router.route('/:projectId').get(protect, getProject);

module.exports = router;
