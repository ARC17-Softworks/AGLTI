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
exports.acceptOffer = async (req, res, next) => {
	const session = await mongoose.startSession();
	session.startTransaction();
	try {
		const profile = await Profile.findOne({ user: req.user.id }).session(
			session
		);
		const position = await Position.findById(req.params.positionId).session(
			session
		);
		const project = await Project.findById(position.project).session(session);

		// check if opening has been filled
		if (!position) {
			throw new Error('position unavalible');
		}

		if (position.project.toString() != project.id.toString()) {
			throw new Error('position unavalible');
		}

		if (
			!project.openings.some(
				(opening) =>
					opening.position.toString() === req.params.positionId.toString()
			)
		) {
			throw new Error('position unavalible');
		}

		// check if project manager deleted application
		const application = profile.offers.find(
			(application) =>
				application.position.toString() === req.params.positionId.toString()
		);

		if (!application) {
			throw new Error('offer missing');
		}

		const applicant = project.offered.find(
			(application) =>
				application.dev.toString() === req.user.id.toString() &&
				application.position.toString() === position.id.toString()
		);

		if (!applicant) {
			throw new Error('offer missing');
		}

		// check if user availible
		if (profile.activeProject) {
			throw new Error('user availible');
		}

		project.members.push({
			dev: req.user.id,
			title: position.title,
			skills: position.skills,
		});
		project.offered = project.offered.filter((offer) => offer != applicant);
		project.openings = project.openings.filter(
			(opening) => opening.position.toString() != position.id.toString()
		);

		// check if position has any more applicants then do the following:

		// (1)for each applicant of same position find profile and delete applied ref
		for (const app of project.applicants) {
			if (app.position.toString() === applicant.position.toString()) {
				const rejpro = await Profile.findOne({ user: app.dev }).session(
					session
				);
				rejpro.applied.splice(
					rejpro.applied.findIndex(
						(a) => a.position.toString() === req.params.positionId.toString()
					),
					1
				);
				await rejpro.save();
			}
		}

		// (2)filter out applicants with taken position or applications of hired applicant
		project.applicants = project.applicants.filter(
			(application) =>
				application.position.toString() != applicant.position.toString() &&
				application.dev.toString() != applicant.dev.toString()
		);

		// (3)for each offer with same position find profile and delete offer
		for (const offer of project.offered) {
			if (offer.position.toString() === applicant.position.toString()) {
				const rejpro = await Profile.findOne({ user: offer.dev }).session(
					session
				);
				rejpro.offers.splice(
					rejpro.offers.findIndex(
						(o) => o.position.toString() === req.params.positionId.toString()
					),
					1
				);
				await rejpro.save();
			}
		}

		// (4)filter out offer with taken position or offers to hired applicant
		project.offered = project.offered.filter(
			(offer) =>
				offer.position.toString() != applicant.position.toString() &&
				offer.dev.toString() != applicant.dev.toString()
		);

		// set active project of employee, delete offers and applications, add to project list
		profile.activeProject = project.id;
		const positionsRemove = profile.applied.concat(profile.offers);
		const projectsRemove = [];
		for (const x of positionsRemove) {
			const pos = await Position.findById(x.position).session(session);
			const pro = await Project.findById(pos.project).session(session);
			if (
				!projectsRemove.some(
					(y) => y.project.toString() === pro.id.toString()
				) &&
				pro.id.toString() != project.id.toString()
			) {
				projectsRemove.push({ project: pro.id });
			}
		}

		for (const proj of projectsRemove) {
			const rejproj = await Project.findById(proj.project).session(session);
			rejproj.applicants = rejproj.applicants.filter(
				(a) => a.dev.toString() != req.user.id.toString()
			);
			rejproj.offered = rejproj.offered.filter(
				(o) => o.dev.toString() != req.user.id.toString()
			);
			await rejproj.save();
		}

		profile.offers = [];
		profile.applied = [];

		profile.projects.unshift({
			proj: project.id,
			title: position.title,
			skills: position.skills,
		});

		await project.save();
		// throw new Error('transaction check');
		await profile.save();

		// delete position
		await Position.findByIdAndDelete(req.params.positionId).session(session);
		await session.commitTransaction();
		res.status(200).json({
			success: true,
			data: profile,
		});
	} catch (err) {
		await session.abortTransaction();
		console.error(err.message);
		console.log(err.stack.red);
		res.status(500).json({
			success: false,
			error: `Server Error ${err.message}`,
		});
	} finally {
		session.endSession();
	}
};

// @desc	reject position offer
// @route	DELETE /api/v1/position/offers/:positionId/reject
// @access	Private
exports.rejectOffer = asyncHandler(async (req, res, next) => {
	const position = await Position.findById(req.params.positionId);
	const profile = await Profile.findOne({ user: req.user.id });
	const project = await Project.findById(position.project);

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

	// check if project manager deleted offer
	const application = profile.offers.find(
		(application) =>
			application.position.toString() === req.params.positionId.toString()
	);

	if (!application) {
		return next(new ErrorResponse('offer missing', 404));
	}

	const applicant = project.offered.find(
		(application) =>
			application.dev.toString() === req.user.id.toString() &&
			application.position.toString() === position.id.toString()
	);

	if (!applicant) {
		return next(new ErrorResponse('offer missing', 404));
	}

	project.offered = project.offered.filter(
		(application) =>
			!(
				application.dev.toString() === req.user.id.toString() &&
				application.position.toString() === req.params.positionId.toString()
			)
	);

	profile.offers = profile.offers.filter(
		(application) =>
			application.position.toString() != req.params.positionId.toString()
	);

	await profile.save();
	await project.save();
	res.status(200).json({
		success: true,
		data: profile,
	});
});
