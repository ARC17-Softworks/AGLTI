const ErrorResponse = require('../utils/errorResponse');
const mongoose = require('mongoose');
const asyncHandler = require('../middleware/async');
const Profile = require('../models/Profile');
const MessageThread = require('../models/MessageThread');

// @desc	send request to user by id
// @route	POST /api/v1/messages/to/:userId
// @access	Private
exports.sendMessage = asyncHandler(async (req, res, next) => {
	const profile = await Profile.findOne({ user: req.user.id });
	const reciever = await Profile.findOne({ user: req.params.userId });
	let messageThread;

	if (!reciever) {
		return next(
			new ErrorResponse(
				`Resource not found with id of ${req.params.userId}`,
				404
			)
		);
	}

	const thread = profile.messages.find(
		(thread) => thread.with.toString() === req.params.userId.toString()
	);
	if (thread) {
		messageThread = await MessageThread.findById(thread.thread);
		messageThread.messages.push({ text: req.body.text, from: req.user.id });
		for (const message of reciever.messages) {
			if (message.thread.toString() === messageThread.id.toString()) {
				message.read = false;
				break;
			}
		}
		await reciever.save();
	} else {
		messageThread = await MessageThread.create({
			users: [req.user.id, req.params.userId],
			messages: [{ text: req.body.text, from: req.user.id }],
		});
		profile.messages.push({
			thread: messageThread.id,
			with: req.params.userId,
			read: true,
		});
		reciever.messages.push({
			thread: messageThread.id,
			with: req.user.id,
		});
		await profile.save();
		await reciever.save();
	}

	res.status(200).json({
		success: true,
		data: messageThread,
	});
});
