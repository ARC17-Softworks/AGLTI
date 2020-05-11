const ErrorResponse = require('../utils/errorResponse');
const asyncHandler = require('../middleware/async');
const Profile = require('../models/Profile');
const Project = require('../models/Project');
const Position = require('../models/Position');

// @desc	offer user project position
// @route	PUT /api/v1/position/offer/:positionId/:userId
// @access	Private
exports.offer = asyncHandler(async (req, res, next) => {
	const project = await Project.findById(req.project);
	const profile = await Profile.findOne({ user: req.params.userId });

	// check if user already part of a project
	if (profile.activeProject) {
		return next(
			new ErrorResponse(
				'cannot offer position user already part of a project',
				400
			)
		);
	}

	const position = await Position.findById(req.params.positionId);

	// check if position exists
	if (!position) {
		return next(
			new ErrorResponse(
				`Resource not found with id of ${req.params.positionId}`,
				404
			)
		);
	}

	// check if position belongs to project
	if (
		!project.openings.some(
			(opening) => opening.position.toString() === position.id.toString()
		)
	) {
		return next(new ErrorResponse('position not part of project', 404));
	}

	// check if user has required skills
	if (!position.skills.every((skill) => profile.skills.includes(skill))) {
		return next(new ErrorResponse('user does not have requred skills', 400));
	}

	// check if already applied for this position
	if (
		project.applicants.some(
			(applicant) =>
				applicant.dev.toString() === req.params.userId.toString() &&
				applicant.position.toString() === position.id.toString()
		)
	) {
		return next(
			new ErrorResponse('user already applied for this position', 400)
		);
	}

	// check if already offered this position
	if (
		project.offered.some(
			(offer) =>
				offer.dev.toString() === req.params.userId.toString() &&
				offer.position.toString() === position.id.toString()
		)
	) {
		return next(new ErrorResponse('user already offered this position', 400));
	}

	profile.offers.push({ position: position.id });
	project.offered.push({ dev: req.params.userId, position: position.id });
	await profile.save();
	await project.save();

	res.status(201).json({
		success: true,
		data: project,
	});
});

// @desc	cancel position offer
// @route	DELETE /api/v1/position/offer/:positionId/:userId/cancel
// @access	Private
exports.cancelOffer = asyncHandler(async (req, res, next) => {
	const project = await Project.findById(req.project);
	const profile = await Profile.findOne({ user: req.params.userId });
	if (
		!project.offered.some(
			(offer) =>
				offer.position.toString() === req.params.positionId.toString() &&
				offer.dev.toString() === req.params.userId.toString()
		)
	) {
		return next(new ErrorResponse('offer not found', 404));
	}

	const position = await Position.findById(req.params.positionId);

	// check if position exists
	if (!position) {
		return next(
			new ErrorResponse(
				`Resource not found with id of ${req.params.positionId}`,
				404
			)
		);
	}

	// check if position belongs to project
	if (
		!project.openings.some(
			(opening) => opening.position.toString() === position.id.toString()
		)
	) {
		return next(new ErrorResponse('position not part of project', 404));
	}

	profile.offers = profile.offers.filter(
		(offer) => offer.position.toString() != req.params.positionId.toString()
	);
	project.offered = project.offered.filter(
		(offer) =>
			offer.position.toString() != req.params.positionId.toString() ||
			offer.dev.toString() != req.params.userId.toString()
	);

	await profile.save();
	await project.save();
	res.status(201).json({
		success: true,
		data: project,
	});
});

// @desc	accept position application
// @route	PUT /api/v1/position/offers/:positionId/:userId/accept
// @access	Private
exports.acceptApplication = async (req, res, next) => {};

// @desc	reject position application
// @route	DELETE /api/v1/position/offers/:positionId/:userId/reject
// @access	Private
exports.rejectApplication = asyncHandler(async (req, res, next) => {});
