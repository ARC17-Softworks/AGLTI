import { Ref } from '@typegoose/typegoose';
import { ApolloError } from 'apollo-server-express';
import { Arg, Ctx, Mutation, Resolver, UseMiddleware } from 'type-graphql';
import { ProfileModel } from '../../entities/Profile';
import { User, UserModel } from '../../entities/User';
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

	@Mutation(() => Boolean)
	@UseMiddleware(protect)
	async sendRequestByEmail(
		@Arg('email') email: string,
		@Ctx() ctx: MyContext
	): Promise<Boolean> {
		const profile = await ProfileModel.findOne({ user: ctx.req.user!.id });

		if (!/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/.test(email)) {
			throw new ApolloError('invalid email');
		}

		if (ctx.req.user!.email === email) {
			throw new ApolloError('can not send request to self');
		}

		const recieverUser = await UserModel.findOne({ email: email });
		if (!recieverUser) {
			throw new ApolloError(`User not found with email of ${email}`);
		}
		const reciever = await ProfileModel.findOne({ user: recieverUser.id });
		if (!reciever) {
			throw new ApolloError(`Resource not found with id of ${recieverUser.id}`);
		}

		if (
			profile!.contacts!.some(
				(contact) => contact.contact!.toString() === recieverUser.id.toString()
			)
		) {
			throw new ApolloError('user already in contacts');
		}

		if (
			profile!.blocked!.some(
				(user) => user.user!.toString() === recieverUser.id.toString()
			)
		) {
			throw new ApolloError('user is blocked');
		}

		if (
			profile!.outgoingRequests!.some(
				(request) => request.user!.toString() === recieverUser.id.toString()
			)
		) {
			throw new ApolloError('request already sent');
		}
		if (
			profile!.incomingRequests!.some(
				(request) => request.user!.toString() === recieverUser.id.toString()
			)
		) {
			throw new ApolloError('user had already sent you a request');
		}

		profile!.outgoingRequests!.push({ user: recieverUser.id });
		reciever!.incomingRequests!.push({
			user: (ctx.req.user!.id as unknown) as Ref<User>,
		});

		await profile!.save();
		await reciever.save();

		return true;
	}

	@Mutation(() => Boolean)
	@UseMiddleware(protect)
	async cancelRequest(
		@Arg('userId') userId: string,
		@Ctx() ctx: MyContext
	): Promise<Boolean> {
		const profile = await ProfileModel.findOne({ user: ctx.req.user!.id });
		const reciever = await ProfileModel.findOne({ user: userId });

		if (
			!profile!.outgoingRequests!.some(
				(request) => request.user!.toString() === userId.toString()
			)
		) {
			throw new ApolloError('requst not found');
		}

		profile!.outgoingRequests = profile!.outgoingRequests!.filter(
			(request) => request.user!.toString() != userId.toString()
		);
		reciever!.incomingRequests = reciever!.incomingRequests!.filter(
			(request) => request.user!.toString() != ctx.req.user!.id.toString()
		);

		await profile!.save();
		await reciever!.save();

		return true;
	}

	@Mutation(() => Boolean)
	@UseMiddleware(protect)
	async rejectRequest(
		@Arg('userId') userId: string,
		@Ctx() ctx: MyContext
	): Promise<Boolean> {
		const profile = await ProfileModel.findOne({ user: ctx.req.user!.id });
		const sender = await ProfileModel.findOne({ user: userId });

		if (
			!profile!.incomingRequests!.some(
				(request) => request.user!.toString() === userId.toString()
			)
		) {
			throw new ApolloError('requst not found');
		}

		profile!.incomingRequests = profile!.incomingRequests!.filter(
			(request) => request.user!.toString() != userId.toString()
		);
		sender!.outgoingRequests = sender!.outgoingRequests!.filter(
			(request) => request.user!.toString() != ctx.req.user!.id.toString()
		);

		await profile!.save();
		await sender!.save();

		return true;
	}

	@Mutation(() => Boolean)
	@UseMiddleware(protect)
	async acceptRequest(
		@Arg('userId') userId: string,
		@Ctx() ctx: MyContext
	): Promise<Boolean> {
		const profile = await ProfileModel.findOne({ user: ctx.req.user!.id });
		const sender = await ProfileModel.findOne({ user: userId });

		if (
			!profile!.incomingRequests!.some(
				(request) => request.user!.toString() === userId.toString()
			)
		) {
			throw new ApolloError('requst not found');
		}

		profile!.incomingRequests = profile!.incomingRequests!.filter(
			(request) => request.user!.toString() != userId.toString()
		);
		sender!.outgoingRequests = sender!.outgoingRequests!.filter(
			(request) => request.user!.toString() != ctx.req.user!.id.toString()
		);

		profile!.contacts!.push({ contact: (userId as unknown) as Ref<User> });
		sender!.contacts!.push({
			contact: (ctx.req.user!.id as unknown) as Ref<User>,
		});

		await profile!.save();
		await sender!.save();

		return true;
	}

	@Mutation(() => Boolean)
	@UseMiddleware(protect)
	async removeContact(
		@Arg('userId') userId: string,
		@Ctx() ctx: MyContext
	): Promise<Boolean> {
		const profile = await ProfileModel.findOne({ user: ctx.req.user!.id });
		const contactProfile = await ProfileModel.findOne({ user: userId });

		if (
			!profile!.contacts!.some(
				(contact) => contact.contact!.toString() === userId.toString()
			)
		) {
			throw new ApolloError('contact not found');
		}

		profile!.contacts = profile!.contacts!.filter(
			(contact) => contact.contact!.toString() != userId.toString()
		);
		contactProfile!.contacts = contactProfile!.contacts!.filter(
			(contact) => contact.contact!.toString() != ctx.req.user!.id.toString()
		);

		await profile!.save();
		await contactProfile!.save();

		return true;
	}

	@Mutation(() => Boolean)
	@UseMiddleware(protect)
	async blockUser(
		@Arg('userId') userId: string,
		@Ctx() ctx: MyContext
	): Promise<Boolean> {
		const profile = await ProfileModel.findOne({ user: ctx.req.user!.id });
		const blockuser = await ProfileModel.findOne({ user: userId });

		if (!blockuser) {
			throw new ApolloError(`Resource not found with id of ${userId}`);
		}

		if (userId.toString() === ctx.req.user!.id.toString()) {
			throw new ApolloError('can not block self');
		}

		if (
			profile!.blocked!.some(
				(user) => user.user!.toString() === userId.toString()
			)
		) {
			throw new ApolloError('user already blocked');
		}

		if (
			profile!.contacts!.some(
				(contact) => contact.contact!.toString() === userId.toString()
			)
		) {
			profile!.contacts = profile!.contacts!.filter(
				(contact) => contact.contact!.toString() != userId.toString()
			);
			blockuser.contacts = blockuser.contacts!.filter(
				(contact) => contact.contact!.toString() != ctx.req.user!.id.toString()
			);

			await blockuser.save();
		}

		profile!.blocked!.push({ user: (userId as unknown) as Ref<User> });

		await profile!.save();

		return true;
	}

	@Mutation(() => Boolean)
	@UseMiddleware(protect)
	async unblockUser(
		@Arg('userId') userId: string,
		@Ctx() ctx: MyContext
	): Promise<Boolean> {
		const profile = await ProfileModel.findOne({ user: ctx.req.user!.id });
		const blockuser = await ProfileModel.findOne({ user: userId });

		if (!blockuser) {
			throw new ApolloError(`Resource not found with id of ${userId}`);
		}

		if (
			!profile!.blocked!.some(
				(user) => user.user!.toString() === userId.toString()
			)
		) {
			throw new ApolloError('user not in blocked list');
		}

		profile!.blocked = profile!.blocked!.filter(
			(block) => block.user!.toString() != userId.toString()
		);

		await profile!.save();
		return true;
	}
}
