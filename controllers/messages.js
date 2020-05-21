const ErrorResponse = require('../utils/errorResponse');
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

	if (req.params.userId.toString() === req.user.id.toString()) {
		return next(new ErrorResponse('connot send message to self', 400));
	}

	if (
		profile.blocked.some(
			(user) => user.user.toString() === req.params.userId.toString()
		)
	) {
		return next(new ErrorResponse('user in blocked list', 400));
	}

	if (
		reciever.blocked.some(
			(user) => user.user.toString() === req.user.id.toString()
		)
	) {
		return next(new ErrorResponse('you have ben blocked', 400));
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
		await messageThread.save();
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

// @desc	delete message
// @route	DELETE /api/v1/messages/thread/:threadId/message/:messageId
// @access	Private
exports.deleteMessage = asyncHandler(async (req, res, next) => {
	const messageThread = await MessageThread.findById(req.params.threadId);

	// thread does not exist
	if (!messageThread) {
		return next(
			new ErrorResponse(
				`Resource not found with id of ${req.params.threadId}`,
				404
			)
		);
	}

	// user not part of thread
	if (
		!messageThread.users.some(
			(user) => user.toString() === req.user.id.toString()
		)
	) {
		return next(
			new ErrorResponse('Not authorised to access this resource', 401)
		);
	}

	const message = messageThread.messages.find(
		(message) => message.id.toString() === req.params.messageId.toString()
	);

	// message exist in thread
	if (!message) {
		return next(
			new ErrorResponse(
				`Resource not found with id of ${req.params.messageId}`,
				404
			)
		);
	}

	// message belongs to user
	if (message.from.toString() != req.user.id.toString()) {
		return next(
			new ErrorResponse('Not authorised to access this resource', 401)
		);
	}

	messageThread.messages = messageThread.messages.filter(
		(message) => message.id.toString() != req.params.messageId.toString()
	);

	await messageThread.save();
	res.status(200).json({
		success: true,
		data: messageThread,
	});
});

// @desc	get message thread
// @route	GET /api/v1/messages/:threadId
// @access	Private
exports.getThread = asyncHandler(async (req, res, next) => {
	const messageThread = await MessageThread.findById(req.params.threadId)
		.populate('users', 'name avatar')
		.populate('messages.from', 'name avatar');

	// thread does not exist
	if (!messageThread) {
		return next(
			new ErrorResponse(
				`Resource not found with id of ${req.params.threadId}`,
				404
			)
		);
	}

	// user not part of thread
	if (
		!messageThread.users.some(
			(user) => user.id.toString() === req.user.id.toString()
		)
	) {
		return next(
			new ErrorResponse('Not authorised to access this resource', 401)
		);
	}

	res.status(200).json({
		success: true,
		data: messageThread,
	});
});
