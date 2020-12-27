import { Ref } from '@typegoose/typegoose';
import { ApolloError } from 'apollo-server-express';
import { Arg, Ctx, Mutation, Resolver, UseMiddleware } from 'type-graphql';
import { PostionModel } from '../../entities/Position';
import { Offers, ProfileModel } from '../../entities/Profile';
import { ProjectModel } from '../../entities/Project';
import { User } from '../../entities/User';
import { protect, authorize } from '../../middleware/auth';
import { MyContext } from '../types/MyContext';

@Resolver()
export class HiringResolver {
	@Mutation(() => Boolean)
	@UseMiddleware(protect, authorize('OWNER'))
	async offer(
		@Arg('positionId') positionId: string,
		@Arg('userId') userId: string,
		@Ctx() ctx: MyContext
	): Promise<Boolean> {
		const project = await ProjectModel.findById(ctx.req.project);
		const position = await PostionModel.findById(positionId);
		const profile = await ProfileModel.findOne({ user: userId });

		// check if user already part of a project
		if (profile!.activeProject) {
			throw new ApolloError(
				'cannot offer position user already part of a project'
			);
		}

		// check if position exists
		if (!position) {
			throw new ApolloError(`Resource not found with id of ${positionId}`);
		}

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
					applicant.dev!.toString() === userId.toString() &&
					applicant.position!.toString() === position.id.toString()
			)
		) {
			throw new ApolloError('user already applied for this position');
		}

		// check if already offered this position
		if (
			project!.offered!.some(
				(offer) =>
					offer.dev!.toString() === userId.toString() &&
					offer.position!.toString() === position.id.toString()
			)
		) {
			throw new ApolloError('user already offered this position');
		}

		profile!.offers!.push({ position: position.id } as Offers);
		project!.offered!.push({
			dev: (userId as unknown) as Ref<User>,
			position: position.id,
		});
		await profile!.save();
		await project!.save();
		return true;
	}

	@Mutation(() => Boolean)
	@UseMiddleware(protect, authorize('OWNER'))
	async cancelOffer(
		@Arg('positionId') positionId: string,
		@Arg('userId') userId: string,
		@Ctx() ctx: MyContext
	): Promise<Boolean> {
		const project = await ProjectModel.findById(ctx.req.project);
		const profile = await ProfileModel.findOne({ user: userId });
		const position = await PostionModel.findById(positionId);
		if (
			!project!.offered!.some(
				(offer) =>
					offer.position!.toString() === positionId.toString() &&
					offer.dev!.toString() === userId.toString()
			)
		) {
			throw new ApolloError('offer not found');
		}

		// check if position exists
		if (!position) {
			throw new ApolloError(`Resource not found with id of ${positionId}`);
		}

		// check if position belongs to project
		if (
			!project!.openings!.some(
				(opening) => opening.position!.toString() === position.id.toString()
			)
		) {
			throw new ApolloError('position not part of project');
		}

		profile!.offers = profile!.offers!.filter(
			(offer) => offer.position!.toString() != positionId.toString()
		);
		project!.offered = project!.offered!.filter(
			(offer) =>
				offer.position!.toString() != positionId.toString() ||
				offer.dev!.toString() != userId.toString()
		);

		await profile!.save();
		await project!.save();
		return true;
	}
}
