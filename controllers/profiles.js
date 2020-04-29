const ErrorResponse = require('../utils/errorResponse');
const asyncHandler = require('../middleware/async');
const Profile = require('../models/Profile');

// @desc	create user profile
// @route	POST /api/v1/profile
// @acces	Private
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
// @route	GET api/profile/me
// @acces	Private
exports.getMe = asyncHandler(async (req, res, next) => {
	const profile = await Profile.findOne({ user: req.user.id }).populate(
		'user',
		'name avatar'
	);

	res.status(200).json({
		success: true,
		data: profile,
	});
});
