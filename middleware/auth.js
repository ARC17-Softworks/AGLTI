const jwt = require('jsonwebtoken');
const asyncHandler = require('./async');
const ErrorResponse = require('../utils/errorResponse');
const User = require('../models/User');
const Profile = require('../models/Profile');
const Project = require('../models/Project');

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
	return asyncHandler(async (req, res, next) => {
		if (role === 'MEMBER') {
			const profile = await Profile.findOne({ user: req.user.id });
			if (!profile.activeProject) {
				return next(
					new ErrorResponse('Not authorised to access this resource', 403)
				);
			}

			const project = await Project.findById(profile.activeProject);

			if (
				project.members.filter((member) => {
					if (member.dev) {
						if (member.dev.toString() === req.user.id.toString())
							return member.dev;
					}
				}).length === 0
			) {
				return next(
					new ErrorResponse('Not authorised to access this resource', 403)
				);
			}

			req.project = project.id;
			next();
		} else if (role === 'OWNER') {
			const profile = await Profile.findOne({ user: req.user.id });
			if (!profile.activeProject) {
				return next(
					new ErrorResponse('Not authorised to access this resource', 403)
				);
			}

			const project = await Project.findById(profile.activeProject);
			if (!(project.owner.toString() === req.user.id.toString())) {
				return next(
					new ErrorResponse('Not authorised to access this resource', 403)
				);
			}

			req.project = project.id;
			next();
		} else if (role === 'BOTH') {
			const profile = await Profile.findOne({ user: req.user.id });
			if (!profile.activeProject) {
				return next(
					new ErrorResponse('Not authorised to access this resource', 403)
				);
			}

			const project = await Project.findById(profile.activeProject);
			if (
				!(project.owner === req.user.id) &&
				project.members.filter((member) => {
					if (member.dev) {
						if (member.dev.toString() === req.user.id.toString())
							return member.dev;
					}
				}).length === 0
			) {
				return next(
					new ErrorResponse('Not authorised to access this resource', 403)
				);
			}

			req.project = project.id;
			next();
		} else {
			return next(new ErrorResponse('invalid role', 500));
		}
	});
	next();
};
