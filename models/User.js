const crypto = require('crypto');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const UserSchema = new mongoose.Schema({
	name: {
		type: String,
		required: true,
	},
	email: {
		type: String,
		required: [true, 'Please add an email'],
		match: [
			/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
			'Please add a valid email',
		],
		index: {
			unique: true,
			partialFilterExpression: { email: { $type: 'string' } },
		},
	},
	avatar: {
		type: String,
		// required: true,
	},
	password: {
		type: String,
		required: [true, 'please add a password'],
		minlength: 6,
		select: false,
	},
	resetPasswordToken: String,
	resetPasswordExpire: Date,
	createdAt: {
		type: Date,
		default: Date.now,
	},
});

// Encrypt password using bcrypt
UserSchema.pre('save', async function (next) {
	if (!this.isModified('password')) {
		next();
	}
	const salt = await bcrypt.genSalt(10);
	this.password = await bcrypt.hash(this.password, salt);
});

// add default avatar
UserSchema.pre('save', async function (next) {
	if (this.avatar) {
		next();
	}
	const initials = this.name.split(' ');
	const randomColor = Math.floor(Math.random() * 16777215).toString(16);
	this.avatar = `https://ui-avatars.com/api/?name=${initials[0][0]}+${initials[1][0]}&background=${randomColor}&color=fff&font-size=0.6&bold=true`;
});

// sign JWT and return
UserSchema.methods.getSignedJwtToken = function () {
	return jwt.sign({ id: this._id }, process.env.JWT_SECRET, {
		expiresIn: process.env.JWT_EXPIRE,
	});
};

// match user entered pasword to hashed password
UserSchema.methods.matchPassword = async function (enteredPassword) {
	return await bcrypt.compare(enteredPassword, this.password);
};

// generate and hash password token
UserSchema.methods.getResetPasswordToken = function () {
	// generate token
	const resetToken = crypto.randomBytes(20).toString('hex');

	// hash token and set to resetPasswordToken field
	this.resetPasswordToken = crypto
		.createHash('sha256')
		.update(resetToken)
		.digest('hex');

	// set expire
	this.resetPasswordExpire = Date.now() + 10 * 60 * 1000;

	return resetToken;
};

module.exports = mongoose.model('User', UserSchema);
