const mongoose = require('mongoose');

PositionSchema = new mongoose.Schema({
	project: {
		type: mongoose.Schema.ObjectId,
		ref: 'Project',
	},
	title: {
		type: String,
		trim: true,
		required: [true, 'title is required'],
		minlength: 5,
		maxlength: 25,
	},
	skills: {
		type: [String],
		required: [true, 'skill(s) required'],
	},
	description: {
		type: String,
		trim: true,
		required: [true, 'description is required'],
		minlength: 15,
		maxlength: 200,
	},
});

module.exports = mongoose.model('Position', PositionSchema);
