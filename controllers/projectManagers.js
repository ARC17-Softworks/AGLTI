const ErrorResponse = require('../utils/errorResponse');
const mongoose = require('mongoose');
const asyncHandler = require('../middleware/async');
const Profile = require('../models/Profile');
const Project = require('../models/Project');
const Position = require('../models/Position');

// @desc	create project
// @route	POST /api/v1/projects
// @access	Private
exports.createProject = asyncHandler(async (req, res, next) => {
	const profile = await Profile.findOne({ user: req.user.id });
	if (profile.activeProject) {
		return next(
			new ErrorResponse('cannot create project while in a project', 400)
		);
	}

	const { title, description } = req.body;

	const project = await Project.create({
		owner: req.user.id,
		title,
		description,
	});

	profile.projects.unshift({ proj: project.id, title: 'Project Manager' });
	profile.activeProject = project.id;
	await profile.save();

	res.status(201).json({
		success: true,
		data: project,
	});
});

// @desc	add position
// @route	POST /api/v1/projects/position
// @access	Private
exports.addPosition = asyncHandler(async (req, res, next) => {
	const { title, skills, description } = req.body;
	const project = await Project.findById(req.project);

	if (project.openings.length + project.members.length > 9) {
		return next(
			new ErrorResponse(
				'developer limit reached cannot create any more positions',
				400
			)
		);
	}
	position = await Position.create({
		project: project.id,
		skills,
		title,
		description,
	});

	project.openings.push({ position: position.id });
	await project.save();
	res.status(201).json({
		success: true,
		data: position,
	});
});

// @desc	remove position
// @route	DELETE /api/v1/projects/position/:positionId
// @access	Private
exports.removePosition = async (req, res, next) => {
	const session = await mongoose.startSession();
	session.startTransaction();
	try {
		const project = await Project.findById(req.project).session(session);
		const position = await Position.findById(req.params.positionId).session(
			session
		);

		if (!position) {
			throw new Error('position doesnt exist');
		}

		if (position.project.toString() != req.project.toString()) {
			throw new Error('position not part of project');
		}

		if (
			!project.openings.some(
				(opening) =>
					opening.position.toString() === req.params.positionId.toString()
			)
		) {
			throw new Error('position not part of project');
		}

		// check if position has any more applicants then do the following:

		// (1)for each applicant of same position find profile and delete applied ref
		for (const app of project.applicants) {
			if (app.position.toString() === position.id.toString()) {
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
			(application) => application.position.toString() != position.id.toString()
		);

		// (3)for each offer with same position find profile and delete offer
		for (const offer of project.offered) {
			if (offer.position.toString() === position.id.toString()) {
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
			(offer) => offer.position.toString() != position.id.toString()
		);

		project.openings = project.openings.filter(
			(opening) => opening.position.toString() != position.id.toString()
		);

		await project.save();
		// throw new Error('transaction check');

		// delete position
		await Position.findByIdAndDelete(req.params.positionId).session(session);
		await session.commitTransaction();
		res.status(200).json({
			success: true,
			data: project,
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

// @desc	assign new task to developer
// @route	POST /api/v1/projects/tasks/assign/:userId
// @access	Private
exports.assignTask = asyncHandler(async (req, res, next) => {
	const project = await Project.findById(req.project);
	if (
		!project.members.some(
			(member) => member.dev.toString() === req.params.userId.toString()
		)
	) {
		return next(new ErrorResponse('user not member of project', 400));
	}

	const { title, description } = req.body;

	project.tasks.push({ dev: req.params.userId, title, description });
	await project.save();
	res.status(201).json({
		success: true,
		data: project,
	});
});

// @desc	return task with note
// @route	PUT /api/v1/projects/tasks/:taskId/return
// @access	Private
exports.returnTask = asyncHandler(async (req, res, next) => {
	const project = await Project.findById(req.project);
	const task = project.tasks.id(req.params.taskId);

	if (!task) {
		return next(new ErrorResponse('task not found', 404));
	}
	if (task.status != 'DONE') {
		return next(new ErrorResponse('task not done can not return', 400));
	}

	const taskIndex = project.tasks.findIndex((t) => t === task);

	const { note } = req.body;

	if (!note) {
		return next(new ErrorResponse('to send back task note is required', 400));
	}

	project.tasks[taskIndex].status = 'DOING';
	project.tasks[taskIndex].note = note;
	project.tasks[taskIndex].read = false;
	await project.save();
	res.status(200).json({
		success: true,
		data: project,
	});
});

// @desc	close task
// @route	PUT /api/v1/projects/tasks/:taskId/close
// @access	Private
exports.closeTask = asyncHandler(async (req, res, next) => {
	const project = await Project.findById(req.project);
	const task = project.tasks.id(req.params.taskId);

	if (!task) {
		return next(new ErrorResponse('task not found', 404));
	}
	if (task.status != 'DONE') {
		return next(new ErrorResponse('task not done can not close', 400));
	}

	const taskIndex = project.tasks.findIndex((t) => t === task);

	project.tasks[taskIndex].status = 'COMPLETE';
	await project.save();
	res.status(200).json({
		success: true,
		data: project,
	});
});

// @desc	remove developer
// @route	DELETE /api/v1/projects/members/:positionId
// @access	Private

// @desc	close project
// @route	DELETE /api/v1/projects/close
// @access	Private
exports.closeProject = async (req, res, next) => {
	// position handling
	// go to all applicants profiles remove position from applied list
	// go to all offered profiles remove position from offers list
	// delete each position
	// clear openings array
	//
	// members handling
	// go to each member profile set activeProject as undefined
	// if member dont have any completed task remove them from member list
	//
	// delete everything else
	// go to owner profile
	//
	// set active project as undefined
	// set project as closed
};
