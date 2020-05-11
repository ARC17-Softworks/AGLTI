const ErrorResponse = require('../utils/errorResponse');
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
