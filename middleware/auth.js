const jwt = require('jsonwebtoken');
const asyncHandler = require('./async');
const ErrorResponse = require('../utils/errorResponse');
const User = require('../models/User');

// protect routes
exports.protect = asyncHandler(async (req, res, next) => {
	let token;

	// set token from bearer token in header
	if (
		req.headers.authorization &&
		req.headers.authorization.startsWith('Bearer')
	) {
		token = req.headers.authorization.split(' ')[1];
	}
	// set token from cookie
	else if (req.cookies.token) {
		token = req.cookies.token;
	}

	// make sure token exists
	if (!token) {
		return next(
			new ErrorResponse('Not authorised to access this resource', 401)
		);
	}

	try {
		// verify token
		const decoded = jwt.verify(token, process.env.JWT_SECRET);

		req.user = await User.findById(decoded.id);
		next();
	} catch (err) {
		console.log(err);
		return next(
			new ErrorResponse('Not authorised to access this resource', 401)
		);
	}
});

// grant access to specific roles
exports.authorize = (role) => {
	async (req, res, next) => {};
};
