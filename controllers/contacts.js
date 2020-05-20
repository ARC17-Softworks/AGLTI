const ErrorResponse = require('../utils/errorResponse');
const mongoose = require('mongoose');
const asyncHandler = require('../middleware/async');
const Profile = require('../models/Profile');
const User = require('../models/User');

// @desc	send request to user by id
// @route	PUT /api/v1/contacts/invite/:userId
// @access	Private
exports.sendRequestId = asyncHandler(async (req, res, next) => {
	const profile = await Profile.findOne({ user: req.user.id });
	const reciever = await Profile.findOne({ user: req.params.userId });
	if (!reciever) {
		return next(
			new ErrorResponse(
				`Resource not found with id of ${req.params.userId}`,
				404
			)
		);
	}

	if (
		profile.outgoingRequests.some(
			(request) => request.user.toString() === req.params.userId.toString()
		)
	) {
		return next(new ErrorResponse('request already sent', 400));
	}
	if (
		profile.incomingRequests.some(
			(request) => request.user.toString() === req.params.userId.toString()
		)
	) {
		return next(new ErrorResponse('user had already sent you a request', 400));
	}

	profile.outgoingRequests.push({ user: req.params.userId });
	reciever.incomingRequests.push({ user: req.user.id });

	await profile.save();
	await reciever.save();
	res.status(200).json({
		success: true,
		data: profile,
	});
});

// @desc	send request to user by email
// @route	PUT /api/v1/contacts/invite/
// @access	Private
exports.sendRequestEmail = asyncHandler(async (req, res, next) => {
	const profile = await Profile.findOne({ user: req.user.id });

	if (!/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/.test(req.body.email)) {
		return next(new ErrorResponse('invalid email', 400));
	}

	if (req.user.email === req.body.email) {
		return next(new ErrorResponse('can not send request to self', 400));
	}

	const recieverUser = await User.findOne({ email: req.body.email });
	if (!recieverUser) {
		return next(
			new ErrorResponse(`User not found with email of ${req.body.email}`, 404)
		);
	}
	const reciever = await Profile.findOne({ user: recieverUser.id });
	if (!reciever) {
		return next(
			new ErrorResponse(`Resource not found with id of ${recieverUser.id}`, 404)
		);
	}

	if (
		profile.outgoingRequests.some(
			(request) => request.user.toString() === recieverUser.id.toString()
		)
	) {
		return next(new ErrorResponse('request already sent', 400));
	}
	if (
		profile.incomingRequests.some(
			(request) => request.user.toString() === recieverUser.id.toString()
		)
	) {
		return next(new ErrorResponse('user had already sent you a request', 400));
	}

	profile.outgoingRequests.push({ user: recieverUser.id });
	reciever.incomingRequests.push({ user: req.user.id });

	await profile.save();
	await reciever.save();
	res.status(200).json({
		success: true,
		data: profile,
	});
});
