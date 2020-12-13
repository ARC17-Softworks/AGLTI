import jwt from 'jsonwebtoken';
import { Arg, Ctx, Mutation, Resolver, Query } from 'type-graphql';
import { UserModel } from '../../entities/User';
import { RegisterResponse } from '../types/RegisterResponse';
import { AuthInput } from '../types/AuthInput';
import { MyContext } from '../types/MyContext';
import { sendEmail } from '../../utils/sendEmail';
import { UserResponse } from '../types/UserResponse';

@Resolver()
export class AuthResolver {
	// @desc	Start user registration by sending registration link to registration email
	// @access	Public
	@Mutation(() => RegisterResponse)
	async beginRegistration(
		@Arg('input')
		{ name, email, password }: AuthInput,
		@Ctx() ctx: MyContext
	): Promise<RegisterResponse> {
		const user = await UserModel.findOne({ email });
		if (user) {
			return {
				errors: [
					{ path: 'register', message: 'user with this email already exists' },
				],
			};
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
				title: `Welcome to AGLTI, ${name.split(' ')[0]}!`,
				body:
					'to complete your registration please follow this link (link expires in 1 hour).',
				link: registrationUrl,
				linkName: 'Complete Registration',
			});

			return { message: 'email sent' };
		} catch (err) {
			console.log(err);
			return {
				errors: [{ path: 'register', message: 'email could not be sent' }],
			};
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
			return {
				errors: [
					{ path: 'register', message: 'user with this email already exists' },
				],
			};
		}

		user = await UserModel.create({
			name,
			email,
			password,
		});

		// create token
		const token = user.getSignedToken();

		const options = {
			expires: new Date(
				Date.now() + Number(process.env.JWT_COOKIE_EXPIRE) * 24 * 60 * 60 * 1000
			),
			httpOnly: true,
			secure: false,
		};

		if (process.env.NODE_ENV === 'production') {
			options.secure = true;
		}

		ctx.res.cookie('token', token, options);

		return { user };
	}

	@Query(() => String)
	hello() {
		return 'Hello World';
	}
}
