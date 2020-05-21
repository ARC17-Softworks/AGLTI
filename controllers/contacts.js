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
		profile.contacts.some(
			(contact) => contact.contact.toString() === req.params.userId.toString()
		)
	) {
		return next(new ErrorResponse('user already in contacts', 400));
	}

	if (
		profile.blocked.some(
			(user) => user.user.toString() === req.params.userId.toString()
		)
	) {
		return next(new ErrorResponse('user is blocked', 400));
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
		profile.contacts.some(
			(contact) => contact.contact.toString() === recieverUser.id.toString()
		)
	) {
		return next(new ErrorResponse('user already in contacts', 400));
	}

	if (
		profile.blocked.some(
			(user) => user.user.toString() === recieverUser.id.toString()
		)
	) {
		return next(new ErrorResponse('user is blocked', 400));
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

// @desc	cancel outgoing request
// @route	DELETE /api/v1/contacts/cancel/:userId
// @access	Private
exports.cancelRequest = asyncHandler(async (req, res, next) => {
	const profile = await Profile.findOne({ user: req.user.id });
	const reciever = await Profile.findOne({ user: req.params.userId });

	if (
		!profile.outgoingRequests.some(
			(request) => request.user.toString() === req.params.userId.toString()
		)
	) {
		return next(new ErrorResponse('requst not found', 404));
	}

	profile.outgoingRequests = profile.outgoingRequests.filter(
		(request) => request.user.toString() != req.params.userId.toString()
	);
	reciever.incomingRequests = reciever.incomingRequests.filter(
		(request) => request.user.toString() != req.user.id.toString()
	);

	await profile.save();
	await reciever.save();
	res.status(200).json({
		success: true,
		data: profile,
	});
});

// @desc	reject incoming request
// @route	DELETE /api/v1/contacts/reject/:userId
// @access	Private
exports.rejectRequest = asyncHandler(async (req, res, next) => {
	const profile = await Profile.findOne({ user: req.user.id });
	const sender = await Profile.findOne({ user: req.params.userId });

	if (
		!profile.incomingRequests.some(
			(request) => request.user.toString() === req.params.userId.toString()
		)
	) {
		return next(new ErrorResponse('requst not found', 404));
	}

	profile.incomingRequests = profile.incomingRequests.filter(
		(request) => request.user.toString() != req.params.userId.toString()
	);
	sender.outgoingRequests = sender.outgoingRequests.filter(
		(request) => request.user.toString() != req.user.id.toString()
	);

	await profile.save();
	await sender.save();
	res.status(200).json({
		success: true,
		data: profile,
	});
});

// @desc	accept incoming request
// @route	PUT /api/v1/contacts/accept/:userId
// @access	Private
exports.acceptRequest = asyncHandler(async (req, res, next) => {
	const profile = await Profile.findOne({ user: req.user.id });
	const sender = await Profile.findOne({ user: req.params.userId });

	if (
		!profile.incomingRequests.some(
			(request) => request.user.toString() === req.params.userId.toString()
		)
	) {
		return next(new ErrorResponse('requst not found', 404));
	}

	profile.incomingRequests = profile.incomingRequests.filter(
		(request) => request.user.toString() != req.params.userId.toString()
	);
	sender.outgoingRequests = sender.outgoingRequests.filter(
		(request) => request.user.toString() != req.user.id.toString()
	);

	profile.contacts.push({ contact: req.params.userId });
	sender.contacts.push({ contact: req.user.id });

	await profile.save();
	await sender.save();
	res.status(200).json({
		success: true,
		data: profile,
	});
});

// @desc	remove contact
// @route	DELETE /api/v1/contacts/remove/:userId
// @access	Private
exports.removeContact = asyncHandler(async (req, res, next) => {
	const profile = await Profile.findOne({ user: req.user.id });
	const contactProfile = await Profile.findOne({ user: req.params.userId });

	if (
		!profile.contacts.some(
			(contact) => contact.contact.toString() === req.params.userId.toString()
		)
	) {
		return next(new ErrorResponse('contact not found', 404));
	}

	profile.contacts = profile.contacts.filter(
		(contact) => contact.contact.toString() != req.params.userId.toString()
	);
	contactProfile.contacts = contactProfile.contacts.filter(
		(contact) => contact.contact.toString() != req.user.id.toString()
	);

	await profile.save();
	await contactProfile.save();
	res.status(200).json({
		success: true,
		data: profile,
	});
});

// @desc	block user
// @route	DELETE /api/v1/contacts/block/:userId
// @access	Private
exports.blockUser = asyncHandler(async (req, res, next) => {
	const profile = await Profile.findOne({ user: req.user.id });
	const blockuser = await Profile.findOne({ user: req.params.userId });

	if (!blockuser) {
		return next(
			new ErrorResponse(
				`Resource not found with id of ${req.params.userId}`,
				404
			)
		);
	}

	if (
		profile.blocked.some(
			(user) => user.user.toString() === req.params.userId.toString()
		)
	) {
		return next(new ErrorResponse('user already blocked', 400));
	}

	if (
		profile.contacts.some(
			(contact) => contact.contact.toString() === req.params.userId.toString()
		)
	) {
		profile.contacts = profile.contacts.filter(
			(contact) => contact.contact.toString() != req.params.userId.toString()
		);
		blockuser.contacts = blockuser.contacts.filter(
			(contact) => contact.contact.toString() != req.user.id.toString()
		);

		await blockuser.save();
	}

	profile.blocked.push({ user: req.params.userId });

	await profile.save();
	res.status(200).json({
		success: true,
		data: profile,
	});
});

// @desc	unblock user
// @route	PUT /api/v1/contacts/block/:userId
// @access	Private
exports.unblockUser = asyncHandler(async (req, res, next) => {
	const profile = await Profile.findOne({ user: req.user.id });
	const blockuser = await Profile.findOne({ user: req.params.userId });

	if (!blockuser) {
		return next(
			new ErrorResponse(
				`Resource not found with id of ${req.params.userId}`,
				404
			)
		);
	}

	if (
		!profile.blocked.some(
			(user) => user.user.toString() === req.params.userId.toString()
		)
	) {
		console.log(profile.blocked);
		return next(new ErrorResponse('user not in blocked list', 400));
	}

	profile.blocked = profile.blocked.filter(
		(block) => block.user.toString() != req.params.userId.toString()
	);

	await profile.save();
	res.status(200).json({
		success: true,
		data: profile,
	});
});
