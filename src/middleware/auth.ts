import jwt from 'jsonwebtoken';
import { MiddlewareFn } from 'type-graphql';
import { MyContext } from '../graphql/types/MyContext';
import { User, UserModel } from '../entities/User';
import { AuthenticationError } from 'apollo-server-express';

export const protect: MiddlewareFn<MyContext> = async ({ context }, next) => {
	if (
		!context.req
			.get('Cookie')
			?.split('; ')
			.filter((item) => item.startsWith('token=')).length
	) {
		throw new AuthenticationError('not authenticated');
	}

	const token = context.req
		.get('Cookie')
		?.split('; ')
		.filter((item) => item.startsWith('token='))[0]
		.split('=')[1];

	try {
		// verify token
		const decoded = jwt.verify(
			token!,
			process.env.JWT_SECRET as string
		) as User;

		context.req.user = (await UserModel.findById(decoded.id).select(
			'id name avatar'
		)) as User;
	} catch (err) {
		console.log(err);
		throw new AuthenticationError('Not authorised to access this resource');
	}

	return next();
};
