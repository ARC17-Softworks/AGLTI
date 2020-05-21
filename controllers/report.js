const sendEmail = require('../utils/sendEmail');
const ErrorResponse = require('../utils/errorResponse');
const asyncHandler = require('../middleware/async');
const Profile = require('../models/Profile');
const Project = require('../models/Project');

// @desc	report profile
// @route	POST /api/v1/report/user/:userId
// @access	Public
exports.reportUser = asyncHandler(async (req, res, next) => {
	const reported = await Profile.findOne({ user: req.params.userId });
	if (!reported) {
		return next(
			new ErrorResponse(
				`Resource not found with id of ${req.params.userId}`,
				404
			)
		);
	}

	if (req.params.userId.toString() === req.user.id.toString()) {
		return next(new ErrorResponse('can not report self', 400));
	}

	if (!req.body.reason) {
		return next(new ErrorResponse('reason required to report', 400));
	}
	try {
		await sendEmail({
			email: process.env.REPORT_EMAIL,
			cc: [process.env.REPORT_CC_ONE, process.env.REPORT_CC_TWO],
			subject: 'User Report',
			title: 'User Reported',
			body: `reporter: ${req.user.id}<br>
				reported: ${req.params.userId}<br>
				reason: ${req.body.reason}`,
			link: '#',
			linkName: '',
		});

		res.status(200).json({
			success: true,
			data: 'Report sent',
		});
	} catch (err) {
		console.log(err);
		return next(new ErrorResponse('Report could not be sent', 500));
	}
});

// @desc	report project
// @route	POST /api/v1/report/project/:projectId
// @access	Public
exports.reportProject = asyncHandler(async (req, res, next) => {
	const reported = await Project.findById(req.params.projectId);
	if (!reported) {
		return next(
			new ErrorResponse(
				`Resource not found with id of ${req.params.projectId}`,
				404
			)
		);
	}

	if (reported.owner.toString() === req.user.id.toString()) {
		return next(new ErrorResponse('can not report own project', 400));
	}

	if (!req.body.reason) {
		return next(new ErrorResponse('reason required to report', 400));
	}
	try {
		await sendEmail({
			email: process.env.REPORT_EMAIL,
			cc: [process.env.REPORT_CC_ONE, process.env.REPORT_CC_TWO],
			subject: 'Project Report',
			title: 'Project Reported',
			body: `reporter: ${req.user.id}<br>
				reported: ${req.params.projectId}<br>
				reason: ${req.body.reason}`,
			link: '#',
			linkName: '',
		});

		res.status(200).json({
			success: true,
			data: 'Report sent',
		});
	} catch (err) {
		console.log(err);
		return next(new ErrorResponse('Report could not be sent', 500));
	}
});
