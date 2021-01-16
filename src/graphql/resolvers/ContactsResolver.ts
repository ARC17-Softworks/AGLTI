import { Ref } from '@typegoose/typegoose';
import { ApolloError } from 'apollo-server-express';
import {
	Arg,
	Ctx,
	Mutation,
	// Query,
	Resolver,
	UseMiddleware,
} from 'type-graphql';
import { ProfileModel } from '../../entities/Profile';
import { User } from '../../entities/User';
import { protect } from '../../middleware/auth';
import { MyContext } from '../types/MyContext';

@Resolver()
export class ContactsResolver {
	@Mutation(() => Boolean)
	@UseMiddleware(protect)
	async sendRequestById(
		@Arg('userId') userId: string,
		@Ctx() ctx: MyContext
	): Promise<Boolean> {
		const profile = await ProfileModel.findOne({ user: ctx.req.user!.id });
		const reciever = await ProfileModel.findOne({ user: userId });
		if (!reciever) {
			throw new ApolloError(`Resource not found with id of ${userId}`);
		}

		if (userId.toString() === ctx.req.user!.id.toString()) {
			throw new ApolloError('can not send request to self');
		}

		if (
			profile!.contacts!.some(
				(contact) => contact.contact!.toString() === userId.toString()
			)
		) {
			throw new ApolloError('user already in contacts');
		}

		if (
			profile!.blocked!.some(
				(user) => user.user!.toString() === userId.toString()
			)
		) {
			throw new ApolloError('user is blocked');
		}

		if (
			profile!.outgoingRequests!.some(
				(request) => request.user!.toString() === userId.toString()
			)
		) {
			throw new ApolloError('request already sent');
		}
		if (
			profile!.incomingRequests!.some(
				(request) => request.user!.toString() === userId.toString()
			)
		) {
			throw new ApolloError('user had already sent you a request');
		}

		profile!.outgoingRequests!.push({ user: (userId as unknown) as Ref<User> });
		reciever.incomingRequests!.push({
			user: (ctx.req.user!.id as unknown) as Ref<User>,
		});

		await profile!.save();
		await reciever.save();

		return true;
	}
}
