import { ObjectType, Field, ID } from 'type-graphql';
import { prop, getModelForClass, Ref } from '@typegoose/typegoose';
import { User } from './User';
import { Project } from './Project';
import { Position } from './Position';
import { MessageThread } from './MessageThread';
import { Schema } from 'mongoose';

@ObjectType()
class Projects {
	@Field()
	@prop({ type: () => Project, ref: () => Project })
	proj!: Ref<User>;

	@Field()
	@prop()
	title!: string;

	@Field()
	@prop()
	skills!: string[];
}

@ObjectType()
class Experience {
	@Field()
	@prop({ trim: true, required: [true, 'please add your job title'] })
	title!: string;

	@Field()
	@prop({ trim: true, required: [true, 'please add the company name'] })
	company!: string;

	@Field()
	@prop({ trim: true })
	location?: string;

	@Field()
	@prop({ required: [true, 'Please add a start date'] })
	from!: Date;

	@Field()
	@prop({})
	to?: Date;
}

@ObjectType()
class Education {
	@Field()
	@prop({ trim: true, required: [true, 'please add a school name'] })
	school!: string;

	@Field()
	@prop({ trim: true, required: [true, 'please add degree name'] })
	degree!: string;

	@Field()
	@prop({ required: [true, 'Please add a start date'] })
	from!: Date;

	@Field()
	@prop({})
	to?: Date;
}

@ObjectType()
class Offers {
	@Field()
	@prop({ type: () => Position, ref: () => Position, required: true })
	position!: Ref<Position>;

	@Field()
	@prop({ default: false })
	read!: boolean;
}

@ObjectType()
class Applied {
	@Field()
	@prop({ type: () => Position, ref: () => Position, required: true })
	position!: Ref<Position>;
}

@ObjectType()
class Contact {
	@Field()
	@prop({ ref: () => User, required: true })
	contact!: Ref<User>;
}

@ObjectType()
class OutgoingRequest {
	@Field()
	@prop({ type: () => User, ref: () => User, required: true })
	user!: Ref<User>;
}

@ObjectType()
class IncomingRequest {
	@Field()
	@prop({ type: () => User, ref: () => User, required: true })
	user!: Ref<User>;

	@Field()
	@prop({ default: false })
	read!: boolean;
}

@ObjectType()
class Blocked {
	@Field()
	@prop({ type: () => User, ref: () => User, required: true })
	user!: Ref<User>;
}

@ObjectType()
class Message {
	@Field()
	@prop({ type: () => MessageThread, ref: () => MessageThread, required: true })
	thread!: Ref<MessageThread>;

	@Field()
	@prop({ type: () => User, ref: () => User, required: true })
	with!: Ref<User>;

	@Field()
	@prop({ default: false })
	read!: boolean;
}

@ObjectType()
class Mention {
	@Field()
	@prop()
	post?: Schema.Types.ObjectId;

	@Field()
	@prop()
	comment?: Schema.Types.ObjectId;

	@Field()
	@prop({ default: false })
	read!: boolean;
}

@ObjectType()
export class Profile {
	@Field(() => ID)
	id!: string;

	@Field()
	@prop({ type: () => User, ref: () => User, required: true })
	user!: Ref<User>;

	@Field()
	@prop({ trim: true })
	bio?: string;

	@Field()
	@prop({ trim: true })
	location?: string;

	@Field()
	@prop({ required: [true, 'please add your skills'] })
	skills!: string[];

	@Field()
	@prop({ type: Projects, _id: false })
	projects?: Projects[];

	@Field()
	@prop({ type: Experience })
	experience?: Experience[];

	@Field()
	@prop({ type: Education })
	education?: Education[];

	@Field()
	@prop()
	links?: {
		youtube?: string;
		github?: string;
		hackerRank?: string;
		dribble?: string;
		linkedin?: string;
		behance?: string;
		vimeo?: string;
		website?: string;
	};

	@Field()
	@prop({ type: () => Project, ref: () => Project })
	activeProject?: Ref<Project>;

	@Field()
	@prop({ type: Offers, _id: false })
	offers?: Offers[];

	@Field()
	@prop({ type: Applied, _id: false })
	applied?: Applied[];

	@Field()
	@prop({ type: Contact, _id: false })
	contacts?: Contact[];

	@Field()
	@prop({ type: OutgoingRequest, _id: false })
	outgoingRequests?: OutgoingRequest[];

	@Field()
	@prop({ type: IncomingRequest, _id: false })
	incomingRequests?: IncomingRequest[];

	@Field()
	@prop({ type: Blocked, _id: false })
	blocked?: Blocked[];

	@Field()
	@prop({ type: Message, _id: false })
	messages?: Message[];

	@Field()
	@prop({ type: Mention, _id: false })
	mentions?: Mention[];
}

export const ProfileModel = getModelForClass(Profile);
