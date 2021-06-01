import { Field, InputType } from 'type-graphql';
import { MinLength, IsEmail } from 'class-validator';
import { Links } from '../../entities/Profile';

@InputType()
export class RegisterInput {
	@Field()
	name?: string;

	@Field()
	@IsEmail()
	email!: string;

	@Field()
	@MinLength(6)
	password!: string;
}

@InputType()
export class AuthInput {
	@Field()
	@IsEmail()
	email!: string;

	@Field()
	@MinLength(6)
	password!: string;
}

@InputType()
export class ProfileInput {
	@Field({ nullable: true })
	name?: string;

	@Field({ nullable: true })
	bio?: string;

	@Field({ nullable: true })
	location?: string;

	@Field(() => [String])
	skills!: string[];

	@Field(() => Links, { nullable: true })
	links?: Links;
}

@InputType()
export class PaginationInput {
	@Field({ nullable: true })
	page?: number;

	@Field({ nullable: true })
	limit?: number;
}

@InputType()
export class PositionInput {
	@Field()
	title!: string;

	@Field(() => [String])
	skills!: string[];

	@Field()
	description!: string;
}

@InputType()
export class DevSearchInput extends PaginationInput {
	@Field()
	positionId!: string;
}

@InputType()
export class PositionSearchInput extends PaginationInput {
	@Field(() => [String], { nullable: true })
	qskills?: string[];
}

@InputType()
export class PostInput {
	@Field()
	title!: string;

	@Field()
	text!: string;
}

@InputType()
export class MentionInput {
	@Field()
	postId!: string;

	@Field({ nullable: true })
	commentId?: string;

	@Field()
	userId!: string;
}

@InputType()
export class TaskInput {
	@Field()
	userId!: string;

	@Field()
	title!: string;

	@Field()
	description!: string;

	@Field({ nullable: true })
	startDate?: Date;

	@Field({ nullable: true })
	dueDate?: Date;
}
