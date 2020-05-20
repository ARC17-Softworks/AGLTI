const ErrorResponse = require('../utils/errorResponse');
const mongoose = require('mongoose');
const asyncHandler = require('../middleware/async');
const Profile = require('../models/Profile');
const Project = require('../models/Project');
const Position = require('../models/Position');

// @desc	create a post
// @route	POST /api/v1/projects/posts
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
// @route	POST /api/v1/projects/posts/:postId
// @access	Private
exports.deletePost = asyncHandler(async (req, res, next) => {
	const project = await Project.findById(req.project);
	const delpost = project.posts.id(req.params.postId);
	if (!delpost) {
		return next(
			new ErrorResponse(`Resource not found with id of ${req.user.postId}`, 404)
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
