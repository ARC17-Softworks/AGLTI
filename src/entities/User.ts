import * as bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';
import * as crypto from 'crypto';
import { ObjectType, Field, ID } from 'type-graphql';
import { prop, pre, getModelForClass, index } from '@typegoose/typegoose';
import { Schema } from 'mongoose';

// add default avatar
@pre<User>('save', async function (next) {
	if (this.avatar) {
		next();
	}
	const initials = this.name.split(' ');
	const randomColor = Math.floor(Math.random() * 16777215).toString(16);
	this.avatar = `https://ui-avatars.com/api/?name=${initials[0][0]}+${
		initials.length > 1 ? initials[1][0] : ''
	}&background=${randomColor}&color=fff&font-size=0.6&bold=true`;
})
// Encrypt password using bcrypt
@pre<User>('save', async function (next) {
	if (!this.isModified('password')) {
		next();
	}
	const salt = await bcrypt.genSalt(10);
	this.password = await bcrypt.hash(this.password, salt);
})
@index(
	{ email: 1 },
	{
		unique: true,
		partialFilterExpression: { email: { $type: 'string' } },
	}
)
@ObjectType()
export class User {
	@Field(() => ID)
	id!: string;

	_id?: Schema.Types.ObjectId;

	@Field()
	@prop({
		equired: [true, 'Please add an email'],
		match: [
			/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
			'Please add a valid email',
		],

		lowercase: true,
	})
	email!: string;

	@Field()
	@prop({ required: [true, 'please include your name'], trim: true })
	name!: string;

	@Field()
	@prop()
	avatar?: string;

	@prop({
		required: [true, 'please add a password'],
		minlength: 6,
		select: false,
	})
	password!: string;

	@Field({ nullable: true })
	@prop()
	resetPasswordToken?: String;

	@Field({ nullable: true })
	@prop()
	resetPasswordExpire?: Date;

	@Field()
	@prop({ default: Date.now })
	createdAt?: Date;

	getSignedToken() {
		return jwt.sign({ id: this._id }, process.env.JWT_SECRET as string, {
			expiresIn: process.env.JWT_EXPIRE,
		});
	}

	async matchPassword(enteredPassword: string) {
		return await bcrypt.compare(enteredPassword, this.password);
	}

	getResetPasswordToken() {
		// generate token
		const resetToken = crypto.randomBytes(20).toString('hex');

		// hash token and set to resetPasswordToken field
		this.resetPasswordToken = crypto
			.createHash('sha256')
			.update(resetToken)
			.digest('hex');

		// set expire
		this.resetPasswordExpire = new Date(Date.now() + 10 * 60 * 1000);

		return resetToken;
	}
}

export const UserModel = getModelForClass(User);
