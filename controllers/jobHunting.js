const mongoose = require('mongoose');
const ErrorResponse = require('../utils/errorResponse');
const asyncHandler = require('../middleware/async');
const Profile = require('../models/Profile');
const Project = require('../models/Project');
const Position = require('../models/Position');

// @desc	apply to project position
// @route	PUT /api/v1/position/apply/:positionId
// @access	Private
exports.apply = asyncHandler(async (req, res, next) => {
	const profile = await Profile.findOne({ user: req.user.id });

	// check if user already part of a project
	if (profile.activeProject) {
		return next(
			new ErrorResponse(
				'cannot apply for position already part of a project',
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

	const project = await Project.findById(position.project);

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
				applicant.dev.toString() === req.user.id.toString() &&
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
				offer.dev.toString() === req.user.id.toString() &&
				offer.position.toString() === position.id.toString()
		)
	) {
		return next(new ErrorResponse('user already offered this position', 400));
	}

	profile.applied.push({ position: position.id });
	project.applicants.push({ dev: req.user.id, position: position.id });
	await profile.save();
	await project.save();

	res.status(200).json({
		success: true,
		data: profile,
	});
});

// @desc	cancel position application
// @route	DELETE /api/v1/position/apply/:positionId/cancel
// @access	Private
exports.cancelApplication = asyncHandler(async (req, res, next) => {
	const profile = await Profile.findOne({ user: req.user.id });
	if (
		!profile.applied.some(
			(application) =>
				application.position.toString() === req.params.positionId.toString()
		)
	) {
		return next(new ErrorResponse('application not found', 404));
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

	const project = await Project.findById(position.project);

	// check if position belongs to project
	if (
		!project.openings.some(
			(opening) => opening.position.toString() === position.id.toString()
		)
	) {
		return next(new ErrorResponse('position not part of project', 404));
	}

	profile.applied = profile.applied.filter(
		(application) =>
			application.position.toString() != req.params.positionId.toString()
	);
	project.applicants = project.applicants.filter(
		(applicant) =>
			applicant.position.toString() != req.params.positionId.toString() ||
			applicant.dev.toString() != req.user.id.toString()
	);

	await profile.save();
	await project.save();
	res.status(200).json({
		success: true,
		data: profile,
	});
});

// @desc	accept position offer
// @route	PUT /api/v1/position/offers/:positionId/accept
// @access	Private
exports.acceptOffer = async (req, res, next) => {};

// @desc	reject position offer
// @route	DELETE /api/v1/position/offers/:positionId/reject
// @access	Private
exports.rejectOffer = asyncHandler(async (req, res, next) => {});
