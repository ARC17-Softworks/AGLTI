import { ObjectType, Field, ID } from 'type-graphql';
import { prop, getModelForClass, Ref } from '@typegoose/typegoose';
import { Project } from './Project';
import { User } from './User';

@ObjectType()
export class Review {
	@Field(() => Project)
	@prop({ type: () => Project, ref: () => Project })
	proj!: Ref<Project>;

	@Field(() => User)
	@prop({ type: () => User, ref: () => User, required: true })
	reviewer!: Ref<User>;
}

@ObjectType()
export class ProfileReview {
	@Field(() => ID)
	id!: string;

	@Field()
	@prop({ default: 4 })
	rating?: number;

	@Field(() => User)
	@prop({ type: () => User, ref: () => User, required: true })
	user!: Ref<User>;

	@Field(() => [Review], { nullable: true })
	@prop({ type: () => [Review], _id: false })
	reviews?: Review[];
}

export const ProfileReviewModel = getModelForClass(ProfileReview);
