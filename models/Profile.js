const mongoose = require('mongoose');

const ProfileSchema = new mongoose.Schema({
	user: {
		type: mongoose.Schema.Types.ObjectId,
		ref: 'User',
		required: true,
	},
	bio: {
		type: String,
	},
	location: {
		type: String,
	},
	// list of skills
	skills: {
		type: [String],
		required: true,
	},
	// list of all projects participated in
	projects: [
		{
			_id: false,
			proj: {
				type: mongoose.Schema.Types.ObjectId,
				ref: 'project',
			},
			role: {
				type: String,
				required: true,
			},
		},
	],
	experience: [
		{
			title: {
				type: String,
				required: true,
			},
			company: {
				type: String,
				required: true,
			},
			location: {
				type: String,
			},
			from: {
				type: Date,
				required: true,
			},
			to: {
				type: Date,
			},
			current: {
				type: Boolean,
				default: false,
			},
			description: {
				type: String,
			},
		},
	],
	education: [
		{
			school: {
				type: String,
				required: true,
			},
			degree: {
				type: String,
				required: true,
			},
			fieldofstudy: {
				type: String,
				required: true,
			},
			from: {
				type: Date,
				required: true,
			},
			to: {
				type: Date,
			},
			current: {
				type: Boolean,
				default: false,
			},
			description: {
				type: String,
			},
		},
	],
	links: {
		youtube: {
			type: String,
		},
		github: {
			type: String,
		},
		hackerRank: {
			type: String,
		},
		dribble: {
			type: String,
		},
		linkedin: {
			type: String,
		},
		behance: {
			type: String,
		},
		vimeo: {
			type: String,
		},
		website: {
			type: String,
		},
	},
	// active project being worked on
	activeProject: {
		type: mongoose.Schema.Types.ObjectId,
		ref: 'Project',
	},
	// offers from project
	offers: [
		{
			_id: false,
			proj: {
				type: mongoose.Schema.Types.ObjectId,
				ref: 'Project',
			},
			role: {
				type: String,
				required: true,
			},
			read: {
				type: Boolean,
				default: false,
			},
		},
	],
	// places applied to
	applied: [
		{
			_id: false,
			proj: {
				type: mongoose.Schema.Types.ObjectId,
				ref: 'Project',
			},
			role: {
				type: String,
				required: true,
			},
		},
	],
	// user contacts
	contacts: [
		{
			contact: {
				type: mongoose.Schema.Types.ObjectId,
				ref: 'User',
			},
		},
	],
	// outgoing friend request
	outgoingRequest: [
		{
			user: {
				type: mongoose.Schema.Types.ObjectId,
				ref: 'User',
			},
			read: {
				type: Boolean,
				default: false,
			},
		},
	],
	// incoming friend request
	incomingRequest: [
		{
			user: {
				type: mongoose.Schema.Types.ObjectId,
				ref: 'User',
			},
			read: {
				type: Boolean,
				default: false,
			},
		},
	],
	// private messages
	messages: [
		{
			thread: {
				type: mongoose.Schema.Types.ObjectId,
				ref: 'MessageThread',
			},
			with: {
				type: mongoose.Schema.Types.ObjectId,
				ref: 'User',
			},
			read: {
				type: Boolean,
				default: false,
			},
		},
	],
	date: {
		type: Date,
		default: Date.now,
	},
});

module.exports = Profile = mongoose.model('Profile', ProfileSchema);
