const ErrorResponse = require('../utils/errorResponse');
const mongoose = require('mongoose');
const asyncHandler = require('../middleware/async');
const Profile = require('../models/Profile');
const Project = require('../models/Project');
const Position = require('../models/Position');

// @desc	create a post
// @route	POST /api/v1/posts
// @access	Private
exports.createPost = asyncHandler(async (req, res, next) => {
	const project = await Project.findById(req.project);
	const { title, text } = req.body;
	project.posts.unshift({ user: req.user.id, title, text });

	await project.save();
	res.status(201).json({
		success: true,
		data: project,
	});
});

// @desc	delete post
// @route	POST /api/v1/posts/:postId
// @access	Private
exports.deletePost = asyncHandler(async (req, res, next) => {
	const project = await Project.findById(req.project);
	const delpost = project.posts.id(req.params.postId);
	if (!delpost) {
		return next(
			new ErrorResponse(
				`Resource not found with id of ${req.params.postId}`,
				404
			)
		);
	}

	// only user who posted or project manager can delete posts
	if (
		delpost.user.toString() != req.user.id.toString() &&
		project.owner.toString() != req.user.id.toString()
	) {
		return next(
			new ErrorResponse('Not authorised to access this resource', 401)
		);
	}

	project.posts = project.posts.filter(
		(post) => post.id.toString() != delpost.id.toString()
	);

	await project.save();
	res.status(200).json({
		success: true,
		data: project,
	});
});

// @desc	comment on a post
// @route	POST /api/v1/posts/:postId/comments
// @access	Private
exports.createComment = asyncHandler(async (req, res, next) => {
	const project = await Project.findById(req.project);
	const commpost = project.posts.id(req.params.postId);
	if (!commpost) {
		return next(
			new ErrorResponse(
				`Resource not found with id of ${req.params.postId}`,
				404
			)
		);
	}
	const postIndex = project.posts.findIndex(
		(post) => post.id.toString() === req.params.postId.toString()
	);
	project.posts[postIndex].comments.push({
		user: req.user.id,
		text: req.body.text,
	});

	await project.save();
	res.status(201).json({
		success: true,
		data: project,
	});
});

// @desc	delete comment
// @route	POST /api/v1/posts/:postId/comments/:commentId
// @access	Private
exports.deleteComment = asyncHandler(async (req, res, next) => {
	const project = await Project.findById(req.project);
	const delpost = project.posts.id(req.params.postId);
	if (!delpost) {
		return next(
			new ErrorResponse(
				`Resource not found with id of ${req.params.postId}`,
				404
			)
		);
	}
	const delcomment = delpost.comments.id(req.params.commentId);
	if (!delcomment) {
		return next(
			new ErrorResponse(
				`Resource not found with id of ${req.params.commentId}`,
				404
			)
		);
	}

	// only user who posted comment or project manager can delete comment
	if (
		delcomment.user.toString() != req.user.id.toString() &&
		project.owner.toString() != req.user.id.toString()
	) {
		return next(
			new ErrorResponse('Not authorised to access this resource', 401)
		);
	}

	const postIndex = project.posts.findIndex(
		(post) => post.id.toString() === req.params.postId.toString()
	);

	project.posts[postIndex].comments = project.posts[postIndex].comments.filter(
		(comment) => comment.id.toString() != delcomment.id.toString()
	);

	await project.save();
	res.status(200).json({
		success: true,
		data: project,
	});
});

// @desc	get all posts
// @route	GET /api/v1/posts/
// @access	Private
exports.getPosts = asyncHandler(async (req, res, next) => {
	let posts = await Project.findById(req.project)
		.select('posts')
		.populate('posts.user', 'name avatar');
	posts = posts.posts;

	// pagination
	const pagination = {};
	const page = parseInt(req.query.page, 10) || 1;
	const limit = 20;
	const startIndex = (page - 1) * limit;
	const endIndex = page * limit;
	const total = posts.length;

	posts = posts.slice(startIndex, endIndex);
	posts = posts.map((post) => ({
		_id: post.id,
		user: post.user,
		title: post.title,
		text: post.text,
		date: post.date,
	}));

	if (endIndex < total) {
		pagination.next = {
			page: page + 1,
			limit,
		};
	}

	if (startIndex > 0) {
		pagination.prev = {
			page: page - 1,
			limit,
		};
	}

	pagination.pages = Math.ceil(total / limit);

	res.status(200).json({
		success: true,
		count: posts.length,
		pagination,
		total,
		data: posts,
	});
});

// @desc	get single post by id
// @route	GET /api/v1/posts/:postId
// @access	Private
exports.getPost = asyncHandler(async (req, res, next) => {
	let project = await Project.findById(req.project)
		.select('posts')
		.populate('posts.user', 'name avatar')
		.populate('posts.comments.user', 'name avatar');
	const post = project.posts.id(req.params.postId);
	if (!post) {
		return next(
			new ErrorResponse(
				`Resource not found with id of ${req.params.postId}`,
				404
			)
		);
	}

	res.status(201).json({
		success: true,
		data: post,
	});
});

// @desc	get single comment by id
// @route	GET /api/v1/posts/:postId/comments/:commentId
// @access	Private
exports.getComment = asyncHandler(async (req, res, next) => {
	let project = await Project.findById(req.project)
		.select('posts')
		.populate('posts.comments.user', 'name avatar');
	const post = project.posts.id(req.params.postId);
	if (!post) {
		return next(
			new ErrorResponse(
				`Resource not found with id of ${req.params.postId}`,
				404
			)
		);
	}

	const comment = post.comments.id(req.params.commentId);
	if (!comment) {
		return next(
			new ErrorResponse(
				`Resource not found with id of ${req.params.commentId}`,
				404
			)
		);
	}

	res.status(201).json({
		success: true,
		data: comment,
	});
});

// @desc	notify mention to user
// @route	PUT /api/v1/posts/mention/:userId/:postId/:commentId
// @access	Private
exports.getComment = asyncHandler(async (req, res, next) => {
	let project = await Project.findById(req.project)
		.select('posts')
		.populate('posts.comments.user', 'name avatar');
	const post = project.posts.id(req.params.postId);
	if (!post) {
		return next(
			new ErrorResponse(
				`Resource not found with id of ${req.params.postId}`,
				404
			)
		);
	}

	const comment = post.comments.id(req.params.commentId);
	if (!comment) {
		return next(
			new ErrorResponse(
				`Resource not found with id of ${req.params.commentId}`,
				404
			)
		);
	}

	res.status(201).json({
		success: true,
		data: comment,
	});
});
