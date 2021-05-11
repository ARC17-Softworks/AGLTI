import jwt from 'jsonwebtoken';
import {
	Arg,
	Ctx,
	Mutation,
	Resolver,
	Query,
	UseMiddleware,
} from 'type-graphql';
import { User, UserModel } from '../../entities/User';
import { AuthInput } from '../types/InputTypes';
import { MyContext } from '../types/MyContext';
import { sendEmail } from '../../utils/sendEmail';
import { CookieOptions, Response } from 'express';
import { DocumentType } from '@typegoose/typegoose';
import { protect } from '../../middleware/auth';
import { ApolloError, UserInputError } from 'apollo-server-express';
import { UserResponse } from '../types/ResponseTypes';
import crypto from 'crypto';
import { ProfileModel } from '../../entities/Profile';

@Resolver()
export class AuthResolver {
	// @desc	Start user registration by sending registration link to registration email
	// @access	Public
	@Mutation(() => Boolean)
	async beginRegistration(
		@Arg('input')
		{ name, email, password }: AuthInput
	): Promise<Boolean> {
		const user = await UserModel.findOne({ email });
		if (user) {
			throw new ApolloError('user with this email already exists');
		}

		const registrationToken = jwt.sign(
			{ name, email, password },
			process.env.JWT_SECRET as string,
			{
				expiresIn: '1h',
			}
		);

		const registrationUrl = `${
			process.env.FRONTEND_URL as string
		}/register?token=${registrationToken}`;
		console.log(registrationUrl);
		try {
			await sendEmail({
				email: email,
				subject: 'Welcome to AGLTI | complete account registration',
				title: `Welcome to AGLTI, ${name!.split(' ')[0]}!`,
				body: 'to complete your registration please follow this link (link expires in 1 hour).',
				link: registrationUrl,
				linkName: 'Complete Registration',
			});

			return true;
		} catch (err) {
			console.log(err);
			throw new ApolloError('email could not be sent');
		}
	}

	// @desc	complete registration by authenticating email
	// @access	Public
	@Mutation(() => UserResponse)
	async completeRegistration(
		@Arg('input')
		webtoken: string,
		@Ctx() ctx: MyContext
	): Promise<UserResponse> {
		const decoded = jwt.verify(webtoken, process.env.JWT_SECRET as string);
		const { name, email, password } = decoded as AuthInput;

		let user = await UserModel.findOne({ email });
		if (user) {
			throw new ApolloError('user with this email already exists');
		}

		user = await UserModel.create({
			name,
			email,
			password,
		} as User);

		setTokenCookie(user, ctx.res);

		return { user };
	}

	// @desc	authenticate email before login
	// @access	Public
	@Query(() => Boolean)
	async authenticateEmail(@Arg('email') email: string) {
		if (!/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/.test(email)) {
			throw new UserInputError('invalid email');
		}
		const user = await UserModel.findOne({ email });
		if (!user) {
			return false;
		}
		return true;
	}

	// @desc	login to account
	// @access	Public
	@Mutation(() => UserResponse)
	async login(
		@Arg('input')
		{ email, password }: AuthInput,
		@Ctx() ctx: MyContext
	): Promise<UserResponse> {
		// check for user
		const user = await UserModel.findOne({ email }).select('+password');

		if (!user) {
			throw new ApolloError('invalid credentials');
		}

		// check if password matches
		const isMatch = await user.matchPassword(password);

		if (!isMatch) {
			throw new ApolloError('invalid credentials');
		}

		setTokenCookie(user, ctx.res);

		return { user };
	}

	// @desc	logout of account
	// @access	Private
	@Mutation(() => Boolean)
	@UseMiddleware(protect)
	async logout(@Ctx() ctx: MyContext): Promise<Boolean> {
		ctx.res.clearCookie('token');
		return true;
	}

	// @desc	update password
	// @access	Private
	@Mutation(() => UserResponse)
	@UseMiddleware(protect)
	async updatePassword(
		@Arg('currentPassword') currentPassword: string,
		@Arg('newPassword') newPassword: string,
		@Ctx() ctx: MyContext
	): Promise<UserResponse> {
		const user = (await UserModel.findById(ctx.req.user!.id).select(
			'+password'
		)) as DocumentType<User>;

		// check current password
		if (!(await user.matchPassword(currentPassword))) {
			throw new ApolloError('incorrect password');
		}

		user.password = newPassword;
		await user.save();
		return { user };
	}

	// @desc	forgot password send email
	// @access	Private
	@Mutation(() => Boolean)
	async forgotPassword(@Arg('email') email: string): Promise<Boolean> {
		const user = await UserModel.findOne({ email: email });

		if (!/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/.test(email)) {
			throw new UserInputError('invalid email');
		}

		if (!user) {
			throw new ApolloError('no user with this email');
		}

		// get reset token
		const resetToken = user.getResetPasswordToken();

		await user!.save({ validateBeforeSave: false });

		// create reset url
		const resetUrl = `${
			process.env.FRONTEND_URL as string
		}/resetpassword?token=${resetToken}`;

		try {
			await sendEmail({
				email: user.email,
				subject: 'AGLTI | reset password',
				title: 'Reset you account password',
				body: 'You are recieving this email because you (or someone else) has requested the reset of your AGLTI account password. (link expire in 10 minutes)',
				link: resetUrl,
				linkName: 'Reset Password',
			});

			return true;
		} catch (err) {
			console.log(err);
			user.resetPasswordToken = undefined;
			user.resetPasswordExpire = undefined;

			await user.save({ validateBeforeSave: false });
			throw new ApolloError('email could not be sent');
		}
	}

	@Mutation(() => UserResponse)
	@UseMiddleware(protect)
	async resetPassword(
		@Arg('resettoken') resettoken: string,
		@Arg('newPassword') newPassword: string
	): Promise<UserResponse> {
		// get hashed token
		const resetPasswordToken = crypto
			.createHash('sha256')
			.update(resettoken)
			.digest('hex');
		const user = await UserModel.findOne({
			resetPasswordToken,
			resetPasswordExpire: { $gt: new Date(Date.now()) },
		});

		if (!user) {
			throw new ApolloError('invalid token');
		}

		// set new password
		user.password = newPassword;

		user.resetPasswordToken = undefined;
		user.resetPasswordExpire = undefined;

		await user.save();
		return { user };
	}

	@Mutation(() => Boolean)
	@UseMiddleware(protect)
	async deleteAccount(@Ctx() ctx: MyContext): Promise<Boolean> {
		const profile = await ProfileModel.findOne({ user: ctx.req.user!.id });
		if (!profile) {
			throw new ApolloError('Resource not found');
		}

		if (profile.activeProject) {
			throw new ApolloError(
				'can not delete account while user in project, please leave project and try again'
			);
		}

		profile.remove();

		await UserModel.findByIdAndUpdate(ctx.req.user!.id, {
			name: '[deleted]',
			$unset: { email: true, password: true },
		});

		// delete token
		ctx.res.cookie('token', 'none', {
			expires: new Date(Date.now() + 10 * 1000),
			httpOnly: true,
		});

		return true;
	}
}

// Get token from model & create cookie
const setTokenCookie = (user: DocumentType<User>, res: Response) => {
	// create token
	const token = user.getSignedToken();

	const options: CookieOptions = {
		expires: new Date(
			Date.now() + Number(process.env.JWT_COOKIE_EXPIRE) * 24 * 60 * 60 * 1000
		),
		httpOnly: true,
		sameSite: 'none',
		secure: true,
	};

	if (process.env.NODE_ENV === 'production') {
		options.secure = true;
	}

	res.cookie('token', token, options);
};
