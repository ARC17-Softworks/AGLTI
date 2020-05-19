const ErrorResponse = require('../utils/errorResponse');
const asyncHandler = require('../middleware/async');
const request = require('request');
const Profile = require('../models/Profile');
const User = require('../models/User');

// @desc	create user profile
// @route	POST /api/v1/profile
// @access	Private
exports.createProfile = asyncHandler(async (req, res, next) => {
	let profile = await Profile.findOne({ user: req.user.id });
	if (profile) {
		return next(new ErrorResponse('profile already exists', 400));
	}
	const {
		bio,
		location,
		skills,
		youtube,
		github,
		hackerRank,
		dribble,
		linkedin,
		behance,
		vimeo,
		website,
	} = req.body;

	const links = {
		youtube,
		github,
		hackerRank,
		dribble,
		linkedin,
		behance,
		vimeo,
		website,
	};

	profile = await Profile.create({
		user: req.user.id,
		bio,
		location,
		skills,
		links,
	});

	res.status(201).json({
		success: true,
		data: profile,
	});
});

// @desc	get current users profile
// @route	GET /api/v1/profile/me
// @access	Private
exports.getMe = asyncHandler(async (req, res, next) => {
	const profile = await Profile.findOne(
		{ user: req.user.id },
		{ projects: { $slice: 5 } }
	)
		.populate('user', 'name avatar')
		.populate('project.proj', 'title')
		.populate('activeProject', 'title')
		.populate({
			path: 'offers.position',
			populate: { path: 'project', select: 'title' },
		})
		.populate({
			path: 'applied.position',
			populate: { path: 'project', select: 'title' },
		})
		.populate('contacts.contact', 'name avatar')
		.populate('outgoingRequests.user', 'name avatar')
		.populate('incomingRequests.user', 'name avatar')
		.populate('blocked.user', 'name avatar')
		.populate('messages.with', 'name avatar');

	if (!profile) {
		return next(
			new ErrorResponse(`Resource not found with id of ${req.user.id}`, 404)
		);
	}

	res.status(200).json({
		success: true,
		data: profile,
	});
});

// @desc	get profile by id
// @route	GET /api/v1/profile/:userId
// @access	Private
exports.getProfile = asyncHandler(async (req, res, next) => {
	const profile = await Profile.findOne(
		{ user: req.params.userId },
		{ projects: { $slice: 5 } }
	)
		.select(
			'-offers -applied -outgoingRequests -incomingRequests -contacts -blocked -messages -mentions'
		)
		.populate('user', 'name avatar')
		.populate('project.proj', 'title')
		.populate('activeProject', 'title');

	if (!profile) {
		return next(
			new ErrorResponse(
				`Resource not found with id of ${req.params.userId}`,
				404
			)
		);
	}

	res.status(200).json({
		success: true,
		data: profile,
	});
});

// @desc	get current users projects
// @route	GET /api/v1/profile/me/projects
// @access	Private
exports.getMyProjects = asyncHandler(async (req, res, next) => {
	// pagination
	const page = parseInt(req.query.page, 10) || 1;
	const limit = 20;
	const startIndex = (page - 1) * limit;
	const endIndex = page * limit;

	let projects = await Profile.findOne({ user: req.user.id })
		.select('projects')
		.populate('projects.proj', 'title');

	if (!projects) {
		return next(
			new ErrorResponse(`Resource not found with id of ${req.user.id}`, 404)
		);
	}

	const total = projects.length;

	projects.projects = projects.projects.slice(startIndex, endIndex);
	// pagination result
	const pagination = {};

	if (endIndex < total) {
		pagination.next = {
			page: page + 1,
			limit,
		};
	}

	if (startIndex > 0) {
		pagination.prev = {
			page: page - 1,
			limit,
		};
	}

	res.status(200).json({
		success: true,
		count: projects.length,
		pagination,
		data: projects,
	});
});

// @desc	get projects of user by id
// @route	GET /api/v1/profile/:userId/projects
// @access	Private
exports.getUserProjects = asyncHandler(async (req, res, next) => {
	// pagination
	const page = parseInt(req.query.page, 10) || 1;
	const limit = 20;
	const startIndex = (page - 1) * limit;
	const endIndex = page * limit;

	let projects = await Profile.findOne({ user: req.params.userId })
		.select('projects')
		.populate('projects.proj', 'title');

	if (!projects) {
		return next(
			new ErrorResponse(
				`Resource not found with id of ${req.params.userId}`,
				404
			)
		);
	}

	const total = projects.length;

	projects.projects = projects.projects.slice(startIndex, endIndex);
	// pagination result
	const pagination = {};

	if (endIndex < total) {
		pagination.next = {
			page: page + 1,
			limit,
		};
	}

	if (startIndex > 0) {
		pagination.prev = {
			page: page - 1,
			limit,
		};
	}

	res.status(200).json({
		success: true,
		count: projects.length,
		pagination,
		data: projects,
	});
});

// @desc	get user github repos
// @route	GET /api/v1/profile/github/:username
// @access	Private
exports.getGithubRepos = asyncHandler(async (req, res, next) => {
	const options = {
		uri: `https://api.github.com/users/${req.params.username}/repos?per_page=5&sort=pushed`,
		method: 'GET',
		headers: {
			'user-agent': 'node.js',
			my_client_id: process.env.GITHUB_API_ID,
			my_client_secret: process.env.GITHUB_API_SECRET,
		},
	};

	request(options, (error, response, body) => {
		if (error) console.error(error);

		if (response.statusCode != 200) {
			return next(new ErrorResponse('no GitHub profile found', 404));
		}

		const data = JSON.parse(body).map((item) => {
			return { name: item.name, html_url: item.html_url };
		});

		res.status(200).json({
			success: true,
			data,
		});
	});
});

// @desc	update profile
// @route	PUT /api/v1/profile/
// @access	Private
exports.updateProfile = asyncHandler(async (req, res, next) => {
	let profile = await Profile.findOne({ user: req.user.id });
	if (!profile) {
		return next(new ErrorResponse('profile does not exists', 404));
	}
	const {
		name,
		bio,
		location,
		skills,
		youtube,
		github,
		hackerRank,
		dribble,
		linkedin,
		behance,
		vimeo,
		website,
	} = req.body;

	const links = {};
	if (youtube) links.youtube = youtube;
	if (github) links.github = github;
	if (hackerRank) links.hackerRank = hackerRank;
	if (dribble) links.dribble = dribble;
	if (linkedin) links.linkedin = linkedin;
	if (behance) links.behance = behance;
	if (vimeo) links.vimeo = vimeo;
	if (website) links.website = website;

	const profileFeilds = {};
	if (bio) profileFeilds.bio = bio;
	if (location) profileFeilds.location = location;
	if (skills) profileFeilds.skills = skills;
	if (
		youtube ||
		github ||
		hackerRank ||
		dribble ||
		linkedin ||
		behance ||
		vimeo ||
		website
	)
		profileFeilds.links = links;

	profile = await Profile.findOneAndUpdate(
		{ user: req.user.id },
		profileFeilds,
		{
			new: true,
			runValidators: true,
		}
	);

	if (name) {
		const user = await User.findById(req.user.id);
		user.name = name;
		await user.save();
	}

	res.status(201).json({
		success: true,
		data: profile,
	});
});

// @desc	add job experience
// @route	PUT /api/v1/profile/experience
// @access	Private
exports.addExperience = asyncHandler(async (req, res, next) => {
	const { title, company, location, from, to } = req.body;
	const newExp = { title, company, location, from };
	if (to) newExp.to = to;
	const profile = await Profile.findOne({ user: req.user.id });
	profile.experience.unshift(newExp);
	await profile.save();
	res.status(201).json({
		success: true,
		data: profile,
	});
});

// @desc	delete job experience
// @route	DELETE /api/v1/profile/experience/:expId
// @access	Private
exports.removeExperience = asyncHandler(async (req, res, next) => {
	const profile = await Profile.findOne({ user: req.user.id });

	// get index of item to remove
	const removeIndex = profile.experience
		.map((item) => item.id)
		.indexOf(req.params.expId);

	profile.experience.splice(removeIndex, 1);
	await profile.save();

	res.status(201).json({
		success: true,
		data: profile,
	});
});

// @desc	add education
// @route	PUT /api/v1/profile/education
// @access	Private
exports.addEducation = asyncHandler(async (req, res, next) => {
	const { school, degree, from, to } = req.body;
	const newEdu = { school, degree, from };
	if (to) newEdu.to = to;
	const profile = await Profile.findOne({ user: req.user.id });
	profile.education.unshift(newEdu);
	await profile.save();
	res.status(201).json({
		success: true,
		data: profile,
	});
});

// @desc	delete education
// @route	DELETE /api/v1/profile/education/:eduId
// @access	Private
exports.removeEducation = asyncHandler(async (req, res, next) => {
	const profile = await Profile.findOne({ user: req.user.id });

	// get index of item to remove
	const removeIndex = profile.education
		.map((item) => item.id)
		.indexOf(req.params.eduId);

	profile.education.splice(removeIndex, 1);
	await profile.save();

	res.status(201).json({
		success: true,
		data: profile,
	});
});

// @desc	set user avatar
// @route	PUT /api/v1/profile/avatar/upload
// @access	Private
