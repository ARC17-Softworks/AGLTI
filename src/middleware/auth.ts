import jwt from 'jsonwebtoken';
import { MiddlewareFn, NextFn } from 'type-graphql';
import { MyContext } from '../graphql/types/MyContext';
import { User, UserModel } from '../entities/User';
import { AuthenticationError } from 'apollo-server-express';
import { ProjectModel } from '../entities/Project';
import { ProfileModel } from '../entities/Profile';

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
		context.res.clearCookie('token');
		throw new AuthenticationError('Not authorised to access this resource');
	}

	return next();
};

// grant access to specific roles
export function authorize(role: string): MiddlewareFn<MyContext> {
	return async ({ context }, next: NextFn) => {
		if (role !== 'MEMBER' && role !== 'OWNER' && role !== 'BOTH') {
			throw new AuthenticationError('invalid role');
		}

		const profile = await ProfileModel.findOne({ user: context.req.user!.id });
		// console.log(profile);
		if (!profile || !profile.activeProject) {
			throw new AuthenticationError('Not authorised to access this resource');
		}

		const project = await ProjectModel.findById(profile.activeProject);

		if (role === 'MEMBER') {
			if (
				!project ||
				!project.members!.some(
					(member) => member.dev!.toString() === context.req.user!.id.toString()
				)
			) {
				throw new AuthenticationError('Not authorised to access this resource');
			}

			context.req.project = project.id;
			return next();
		} else if (role === 'OWNER') {
			if (
				!project ||
				!(project.owner!.toString() === context.req.user!.id.toString())
			) {
				throw new AuthenticationError('Not authorised to access this resource');
			}

			context.req.project = project.id;
			return next();
		} else if (role === 'BOTH') {
			if (
				!(project!.owner!.toString() === context.req.user!.id.toString()) &&
				!project!.members!.some(
					(member) => member.dev!.toString() === context.req.user!.id.toString()
				)
			) {
				throw new AuthenticationError('Not authorised to access this resource');
			}

			context.req.project = project!.id;
			return next();
		}
	};
}
