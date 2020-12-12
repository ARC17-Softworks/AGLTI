import jwt from 'jsonwebtoken';
import {
	Arg,
	Ctx,
	Mutation,
	Resolver,
	Query,
	ObjectType,
	Field,
} from 'type-graphql';
import { UserModel } from '../../entities/User';
// import { UserResponse } from '../types/UserResponse';
import { AuthInput } from '../types/AuthInput';
import { FieldError } from '../types/FieldError';
import { MyContext } from '../types/MyContext';
import { sendEmail } from '../../utils/sendEmail';

@ObjectType()
export class RegisterResponse {
	@Field()
	message?: string;
	@Field(() => [FieldError], { nullable: true })
	errors?: FieldError[];
}

@Resolver()
export class AuthResolver {
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
		)}/api/v1/auth/register/${registrationToken}`;
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

	@Query(() => String)
	hello() {
		return 'Hello World';
	}
}
