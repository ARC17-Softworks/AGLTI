import { DocumentType, Ref } from '@typegoose/typegoose';
import { ApolloError } from 'apollo-server-express';
import { Types } from 'mongoose';
import {
	Arg,
	Ctx,
	Mutation,
	Query,
	Resolver,
	UseMiddleware,
} from 'type-graphql';
import { Comment, Post, Project, ProjectModel } from '../../entities/Project';
import { User } from '../../entities/User';
import { authorize, protect } from '../../middleware/auth';
import { PaginationInput, PostInput } from '../types/InputTypes';
import { MyContext } from '../types/MyContext';
import { Pagiantion, PostsResponse } from '../types/ResponseTypes';

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

	@Mutation(() => Boolean)
	@UseMiddleware(protect, authorize('BOTH'))
	async createComment(
		@Arg('postId') postId: string,
		@Arg('text') text: string,
		@Ctx() ctx: MyContext
	): Promise<Boolean> {
		const project = await ProjectModel.findById(ctx.req.project);

		const commpost = ((((project!
			.posts! as Post[]) as unknown) as Types.DocumentArray<
			DocumentType<Project>
		>).id(postId) as unknown) as Post;

		if (!commpost) {
			throw new ApolloError(`Resource not found with id of ${postId}`);
		}

		const postIndex = project!.posts!.findIndex(
			(post) => post.id!.toString() === postId.toString()
		);
		project!.posts![postIndex].comments!.push({
			user: (ctx.req.user!.id as unknown) as Ref<User>,
			text,
		});

		await project!.save();
		return true;
	}

	@Mutation(() => Boolean)
	@UseMiddleware(protect, authorize('BOTH'))
	async deleteComment(
		@Arg('postId') postId: string,
		@Arg('commentId') commentId: string,
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

		const delcomment = ((((delpost.comments! as Comment[]) as unknown) as Types.DocumentArray<
			DocumentType<Project>
		>).id(commentId) as unknown) as Comment;

		if (!delcomment) {
			throw new ApolloError(`Resource not found with id of ${commentId}`);
		}

		// only user who posted comment or project manager can delete comment
		if (
			delcomment!.user!.toString() != ctx.req.user!.id.toString() &&
			project!.owner!.toString() != ctx.req.user!.id.toString()
		) {
			throw new ApolloError('Not authorised to access this resource');
		}

		const postIndex = project!.posts!.findIndex(
			(post) => post.id!.toString() === postId.toString()
		);

		project!.posts![postIndex].comments = project!.posts![
			postIndex
		].comments!.filter(
			(comment) => comment.id!.toString() != delcomment.id!.toString()
		);

		await project!.save();

		return true;
	}

	@Query(() => PostsResponse)
	@UseMiddleware(protect, authorize('BOTH'))
	async getPosts(
		@Arg('input')
		{ page, limit }: PaginationInput,
		@Ctx() ctx: MyContext
	) {
		const project = await ProjectModel.findById(ctx.req.project)
			.select(
				'-_id -__v -owner -title -description -closed -openings -members -previousMembers -applicants -offered -tasks -posts.comments'
			)
			.populate('posts.user', 'id name avatar');

		let posts = project!.posts as Post[];

		// pagination
		const pagination: Pagiantion = {};
		if (!page) page = 1;
		if (!limit) limit = 20;
		const startIndex = (page - 1) * limit;
		const endIndex = page * limit;
		const total = posts!.length;

		posts = posts.slice(startIndex, endIndex);
		// posts = posts.map((post) => ({
		// 	_id: post.id,
		// 	user: post.user,
		// 	title: post.title,
		// 	text: post.text,
		// 	date: post.date,
		// }));

		if (endIndex < total) {
			pagination.next = {
				page: page + 1,
				limit,
			};
		}

		if (startIndex > 0) {
			pagination.prev = {
				page: page - 1,
				limit,
			};
		}

		pagination.pages = Math.ceil(total / limit);
		pagination.total = total;
		pagination.count = posts.length;

		return { posts, pagination };
	}
}
