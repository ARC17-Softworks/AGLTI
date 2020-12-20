import { Arg, Ctx, Resolver, Query, UseMiddleware } from 'type-graphql';
import { ProjectResponse } from '../types/ResponseTypes';
import { authorize, protect } from '../../middleware/auth';
import { ProjectModel } from '../../entities/Project';
import { MyContext } from '../types/MyContext';
import { ApolloError } from 'apollo-server-express';

@Resolver()
export class ProjectResolver {
	@Query(() => ProjectResponse)
	@UseMiddleware(protect, authorize('BOTH'))
	async currentProject(@Ctx() ctx: MyContext): Promise<ProjectResponse> {
		let project = await ProjectModel.findById(ctx.req.project);
		if (project!.owner!.toString() === ctx.req.user!.id.toString()) {
			project = await ProjectModel.findById(ctx.req.project)
				.select('-posts')
				.populate('owner', 'name avatar')
				.populate('members.dev', 'name avatar')
				.populate('previousMembers.dev', 'name avatar')
				.populate('openings.position')
				.populate('applicants.dev', 'name avatar')
				.populate('applicants.position')
				.populate('offered.dev', 'name avatar')
				.populate('offered.position')
				.populate('tasks.dev', 'name avatar');
		} else {
			project = await ProjectModel.findById(ctx.req.project)
				.select('-posts -openings -applicants -offered')
				.populate('owner', 'name avatar')
				.populate('members.dev', 'name avatar')
				.populate('previousMembers.dev', 'name avatar')
				.populate('tasks.dev', 'name avatar');
		}

		if (!project) {
			throw new ApolloError('project does not exist');
		}

		return { project };
	}

	@Query(() => ProjectResponse)
	@UseMiddleware(protect, authorize('BOTH'))
	async getProject(
		@Arg('projectId') projectId: string
	): Promise<ProjectResponse> {
		const project = await ProjectModel.findById(projectId)
			.select('-posts -openings -applicants -offered -tasks')
			.populate('owner', 'name avatar')
			.populate('members.dev', 'name avatar')
			.populate('previousMembers.dev', 'name avatar');

		if (!project) {
			throw new ApolloError(`Resource not found with id of ${projectId}`);
		}

		return { project };
	}
}
