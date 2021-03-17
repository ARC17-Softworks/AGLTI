import { ObjectType, Field, ID, InputType } from 'type-graphql';
import { prop, getModelForClass, Ref } from '@typegoose/typegoose';
import { Project } from './Project';
import { User } from './User';
import { Schema } from 'mongoose';

@ObjectType()
export class Review {
	@Field()
	@prop()
	rating!: number;

	@Field(() => Project)
	@prop({ type: () => Project, ref: () => Project })
	proj!: Ref<Project>;

	@Field(() => User)
	@prop({ type: () => User, ref: () => User, required: true })
	reviewer!: Ref<User>;
}

@ObjectType()
export class ProfileReviews {
	@Field()
	@prop({ default: 4 })
	totalScore?: number;

	@Field()
	@prop()
	averageRating?: number;

	@Field(() => User)
	@prop({ type: () => User, ref: () => User, required: true })
	user!: Ref<User>;

	@Field(() => [Review], { nullable: true })
	@prop({ type: () => [Review], _id: false })
	reviews?: Review[];
}
