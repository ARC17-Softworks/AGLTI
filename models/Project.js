const mongoose = require('mongoose');

ProjectSchema = new mongoose.Schema({
	owner: {
		type: mongoose.Schema.ObjectId,
		ref: 'User',
	},
	private: {
		type: Boolean,
		default: false,
	},
	positions: [
		{
			_id: false,
			dev: {
				type: mongoose.Schema.ObjectId,
				ref: 'User',
			},
			role: {
				type: String,
				required: true,
			},
			vacancy: {
				type: Boolean,
				default: true,
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
		minlength: 100,
		required: [true, 'please add a project description'],
	},
	status: {
		type: String,
		enum: ['HIRING', 'FULL', 'CLOSED'],
		default: 'HIRING',
	},
	// applicants for a job role
	applicants: [
		{
			_id: false,
			dev: {
				type: mongoose.Schema.ObjectId,
				ref: 'User',
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
	// devs who were offered jobs
	offered: [
		{
			_id: false,
			dev: {
				type: mongoose.Schema.ObjectId,
				ref: 'User',
			},
			role: {
				type: String,
				required: true,
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
