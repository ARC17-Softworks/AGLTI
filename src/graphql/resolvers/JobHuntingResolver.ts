import { Ref } from '@typegoose/typegoose';
import { ApolloError } from 'apollo-server-express';
import { Arg, Ctx, Mutation, Resolver, UseMiddleware } from 'type-graphql';
import { PostionModel } from '../../entities/Position';
import { ProfileModel } from '../../entities/Profile';
import { ProjectModel } from '../../entities/Project';
import { User } from '../../entities/User';
import { protect } from '../../middleware/auth';
import { MyContext } from '../types/MyContext';

@Resolver()
export class JobHuntingResolver {
	@Mutation(() => Boolean)
	@UseMiddleware(protect)
	async apply(
		@Arg('positionId') positionId: string,
		@Ctx() ctx: MyContext
	): Promise<Boolean> {
		const profile = await ProfileModel.findOne({ user: ctx.req.user!.id });

		// check if user already part of a project
		if (profile!.activeProject) {
			throw new ApolloError(
				'cannot apply for position already part of a project'
			);
		}

		const position = await PostionModel.findById(positionId);

		// check if position exists
		if (!position) {
			throw new ApolloError(`Resource not found with id of ${positionId}`);
		}

		const project = await ProjectModel.findById(position.project);

		// check if position belongs to project
		if (
			!project!.openings!.some(
				(opening) => opening.position!.toString() === position.id.toString()
			)
		) {
			throw new ApolloError('position not part of project');
		}

		// check if user has required skills
		if (!position.skills.every((skill) => profile!.skills.includes(skill))) {
			throw new ApolloError('user does not have requred skills');
		}

		// check if already applied for this position
		if (
			project!.applicants!.some(
				(applicant) =>
					applicant.dev!.toString() === ctx.req.user!.id.toString() &&
					applicant.position!.toString() === position.id.toString()
			)
		) {
			throw new ApolloError('user already applied for this position');
		}

		// check if already offered this position
		if (
			project!.offered!.some(
				(offer) =>
					offer.dev!.toString() === ctx.req.user!.id.toString() &&
					offer.position!.toString() === position.id.toString()
			)
		) {
			throw new ApolloError('user already offered this position');
		}

		profile!.applied!.push({ position: position.id });
		project!.applicants!.push({
			dev: (ctx.req.user!.id as unknown) as Ref<User>,
			position: position.id,
		});
		await profile!.save();
		await project!.save();
		return true;
	}
}
