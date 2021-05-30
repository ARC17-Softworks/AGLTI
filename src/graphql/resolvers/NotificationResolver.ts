import { DocumentType } from '@typegoose/typegoose';
import { ApolloError } from 'apollo-server-express';
import {
	Arg,
	Ctx,
	Mutation,
	Resolver,
	Query,
	UseMiddleware,
} from 'type-graphql';
import { ProfileModel } from '../../entities/Profile';
import { Project, ProjectModel } from '../../entities/Project';
import { protect } from '../../middleware/auth';
import { MyContext } from '../types/MyContext';
import { NotificationResponse } from '../types/ResponseTypes';

@Resolver()
export class NotificationResolver {
	@Query(() => NotificationResponse)
	@UseMiddleware(protect)
	async getNotifications(@Ctx() ctx: MyContext) {
		const profile = await ProfileModel.findOne({ user: ctx.req.user!.id });
		const notifications: NotificationResponse = {};
		const messages = profile!.messages!.filter(
			(message) => message.read === false
		);
		if (messages.length > 0) {
			notifications.messages = messages.length;
		}

		const incomingRequests = profile!.incomingRequests!.filter(
			(request) => request.read === false
		);
		if (incomingRequests.length > 0) {
			notifications.incomingRequests = incomingRequests.length;
		}

		if (!profile!.activeProject) {
			const offers = profile!.offers!.filter((offer) => offer.read === false);
			if (offers.length > 0) {
				notifications.offers = offers.length;
			}
		} else {
			const project = await ProjectModel.findById(profile!.activeProject);
			const tasks = project!.tasks!.filter(
				(task) =>
					task.dev!.toString() === ctx.req.user!.id.toString() &&
					task.status === 'TODO' &&
					task.read === false
			);
			if (tasks.length > 0) {
				notifications.tasks = tasks.length;
			}

			const mentions = profile!.mentions!.filter(
				(mention) => mention.read === false
			);
			if (mentions.length > 0) {
				notifications.mentions = mentions.length;
			}
		}
		return notifications;
	}

	@Mutation(() => Boolean)
	@UseMiddleware(protect)
	async markRead(
		@Arg('path') path: string,
		@Ctx() ctx: MyContext
	): Promise<Boolean> {
		const profile = await ProfileModel.findOne({ user: ctx.req.user!.id });
		let project: DocumentType<Project> | null;
		if (profile!.activeProject) {
			project = await ProjectModel.findById(profile!.activeProject);
		}

		if (path === 'messages') {
			for (const message of profile!.messages!) {
				if (message.read === false) {
					message.read = true;
				}
			}

			await profile!.save();
		} else if (path === 'requests') {
			for (const request of profile!.incomingRequests!) {
				if (request.read === false) {
					request.read = true;
				}
			}

			await profile!.save();
		} else if (path === 'offers') {
			if (project!) {
				throw new ApolloError(`bad request`);
			}

			for (const offer of profile!.offers!) {
				if (offer.read === false) {
					offer.read = true;
				}
			}

			await profile!.save();
		} else if (path === 'tasks') {
			if (!project!) {
				throw new ApolloError(`bad request`);
			}

			for (const task of project!.tasks!) {
				if (
					task.dev!.toString() === ctx.req.user!.id.toString() &&
					task.status === 'TODO' &&
					task.read === false
				) {
					task.read = true;
				}
			}

			await project.save();
		} else if (path === 'applicants') {
			if (!project!) {
				throw new ApolloError(`bad request`);
			}

			if (!(project.owner!.toString() === ctx.req.user!.id.toString())) {
				throw new ApolloError(`bad request`);
			}

			for (const applicant of project!.applicants!) {
				applicant.read = true;
			}

			await project.save();
		} else if (path === 'mentions') {
			if (!project!) {
				throw new ApolloError(`bad request`);
			}

			for (const mention of profile!.mentions!) {
				if (mention.read === false) {
					mention.read = true;
				}
			}

			await profile!.save();
		} else {
			throw new ApolloError(`bad request`);
		}
		return true;
	}
}
