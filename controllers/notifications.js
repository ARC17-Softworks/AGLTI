const ErrorResponse = require('../utils/errorResponse');
const mongoose = require('mongoose');
const asyncHandler = require('../middleware/async');
const Profile = require('../models/Profile');
const Project = require('../models/Project');

// @desc	get notifications
// @route	GET /api/v1/notifications
// @access	Private
exports.getNotifications = asyncHandler(async (req, res, next) => {
	const profile = await Profile.findOne({ user: req.user.id });
	const notifications = {};
	const messages = profile.messages.filter((message) => message.read === false);
	if (messages.length > 0) {
		notifications.messages = messages.length;
	}

	const incomingRequests = profile.incomingRequests.filter(
		(request) => request.read === false
	);
	if (incomingRequests.length > 0) {
		notifications.incomingRequests = incomingRequests.length;
	}

	if (!profile.activeProject) {
		const offers = profile.offers.filter((offer) => offer.read === false);
		if (offers.length > 0) {
			notifications.offers = offers.length;
		}
	} else {
		const project = await Project.findById(profile.activeProject);
		const tasks = project.tasks.filter(
			(task) =>
				task.dev.toString() === req.user.id.toString() &&
				task.status === 'TODO' &&
				task.read === false
		);
		if (tasks.length > 0) {
			notifications.tasks = tasks.length;
		}

		const mentions = profile.mentions.filter(
			(mention) => mention.read === false
		);
		if (mentions.length > 0) {
			notifications.mentions = mentions.length;
		}
	}

	res.status(200).json({
		success: true,
		data: notifications,
	});
});

// @desc	mark notifications read
// @route	PUT /api/v1/notifications/clear/:path
// @access	Private
exports.markRead = asyncHandler(async (req, res, next) => {
	const profile = await Profile.findOne({ user: req.user.id });
	let project;
	if (profile.activeProject) {
		project = await Project.findById(profile.activeProject);
	}

	if (req.params.path === 'messages') {
		for (const message of profile.messages) {
			if (message.read === false) {
				message.read = true;
			}
		}

		await profile.save();
	} else if (req.params.path === 'requests') {
		for (const request of profile.incomingRequests) {
			if (request.read === false) {
				request.read = true;
			}
		}

		await profile.save();
	} else if (req.params.path === 'offers') {
		if (project) {
			return next(new ErrorResponse('bad request', 400));
		}

		for (const offer of profile.offers) {
			if (offer.read === false) {
				offer.read = true;
			}
		}

		await profile.save();
	} else if (req.params.path === 'tasks') {
		if (!project) {
			return next(new ErrorResponse('bad request', 400));
		}

		for (const task of project.tasks) {
			if (
				task.dev.toString() === req.user.id.toString() &&
				task.status === 'TODO' &&
				task.read === false
			) {
				task.read = true;
			}
		}

		await project.save();
	} else if (req.params.path === 'mentions') {
		if (!project) {
			return next(new ErrorResponse('bad request', 400));
		}

		for (const mention of profile.mentions) {
			if (mention.read === false) {
				mention.read = true;
			}
		}

		await profile.save();
	} else {
		return next(new ErrorResponse('bad request', 400));
	}

	res.status(200).json({
		success: true,
		data: profile,
	});
});
