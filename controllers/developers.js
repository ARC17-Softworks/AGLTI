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
		project.tasks[taskIndex].note = undefined;
	}

	await project.save();
	res.status(200).json({
		success: true,
		data: project,
	});
});

// @desc	leave project
// @route	DELETE /api/v1/projects/leave
// @access	Private
exports.leaveProject = asyncHandler(async (req, res, next) => {
	const project = await Project.findById(req.project);
	const profile = await Profile.findOne({ user: req.user.id });

	const developer = project.members.find(
		(member) => member.dev.toString() === req.user.id.toString()
	);

	if (!developer) {
		return next(new ErrorResponse('user not part of project', 404));
	}

	// if developer did not contribute to project
	if (
		!project.tasks.some(
			(task) =>
				task.dev.toString() === req.user.id.toString() &&
				task.status === 'COMPLETE'
		)
	) {
		// remove project from profile
		profile.projects.shift();
	} else {
		// add to past members
		project.previousMembers.push(developer);
	}

	// remove from members
	project.members = project.members.filter((member) => member != developer);
	// unset active project
	profile.activeProject = undefined;

	// remove tasks of dev
	project.tasks = project.tasks.filter(
		(task) =>
			!(
				task.dev.toString() === req.user.id.toString() &&
				task.status != 'COMPLETE'
			)
	);

	await profile.save();
	await project.save();
	res.status(200).json({
		success: true,
		data: profile,
	});
});
