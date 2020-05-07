const mongoose = require('mongoose');

const ProfileSchema = new mongoose.Schema({
	user: {
		type: mongoose.Schema.ObjectId,
		ref: 'User',
		required: true,
	},
	bio: {
		type: String,
		trim: true,
	},
	location: {
		type: String,
		trim: true,
	},
	// list of skills
	skills: {
		type: [String],
		required: [true, 'please add your skills'],
	},
	// list of all projects participated in
	projects: [
		{
			_id: false,
			proj: {
				type: mongoose.Schema.ObjectId,
				ref: 'Project',
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
				trim: true,
				required: [true, 'please add your job title'],
			},
			company: {
				type: String,
				trim: true,
				required: [true, 'please add the company name'],
			},
			location: {
				type: String,
				trim: true,
			},
			from: {
				type: Date,
				required: [true, 'Please add a start date'],
			},
			to: {
				type: Date,
			},
		},
	],
	education: [
		{
			school: {
				type: String,
				trim: true,
				required: [true, 'please add a school name'],
			},
			degree: {
				type: String,
				trim: true,
				required: [true, 'please add degree name'],
			},
			from: {
				type: Date,
				required: [true, 'please add a start date'],
			},
			to: {
				type: Date,
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
		type: mongoose.Schema.ObjectId,
		ref: 'Project',
	},
	// offers from project
	offers: [
		{
			_id: false,
			proj: {
				type: mongoose.Schema.ObjectId,
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
				type: mongoose.Schema.ObjectId,
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
			_id: false,
			contact: {
				type: mongoose.Schema.ObjectId,
				ref: 'User',
			},
		},
	],
	// outgoing friend request
	outgoingRequests: [
		{
			_id: false,
			user: {
				type: mongoose.Schema.ObjectId,
				ref: 'User',
			},
			read: {
				type: Boolean,
				default: false,
			},
		},
	],
	// incoming friend request
	incomingRequests: [
		{
			_id: false,
			user: {
				type: mongoose.Schema.ObjectId,
				ref: 'User',
			},
			read: {
				type: Boolean,
				default: false,
			},
		},
	],
	// blocked users
	blocked: [
		{
			_id: false,
			user: {
				type: mongoose.Schema.ObjectId,
				ref: 'User',
			},
		},
	],
	// private messages
	messages: [
		{
			_id: false,
			thread: {
				type: mongoose.Schema.ObjectId,
				ref: 'MessageThread',
			},
			with: {
				type: mongoose.Schema.ObjectId,
				ref: 'User',
			},
			read: {
				type: Boolean,
				default: false,
			},
		},
	],
	// forem mentions
	mentions: [
		{
			_id: false,
			contentId: {
				type: mongoose.Schema.ObjectId,
			},
			mentionType: {
				type: String,
				enum: ['comment', 'post'],
				default: 'comment',
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

module.exports = mongoose.model('Profile', ProfileSchema);
