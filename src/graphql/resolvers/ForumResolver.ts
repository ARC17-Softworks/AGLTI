import { DocumentType, Ref } from '@typegoose/typegoose';
import { ApolloError } from 'apollo-server-express';
import { Types } from 'mongoose';
import {
	Arg,
	Ctx,
	Mutation,
	// Query,
	Resolver,
	UseMiddleware,
} from 'type-graphql';
import { Post, Project, ProjectModel } from '../../entities/Project';
import { User } from '../../entities/User';
import { authorize, protect } from '../../middleware/auth';
import { PostInput } from '../types/InputTypes';
import { MyContext } from '../types/MyContext';

@Resolver()
export class ForumResolver {
	@Mutation(() => Boolean)
	@UseMiddleware(protect, authorize('BOTH'))
	async createPost(
		@Arg('input') { title, text }: PostInput,
		@Ctx() ctx: MyContext
	): Promise<Boolean> {
		const project = await ProjectModel.findById(ctx.req.project);

		project!.posts!.unshift({
			user: (ctx.req.user!.id as unknown) as Ref<User>,
			title,
			text,
		});

		await project!.save();
		return true;
	}

	@Mutation(() => Boolean)
	@UseMiddleware(protect, authorize('BOTH'))
	async deletePost(
		@Arg('postId') postId: string,
		@Ctx() ctx: MyContext
	): Promise<Boolean> {
		const project = await ProjectModel.findById(ctx.req.project);

		const delpost = ((((project!
			.posts! as Post[]) as unknown) as Types.DocumentArray<
			DocumentType<Project>
		>).id(postId) as unknown) as Post;

		if (!delpost) {
			throw new ApolloError(`Resource not found with id of ${postId}`);
		}

		// only user who posted or project manager can delete posts
		if (
			delpost!.user!.toString() != ctx.req.user!.id.toString() &&
			project!.owner!.toString() != ctx.req.user!.id.toString()
		) {
			throw new ApolloError('Not authorised to access this resource');
		}

		project!.posts = project!.posts!.filter(
			(post) => post!.id!.toString() != delpost!.id!.toString()
		);

		await project!.save();
		return true;
	}
}
