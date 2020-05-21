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
