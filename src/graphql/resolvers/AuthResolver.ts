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
import { AuthInput } from '../types/AuthInput';
import { MyContext } from '../types/MyContext';
import { sendEmail } from '../../utils/sendEmail';
import { CookieOptions, Response } from 'express';
import { DocumentType } from '@typegoose/typegoose';
import { protect } from '../../middleware/auth';
import { ApolloError, UserInputError } from 'apollo-server-express';

@Resolver()
export class AuthResolver {
	// @desc	Start user registration by sending registration link to registration email
	// @access	Public
	@Mutation(() => Boolean)
	async beginRegistration(
		@Arg('input')
		{ name, email, password }: AuthInput,
		@Ctx() ctx: MyContext
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

		const registrationUrl = `${ctx.req.protocol}://${ctx.req.get(
			'host'
		)}//register&token=${registrationToken}`;
		try {
			await sendEmail({
				email: email,
				subject: 'Welcome to AGLTI | complete account registration',
				title: `Welcome to AGLTI, ${name!.split(' ')[0]}!`,
				body:
					'to complete your registration please follow this link (link expires in 1 hour).',
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
	@Mutation(() => User)
	async completeRegistration(
		@Arg('input')
		webtoken: string,
		@Ctx() ctx: MyContext
	): Promise<User> {
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

		return user;
	}

	// @desc	authenticate email before login
	// @access	Public
	@Query(() => Boolean)
	async authenticateEmail(@Arg('email') email: string) {
		if (!/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/.test(email)) {
			return new UserInputError('invalid email');
		}
		const user = await UserModel.findOne({ email });
		if (!user) {
			return false;
		}
		return true;
	}

	// @desc	login to account
	// @access	Public
	@Mutation(() => User)
	async login(
		@Arg('input')
		{ email, password }: AuthInput,
		@Ctx() ctx: MyContext
	): Promise<User> {
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

		return user;
	}

	// @desc	logout of account
	// @access	Private
	@Mutation(() => Boolean)
	@UseMiddleware(protect)
	async logout(@Ctx() ctx: MyContext): Promise<Boolean> {
		ctx.res.clearCookie('token');
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
	};

	if (process.env.NODE_ENV === 'production') {
		options.secure = true;
	}

	res.cookie('token', token, options);
};
