import {
	Arg,
	Ctx,
	Resolver,
	Query,
	UseMiddleware,
	Mutation,
} from 'type-graphql';
import { ProjectResponse } from '../types/ResponseTypes';
import { ProfileReviewModel } from '../../entities/ProfileReview';
import { authorize, protect } from '../../middleware/auth';
import { Project, ProjectModel } from '../../entities/Project';
import { MyContext } from '../types/MyContext';
import { ApolloError } from 'apollo-server-express';
import { Ref } from '@typegoose/typegoose';
import { User } from '../../entities/User';

@Resolver()
export class ProjectResolver {
	@Query(() => ProjectResponse)
	@UseMiddleware(protect, authorize('BOTH'))
	async currentProject(@Ctx() ctx: MyContext): Promise<ProjectResponse> {
		let project = await ProjectModel.findById(ctx.req.project);
		if (project!.owner!.toString() === ctx.req.user!.id.toString()) {
			project = await ProjectModel.findById(ctx.req.project)
				.select('-posts')
				.populate('owner', 'id name avatar')
				.populate('members.dev', 'id name avatar')
				.populate('previousMembers.dev', 'id name avatar')
				.populate('openings.position')
				.populate('applicants.dev', 'id name avatar')
				.populate('applicants.position')
				.populate('offered.dev', 'id name avatar')
				.populate('offered.position')
				.populate('tasks.dev', 'id name avatar')
				.populate('tasks.comments.user', 'id name avatar');
		} else {
			project = await ProjectModel.findById(ctx.req.project)
				.select('-posts -openings -applicants -offered')
				.populate('owner', 'id name avatar')
				.populate('members.dev', 'id name avatar')
				.populate('previousMembers.dev', 'id name avatar')
				.populate('tasks.dev', 'id name avatar')
				.populate('tasks.comments.user', 'id name avatar');
		}

		if (!project) {
			throw new ApolloError('project does not exist');
		}

		return { project };
	}

	@Query(() => ProjectResponse)
	@UseMiddleware(protect)
	async getProject(
		@Arg('projectId') projectId: string
	): Promise<ProjectResponse> {
		const project = await ProjectModel.findById(projectId)
			.select('-posts -openings -applicants -offered -tasks')
			.populate('owner', 'id name avatar')
			.populate('members.dev', 'id name avatar')
			.populate('previousMembers.dev', 'id name avatar');

		if (!project) {
			throw new ApolloError(`Resource not found with id of ${projectId}`);
		}

		return { project };
	}

	@Mutation(() => Boolean)
	@UseMiddleware(protect, authorize('BOTH'))
	async rateColleague(
		@Arg('userId') userId: string,
		@Arg('rating') rating: number,
		@Ctx() ctx: MyContext
	): Promise<Boolean> {
		const profileToReview = await ProfileReviewModel.findOne({ user: userId });

		if (!profileToReview) {
			throw new ApolloError(`Profile not found for user with id of ${userId}`);
		}

		if (
			profileToReview.reviews!.some(
				(review) =>
					review.proj!.toString() === ctx.req.project!.toString() &&
					review.reviewer!.toString() === ctx.req.user!.id.toString()
			)
		) {
			throw new ApolloError('review already exists');
		}

		profileToReview.rating =
			(profileToReview.rating! * (profileToReview.reviews!.length + 1) +
				rating) /
			(profileToReview.reviews!.length + 2);

		profileToReview.reviews!.push({
			proj: ctx.req.project as unknown as Ref<Project>,
			reviewer: ctx.req.user!.id as unknown as Ref<User>,
		});

		await profileToReview.save();

		return true;
	}
}
