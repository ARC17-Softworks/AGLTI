const express = require('express');
const {
	createPost,
	deletePost,
	createComment,
	deleteComment,
	getPosts,
	getPost,
	getComment,
	notifyMention,
} = require('../controllers/posts');

const router = express.Router();

const { protect, authorize } = require('../middleware/auth');

router
	.route('/')
	.post(protect, authorize('BOTH'), createPost)
	.get(protect, authorize('BOTH'), getPosts);
router
	.route('/:postId')
	.get(protect, authorize('BOTH'), getPost)
	.delete(protect, authorize('BOTH'), deletePost);
router
	.route('/:postId/comments')
	.post(protect, authorize('BOTH'), createComment);
router
	.route('/:postId/comments/:commentId')
	.get(protect, authorize('BOTH'), getComment)
	.delete(protect, authorize('BOTH'), deleteComment);
router
	.route('/mention/:userId/:postId/:commentId')
	.put(protect, authorize('BOTH'), notifyMention);
router
	.route('/mention/:userId/:postId')
	.put(protect, authorize('BOTH'), notifyMention);

module.exports = router;
