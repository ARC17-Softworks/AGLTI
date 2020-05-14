const ErrorResponse = require('../utils/errorResponse');
const mongoose = require('mongoose');
const asyncHandler = require('../middleware/async');
const Profile = require('../models/Profile');
const Project = require('../models/Project');
const Position = require('../models/Position');

// @desc	push task forward to next stage
// @route	PUT /api/v1/projects/tasks/:taskId/push
// @access	Private
exports.pushTask = asyncHandler(async (req, res, next) => {
	const project = await Project.findById(req.project);

	const task = project.tasks.id(req.params.taskId);

	if (!task) {
		return next(new ErrorResponse('task not found', 404));
	}

	if (task.dev.toString() != req.user.id.toString()) {
		return next(new ErrorResponse('task does not belong to user', 400));
	}

	const taskIndex = project.tasks.findIndex((t) => t === task);

	if (project.tasks[taskIndex].status === 'TODO') {
		project.tasks[taskIndex].status = 'DOING';
	} else if (project.tasks[taskIndex].status === 'DOING') {
		project.tasks[taskIndex].status = 'DONE';
	}

	await project.save();
	res.status(200).json({
		success: true,
		data: project,
	});
});
