const crypto = require('crypto');
const ErrorResponse = require('../utils/errorResponse');
const sendEmail = require('../utils/sendEmail');
const asyncHandler = require('../middleware/async');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Profile = require('../models/Profile');

// @desc	Start user registration by sending registration link to registration email
// @route	POST /api/v1/auth/register
// @access	Public
exports.register = asyncHandler(async (req, res, next) => {
	const { email, password, name } = req.body;

	if (!email || !password || !name) {
		return next(new ErrorResponse('missing feilds', 400));
	}

	if (!/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/.test(email)) {
		return next(new ErrorResponse('invalid email', 400));
	}

	if (password.length < 6) {
		return next(new ErrorResponse('insufficient password length', 400));
	}

	const user = await User.findOne({ email });
	if (user) {
		return next(new ErrorResponse('user with this email already exists', 400));
	}

	const registrationToken = jwt.sign(
		{ name, email, password },
		process.env.JWT_SECRET,
		{
			expiresIn: '1h',
		}
	);
	const registrationUrl = `${req.protocol}://${req.get(
		'host'
	)}/api/v1/auth/register/${registrationToken}`;

	try {
		await sendEmail({
			email: email,
			subject: 'Welcome to AGLTI | complete account registration',
			title: `Welcome to AGLTI, ${name.split(' ')[0]}!`,
			body:
				'to complete your registration please follow this link (link expires in 1 hour).',
			link: registrationUrl,
			linkName: 'Complete Registration',
		});

		res.status(200).json({
			success: true,
			data: 'Email sent',
		});
	} catch (err) {
		console.log(err);
		return next(new ErrorResponse('email could not be sent', 500));
	}
});

// @desc	complete registration by authenticating email
// @route	POST /api/v1/auth/register/:token
// @access	Public
exports.authenticateEmail = asyncHandler(async (req, res, next) => {
	const decoded = jwt.verify(req.params.token, process.env.JWT_SECRET);
	const { name, email, password } = decoded;

	let user = await User.findOne({ email });
	if (user) {
		return next(new ErrorResponse('user with this email already exists', 400));
	}

	user = await User.create({
		name,
		email,
		password,
	});

	sendTokenResponse(user, 201, res);
});

// @desc	login
// @route	POST /api/v1/auth/login
// @access	Public
exports.login = asyncHandler(async (req, res, next) => {
	const { email, password } = req.body;

	// validate email & password
	if (!email || !password) {
		return next(new ErrorResponse('Please provide an email and password', 400));
	}

	// check for user
	const user = await User.findOne({ email }).select('+password');

	if (!user) {
		return next(new ErrorResponse('invalid credentials', 401));
	}

	// check if password matches
	const isMatch = await user.matchPassword(password);

	if (!isMatch) {
		return next(new ErrorResponse('invalid credentials', 401));
	}

	sendTokenResponse(user, 200, res);
});

// @desc	logout / clear cookie
// @route	GET /api/v1/auth/logout
// @access	Private
exports.logout = asyncHandler(async (req, res, next) => {
	res.cookie('token', 'none', {
		expires: new Date(Date.now() + 10 * 1000),
		httpOnly: true,
	});

	res.status(200).json({
		success: true,
		data: {},
	});
});

// @desc	Update password
// @route	PUT /api/v1/auth/updatepassword
// @access	Private
exports.updatePassword = asyncHandler(async (req, res, next) => {
	const user = await User.findById(req.user.id).select('+password');

	// check current password
	if (!(await user.matchPassword(req.body.currentPassword))) {
		return next(new ErrorResponse('incorrect password', 401));
	}

	user.password = req.body.newPassword;
	await user.save();

	sendTokenResponse(user, 200, res);
});

// @desc	Forgot password
// @route	Post /api/v1/auth/forgotpassword
// @access	Public
exports.forgotPassword = asyncHandler(async (req, res, next) => {
	const user = await User.findOne({ email: req.body.email });

	if (!user) {
		return next(new ErrorResponse('no user with this email', 404));
	}

	// get reset token
	const resetToken = user.getResetPasswordToken();

	await user.save({ validateBeforeSave: false });

	// create reset url
	const resetUrl = `${req.protocol}://${req.get(
		'host'
	)}/api/v1/auth/resetpassword/${resetToken}`;

	try {
		await sendEmail({
			email: user.email,
			subject: 'AGLTI | reset password',
			title: 'Reset you account password',
			body:
				'You are recieving this email because you (or someone else) has requested the reset of your AGLTI account password. (link expire in 10 minutes)',
			link: resetUrl,
			linkName: 'Reset Password',
		});

		res.status(200).json({
			success: true,
			data: 'Email sent',
		});
	} catch (err) {
		console.log(err);
		user.resetPasswordToken = undefined;
		user.resetPasswordExpire = undefined;

		await user.save({ validateBeforeSave: false });
		return next(new ErrorResponse('email could not be sent', 500));
	}
});

// @desc	reset password
// @route	PUT /api/v1/auth/resetpassword/:resettoken
// @access	Public
exports.resetPassword = asyncHandler(async (req, res, next) => {
	// get hashed token
	const resetPasswordToken = crypto
		.createHash('sha256')
		.update(req.params.resettoken)
		.digest('hex');
	const user = await User.findOne({
		resetPasswordToken,
		resetPasswordExpire: { $gt: Date.now() },
	});

	if (!user) {
		return next(new ErrorResponse('invalid token', 400));
	}

	// set new password
	user.password = req.body.password;

	user.resetPasswordToken = undefined;
	user.resetPasswordExpire = undefined;

	await user.save();

	sendTokenResponse(user, 200, res);
});

// @desc	delete account
// @route	DELETE /api/v1/auth/deleteaccount
// @access	Public
exports.deleteAccount = asyncHandler(async (req, res, next) => {
	const profile = await Profile.findOne({ user: req.user.id });
	if (!profile) {
		return next(new ErrorResponse('Resource not found', 404));
	}

	if (profile.activeProject) {
		return next(
			new ErrorResponse(
				'can not delete account while user in project, please leave project and try again',
				400
			)
		);
	}

	profile.remove();

	await User.findByIdAndUpdate(req.user.id, {
		name: '[deleted]',
		$unset: { email: undefined, password: undefined },
	});

	// delete token
	res.cookie('token', 'none', {
		expires: new Date(Date.now() + 10 * 1000),
		httpOnly: true,
	});

	res.status(200).json({
		success: true,
		data: {},
	});
});

// Get token from model & create cookie and send response
const sendTokenResponse = (user, statusCode, res) => {
	// create token
	const token = user.getSignedJwtToken();

	const options = {
		expires: new Date(
			Date.now() + process.env.JWT_COOKIE_EXPIRE * 24 * 60 * 60 * 1000
		),
		httpOnly: true,
	};

	if (process.env.NODE_ENV === 'production') {
		options.secure = true;
	}

	res.status(statusCode).cookie('token', token, options).json({
		success: true,
		token,
	});
};
