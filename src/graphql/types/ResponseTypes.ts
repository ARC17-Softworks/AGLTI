import { ObjectType, Field } from 'type-graphql';
import { Position } from '../../entities/Position';
import { Profile, Projects } from '../../entities/Profile';
import { Post, Project } from '../../entities/Project';
import { User } from '../../entities/User';

@ObjectType()
export class UserResponse {
	@Field(() => User, { nullable: true })
	user?: User;
}

@ObjectType()
export class ProfileResponse {
	@Field(() => Profile, { nullable: true })
	profile?: Profile;
}

@ObjectType()
export class PagiantionPage {
	@Field()
	page?: number;

	@Field()
	limit?: number;
}

@ObjectType()
export class Pagiantion {
	@Field()
	pages?: number;

	@Field(() => PagiantionPage, { nullable: true })
	next?: PagiantionPage;

	@Field(() => PagiantionPage, { nullable: true })
	prev?: PagiantionPage;

	@Field()
	total?: number;

	@Field()
	count?: number;
}

@ObjectType()
export class ProjectsResponse {
	@Field(() => [Projects], { nullable: true })
	projects?: Projects[];

	@Field(() => Pagiantion, { nullable: true })
	pagination?: Pagiantion;
}

@ObjectType()
export class ProjectResponse {
	@Field(() => Project)
	project!: Project;
}

@ObjectType()
export class ProfilesResponse {
	@Field(() => Position)
	position!: Position;

	@Field(() => [Profile], { nullable: true })
	profiles?: Profile[];

	@Field(() => Pagiantion, { nullable: true })
	pagination?: Pagiantion;
}

@ObjectType()
export class PositionsResponse {
	@Field(() => [String])
	qskills!: string[];

	@Field(() => [Position], { nullable: true })
	positions?: Position[];

	@Field(() => Pagiantion, { nullable: true })
	pagination?: Pagiantion;
}

@ObjectType()
export class Repository {
	@Field(() => String)
	name!: string;
}

@ObjectType()
export class RepositoriesResponse {
	@Field(() => [Repository])
	repositories!: Repository[];
}

@ObjectType()
export class PostsResponse {
	@Field(() => [Post], { nullable: true })
	posts?: Post[];

	@Field(() => Pagiantion, { nullable: true })
	pagination?: Pagiantion;
}
