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
