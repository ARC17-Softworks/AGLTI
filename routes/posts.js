const express = require('express');
const {
	createPost,
	deletePost,
	createComment,
	deleteComment,
	getPosts,
} = require('../controllers/posts');

const router = express.Router();

const { protect, authorize } = require('../middleware/auth');

router
	.route('/')
	.post(protect, authorize('BOTH'), createPost)
	.get(protect, authorize('BOTH'), getPosts);
router.route('/:postId').delete(protect, authorize('BOTH'), deletePost);
router
	.route('/:postId/comments')
	.post(protect, authorize('BOTH'), createComment);
router
	.route('/:postId/comments/:commentId')
	.delete(protect, authorize('BOTH'), deleteComment);

module.exports = router;
