const mongoose = require('mongoose');

ProjectSchema = new mongoose.Schema({
	owner: {
		type: mongoose.Schema.ObjectId,
		ref: 'User',
	},
	openings: [
		{
			_id: false,
			position: {
				type: mongoose.Schema.ObjectId,
				ref: 'Position',
			},
		},
	],
	members: [
		{
			_id: false,
			dev: {
				type: mongoose.Schema.ObjectId,
				ref: 'User',
			},
			title: {
				type: String,
				required: true,
			},
			skills: {
				type: [String],
				required: true,
			},
		},
	],
	previousMembers: [
		{
			_id: false,
			dev: {
				type: mongoose.Schema.ObjectId,
				ref: 'User',
			},
			title: {
				type: String,
				required: true,
			},
			skills: {
				type: [String],
				required: true,
			},
		},
	],
	title: {
		type: String,
		trim: true,
		required: [true, 'please add a project title'],
	},
	description: {
		type: String,
		trim: true,
		minlength: 50,
		maxlength: 1000,
		required: [true, 'please add a project description'],
	},
	closed: {
		type: Boolean,
		default: false,
	},
	// applicants for a job role
	applicants: [
		{
			_id: false,
			dev: {
				type: mongoose.Schema.ObjectId,
				ref: 'User',
			},
			position: {
				type: mongoose.Schema.ObjectId,
				ref: 'Position',
			},
			read: {
				type: Boolean,
				default: false,
			},
		},
	],
	// devs who were offered jobs
	offered: [
		{
			_id: false,
			dev: {
				type: mongoose.Schema.ObjectId,
				ref: 'User',
			},
			position: {
				type: mongoose.Schema.ObjectId,
				ref: 'Position',
			},
		},
	],
	tasks: [
		{
			dev: {
				type: mongoose.Schema.ObjectId,
				ref: 'User',
			},
			title: {
				type: String,
				trim: true,
				required: [true, 'Please add a task title'],
			},
			description: {
				type: String,
				trim: true,
				minlength: 10,
				required: [true, 'Please add a task description'],
			},
			note: {
				type: String,
				trim: true,
				minlength: 10,
			},
			status: {
				type: String,
				enum: ['TODO', 'DOING', 'DONE', 'COMPLETE'],
				default: 'TODO',
			},
			read: {
				type: Boolean,
				default: false,
			},
		},
	],
	posts: [
		{
			user: {
				type: mongoose.Schema.ObjectId,
				ref: 'User',
			},
			title: {
				type: String,
				trim: true,
				required: [true, 'please add a post title'],
			},
			text: {
				type: String,
				trim: true,
				minlength: 10,
				required: [true, 'please add post body'],
			},
			comments: [
				{
					user: {
						type: mongoose.Schema.ObjectId,
						ref: 'User',
					},
					text: {
						type: String,
						trim: true,
						required: [true, 'please add comment text'],
					},
					date: {
						type: Date,
						default: Date.now,
					},
				},
			],
			date: {
				type: Date,
				default: Date.now,
			},
		},
	],
});

module.exports = mongoose.model('Project', ProjectSchema);
