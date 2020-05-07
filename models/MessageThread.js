const mongoose = require('mongoose');

const MessageThreadSchema = new mongoose.Schema({
	users: {
		type: [
			{
				type: mongoose.Schema.ObjectId,
				ref: 'User',
			},
		],
		validate: [
			(val) => val.length == 2,
			'users array can only contain two people',
		],
	},
	messages: [
		{
			from: {
				type: mongoose.Schema.ObjectId,
				ref: 'User',
			},
			text: {
				type: String,
				trim: true,
				required: [true, 'please add a message'],
			},
			date: {
				type: Date,
				default: Date.now,
			},
		},
	],
});

module.exports = mongoose.model('MessageThread', MessageThreadSchema);
