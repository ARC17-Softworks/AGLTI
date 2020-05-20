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

const {
	createPost,
	deletePost,
	createComment,
	deleteComment,
} = require('../controllers/forums');

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

// forum routes
router.route('/posts').post(protect, authorize('BOTH'), createPost);
router.route('/posts/:postId').delete(protect, authorize('BOTH'), deletePost);
router
	.route('/posts/:postId/comments')
	.post(protect, authorize('BOTH'), createComment);
router
	.route('/posts/:postId/comments/:commentId')
	.delete(protect, authorize('BOTH'), deleteComment);

module.exports = router;
