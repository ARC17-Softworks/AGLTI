const ErrorResponse = require('../utils/errorResponse');
const mongoose = require('mongoose');
const asyncHandler = require('../middleware/async');
const Profile = require('../models/Profile');
const Project = require('../models/Project');
const Position = require('../models/Position');

// @desc	get current project
// @route	GET /api/v1/projects
// @access	Private
exports.currentProject = asyncHandler(async (req, res, next) => {
	let project = await Project.findById(req.project);
	if (project.owner.toString() === req.user.id.toString()) {
		project = await Project.findById(req.project)
			.select('-posts')
			.populate('owner', 'name avatar')
			.populate('members.dev', 'name avatar')
			.populate('previousMembers.dev', 'name avatar')
			.populate('openings.position')
			.populate('applicants.dev', 'name avatar')
			.populate('applicants.position')
			.populate('offered.dev', 'name avatar')
			.populate('offered.position')
			.populate('tasks.dev', 'name avatar');
	} else {
		project = await Project.findById(req.project)
			.select('-posts -openings -applicants -offered')
			.populate('owner', 'name avatar')
			.populate('members.dev', 'name avatar')
			.populate('previousMembers.dev', 'name avatar')
			.populate('tasks.dev', 'name avatar');
	}

	res.status(200).json({
		success: true,
		data: project,
	});
});

// @desc	get project by id
// @route	GET /api/v1/projects/:projectId
// @access	Private
exports.currentProject = asyncHandler(async (req, res, next) => {
	const project = await Project.findById(req.params.projectId)
		.select('-posts -openings -applicants -offered -tasks')
		.populate('owner', 'name avatar')
		.populate('members.dev', 'name avatar')
		.populate('previousMembers.dev', 'name avatar');

	if (!project) {
		return next(
			new ErrorResponse(
				`Resource not found with id of ${req.params.projectId}`,
				404
			)
		);
	}
	res.status(200).json({
		success: true,
		data: project,
	});
});
