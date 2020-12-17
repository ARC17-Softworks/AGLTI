import { ObjectType, Field, ID } from 'type-graphql';
import { prop, getModelForClass, Ref } from '@typegoose/typegoose';
import { User } from './User';

@ObjectType()
class Message {
	@Field(() => User)
	@prop({ type: () => User, ref: () => User })
	from!: Ref<User>;

	@Field()
	@prop({ trim: true, required: [true, 'please add a message'] })
	text!: string;

	@Field()
	@prop({ default: Date.now })
	date?: Date;
}

@ObjectType()
export class MessageThread {
	@Field(() => ID)
	id!: string;

	@Field(() => [User])
	@prop({
		type: () => [User],
		ref: () => User,
		validate: {
			validator: (val) => val.length == 2,
			message: 'users array can only contain two people',
		},
	})
	users!: Ref<User>[];

	@Field(() => [Message])
	@prop({ type: () => [Message] })
	messages?: Message[];
}

export const MessageThreadModel = getModelForClass(MessageThread);
