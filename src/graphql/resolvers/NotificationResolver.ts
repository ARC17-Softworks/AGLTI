import {
	// Arg,
	Ctx,
	// Mutation,
	Resolver,
	Query,
	UseMiddleware,
} from 'type-graphql';
import { ProfileModel } from '../../entities/Profile';
import { ProjectModel } from '../../entities/Project';
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
}
