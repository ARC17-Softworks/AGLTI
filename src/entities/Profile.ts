import { ObjectType, Field, ID, InputType } from 'type-graphql';
import { prop, getModelForClass, Ref } from '@typegoose/typegoose';
import { User } from './User';
import { Project } from './Project';
import { Position } from './Position';
import { MessageThread } from './MessageThread';
import { Schema } from 'mongoose';

@ObjectType()
export class Projects {
	@Field(() => Project)
	@prop({ type: () => Project, ref: () => Project })
	proj!: Ref<Project>;

	@Field()
	@prop()
	title!: string;

	@Field(() => [String])
	@prop({ type: () => [String] })
	skills?: string[];
}

@ObjectType()
@InputType('ExperienceInput')
export class Experience {
	@Field(() => ID)
	id?: string;

	@Field()
	@prop({ trim: true, required: [true, 'please add your job title'] })
	title!: string;

	@Field()
	@prop({ trim: true, required: [true, 'please add the company name'] })
	company!: string;

	@Field({ nullable: true })
	@prop({ trim: true })
	location?: string;

	@Field()
	@prop({ required: [true, 'Please add a start date'] })
	from!: Date;

	@Field({ nullable: true })
	@prop()
	to?: Date;
}

@ObjectType()
@InputType('EducationInput')
export class Education {
	@Field(() => ID)
	id?: string;

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
	@prop()
	to?: Date;
}

@ObjectType()
@InputType('LinksInput')
export class Links {
	@Field({ nullable: true })
	@prop()
	youtube?: string;

	@Field({ nullable: true })
	@prop()
	github?: string;

	@Field({ nullable: true })
	@prop()
	hackerRank?: string;

	@Field({ nullable: true })
	@prop()
	dribble?: string;

	@Field({ nullable: true })
	@prop()
	linkedin?: string;

	@Field({ nullable: true })
	@prop()
	behance?: string;

	@Field({ nullable: true })
	@prop()
	vimeo?: string;

	@Field({ nullable: true })
	@prop()
	website?: string;
}

@ObjectType()
export class Offers {
	@Field(() => Position)
	@prop({ type: () => Position, ref: () => Position, required: true })
	position!: Ref<Position>;

	@Field({ nullable: true })
	@prop({ default: false })
	read!: boolean;
}

@ObjectType()
class Applied {
	@Field(() => Position)
	@prop({ type: () => Position, ref: () => Position, required: true })
	position!: Ref<Position>;
}

@ObjectType()
class Contact {
	@Field(() => User)
	@prop({ ref: () => User, required: true })
	contact!: Ref<User>;
}

@ObjectType()
class OutgoingRequest {
	@Field(() => User)
	@prop({ type: () => User, ref: () => User, required: true })
	user!: Ref<User>;
}

@ObjectType()
class IncomingRequest {
	@Field(() => User)
	@prop({ type: () => User, ref: () => User, required: true })
	user!: Ref<User>;

	@Field()
	@prop({ default: false })
	read!: boolean;
}

@ObjectType()
class Blocked {
	@Field(() => User)
	@prop({ type: () => User, ref: () => User, required: true })
	user!: Ref<User>;
}

@ObjectType()
class RecivedMessageThread {
	@Field(() => MessageThread)
	@prop({ type: () => MessageThread, ref: () => MessageThread, required: true })
	thread!: Ref<MessageThread>;

	@Field(() => User)
	@prop({ type: () => User, ref: () => User, required: true })
	with!: Ref<User>;

	@Field()
	@prop({ default: false })
	read!: boolean;
}

@ObjectType()
export class Mention {
	@Field(() => ID)
	@prop({ type: () => Schema.Types.ObjectId })
	post?: Schema.Types.ObjectId;

	@Field(() => ID, { nullable: true })
	@prop({ type: () => Schema.Types.ObjectId })
	comment?: Schema.Types.ObjectId;

	@Field()
	@prop({ default: false })
	read?: boolean;
}

@ObjectType()
export class Profile {
	@Field(() => ID)
	id!: string;

	@Field(() => User)
	@prop({ type: () => User, ref: () => User, required: true })
	user!: Ref<User>;

	@Field({ nullable: true })
	@prop({ trim: true })
	bio?: string;

	@Field({ nullable: true })
	@prop({ trim: true })
	location?: string;

	@Field(() => [String])
	@prop({ type: () => [String], required: [true, 'please add your skills'] })
	skills!: string[];

	@Field(() => [Projects], { nullable: true })
	@prop({ type: () => [Projects], _id: false })
	projects?: Projects[];

	@Field(() => [Experience], { nullable: true })
	@prop({ type: () => [Experience] })
	experience?: Experience[];

	@Field(() => [Education], { nullable: true })
	@prop({ type: () => [Education] })
	education?: Education[];

	@Field(() => Links)
	@prop({ type: () => Links })
	links?: Links;

	@Field(() => Project, { nullable: true })
	@prop({ type: () => Project, ref: () => Project })
	activeProject?: Ref<Project>;

	@Field(() => [Offers], { nullable: true })
	@prop({ type: () => [Offers], _id: false })
	offers?: Offers[];

	@Field(() => [Applied], { nullable: true })
	@prop({ type: () => [Applied], _id: false })
	applied?: Applied[];

	@Field(() => [Contact], { nullable: true })
	@prop({ type: () => [Contact], _id: false })
	contacts?: Contact[];

	@Field(() => [OutgoingRequest], { nullable: true })
	@prop({ type: () => [OutgoingRequest], _id: false })
	outgoingRequests?: OutgoingRequest[];

	@Field(() => [IncomingRequest], { nullable: true })
	@prop({ type: () => [IncomingRequest], _id: false })
	incomingRequests?: IncomingRequest[];

	@Field(() => [Blocked], { nullable: true })
	@prop({ type: () => [Blocked], _id: false })
	blocked?: Blocked[];

	@Field(() => [RecivedMessageThread], { nullable: true })
	@prop({ type: () => [RecivedMessageThread], _id: false })
	messages?: RecivedMessageThread[];

	@Field(() => [Mention], { nullable: true })
	@prop({ type: () => [Mention], _id: false })
	mentions?: Mention[];
}

export const ProfileModel = getModelForClass(Profile);
