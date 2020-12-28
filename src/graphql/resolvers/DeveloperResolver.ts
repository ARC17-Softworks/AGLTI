import { ApolloError } from 'apollo-server-express';
import { Arg, Ctx, Mutation, Resolver, UseMiddleware } from 'type-graphql';
import { Task, Project, ProjectModel } from '../../entities/Project';
import { authorize, protect } from '../../middleware/auth';
import { MyContext } from '../types/MyContext';
import { Types } from 'mongoose';
import { DocumentType } from '@typegoose/typegoose';

@Resolver()
export class DeveloperResolver {
	@Mutation(() => Boolean)
	@UseMiddleware(protect, authorize('MEMBER'))
	async pushTask(
		@Arg('taskId') taskId: string,
		@Ctx() ctx: MyContext
	): Promise<Boolean> {
		const project = await ProjectModel.findById(ctx.req.project);

		const task = ((((project!
			.tasks as Task[]) as unknown) as Types.DocumentArray<
			DocumentType<Project>
		>).id(taskId) as unknown) as Task;

		if (!task) {
			throw new ApolloError('task not found');
		}

		if (task.dev!.toString() != ctx.req.user!.id.toString()) {
			throw new ApolloError('task does not belong to user');
		}

		const taskIndex = project!.tasks!.findIndex((t) => t === task);

		if (project!.tasks![taskIndex].status === 'TODO') {
			project!.tasks![taskIndex].status = 'DOING';
			project!.tasks![taskIndex].read = true;
		} else if (project!.tasks![taskIndex].status === 'DOING') {
			project!.tasks![taskIndex].status = 'DONE';
			project!.tasks![taskIndex].note = undefined;
		}

		await project!.save();
		return true;
	}
}
