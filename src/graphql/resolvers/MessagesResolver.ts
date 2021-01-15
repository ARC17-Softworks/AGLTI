import { Ref } from '@typegoose/typegoose';
import { ApolloError } from 'apollo-server-express';
import {
	Arg,
	Ctx,
	Mutation,
	Query,
	Resolver,
	UseMiddleware,
} from 'type-graphql';
import { MessageThreadModel } from '../../entities/MessageThread';
import { ProfileModel } from '../../entities/Profile';
import { User } from '../../entities/User';
import { protect } from '../../middleware/auth';
import { MyContext } from '../types/MyContext';
import { MessageThreadResponse } from '../types/ResponseTypes';

@Resolver()
export class MessagesResolver {
	@Mutation(() => Boolean)
	@UseMiddleware(protect)
	async sendMessage(
		@Arg('userId') userId: string,
		@Arg('text') text: string,
		@Ctx() ctx: MyContext
	): Promise<Boolean> {
		const profile = await ProfileModel.findOne({ user: ctx.req.user!.id });
		const reciever = await ProfileModel.findOne({ user: userId });
		let messageThread;

		if (!profile) {
			throw new ApolloError(
				`Resource not found with id of ${ctx.req.user!.id}`
			);
		}
		if (!reciever) {
			throw new ApolloError(`Resource not found with id of ${userId}`);
		}

		if (userId.toString() === ctx.req.user!.id.toString()) {
			throw new ApolloError('cannot send message to self');
		}

		if (
			profile!.blocked!.some(
				(user) => user.user!.toString() === userId.toString()
			)
		) {
			throw new ApolloError('reciever in blocked list');
		}

		if (
			reciever!.blocked!.some(
				(user) => user.user!.toString() === ctx.req.user!.id.toString()
			)
		) {
			throw new ApolloError('blocked');
		}

		const thread = profile!.messages!.find(
			(thread) => thread.with!.toString() === userId.toString()
		);
		if (thread) {
			messageThread = await MessageThreadModel.findById(thread.thread);
			messageThread!.messages!.push({
				text: text,
				from: (ctx.req.user!.id as unknown) as Ref<User>,
			});
			for (const message of reciever!.messages!) {
				if (message.thread!.toString() === messageThread!.id.toString()) {
					message.read = false;
					break;
				}
			}
			await reciever!.save();
			await messageThread!.save();
		} else {
			messageThread = await MessageThreadModel.create({
				users: [
					(ctx.req.user!.id as unknown) as Ref<User>,
					(userId as unknown) as Ref<User>,
				],
				messages: [{ text: text, from: ctx.req.user!.id }],
			});
			profile!.messages!.push({
				thread: messageThread.id,
				with: (userId as unknown) as Ref<User>,
				read: true,
			});
			reciever!.messages!.push({
				thread: messageThread.id,
				with: (ctx.req.user!.id as unknown) as Ref<User>,
			});
			await profile!.save();
			await reciever!.save();
		}

		return true;
	}

	@Query(() => MessageThreadResponse)
	@UseMiddleware(protect)
	async getThread(@Arg('threadId') threadId: string, @Ctx() ctx: MyContext) {
		const messageThread = await MessageThreadModel.findById(threadId)
			.populate('users', 'id name avatar')
			.populate('messages.from', 'id name avatar');

		// thread does not exist
		if (!messageThread) {
			throw new ApolloError(`Resource not found with id of ${threadId}`);
		}

		// user not part of thread
		if (
			!messageThread.users.some(
				(user) => (user as User).id.toString() === ctx.req.user!.id.toString()
			)
		) {
			throw new ApolloError('Not authorised to access this resource');
		}

		return { thread: messageThread };
	}
}
