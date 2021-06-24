import { DocumentType, Ref } from '@typegoose/typegoose';
import { ApolloError } from 'apollo-server-express';
import { Schema } from 'mongoose';
import { Types } from 'mongoose';
import {
	Arg,
	Ctx,
	Mutation,
	Query,
	Resolver,
	UseMiddleware,
} from 'type-graphql';
import { Mention, ProfileModel } from '../../entities/Profile';
import {
	Comment,
	Post,
	Project,
	ProjectModel,
	Task,
} from '../../entities/Project';
import { User } from '../../entities/User';
import { authorize, protect } from '../../middleware/auth';
import { MentionInput, PaginationInput, PostInput } from '../types/InputTypes';
import { MyContext } from '../types/MyContext';
import {
	CommentResponse,
	Pagiantion,
	PostResponse,
	PostsResponse,
} from '../types/ResponseTypes';

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
			user: ctx.req.user!.id as unknown as Ref<User>,
			title,
			text,
		});

		await project!.save();
		return true;
	}

	@Mutation(() => Boolean)
	@UseMiddleware(protect, authorize('BOTH'))
	async editPost(
		@Arg('postId') postId: string,
		@Arg('text') text: string,
		@Ctx() ctx: MyContext
	): Promise<Boolean> {
		const project = await ProjectModel.findById(ctx.req.project);

		const editpost = (
			project!.posts! as Post[] as unknown as Types.DocumentArray<
				DocumentType<Project>
			>
		).id(postId) as unknown as Post;

		if (!editpost) {
			throw new ApolloError(`Resource not found with id of ${postId}`);
		}

		// only user who posted can edit posts
		if (editpost!.user!.toString() != ctx.req.user!.id.toString()) {
			throw new ApolloError('Not authorised to access this resource');
		}

		const postIndex = project!.posts!.findIndex(
			(post) => post.id!.toString() === postId.toString()
		);

		project!.posts![postIndex].text = text;
		project!.posts![postIndex].edited = true;
		project!.posts![postIndex].date = new Date();

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

		const delpost = (
			project!.posts! as Post[] as unknown as Types.DocumentArray<
				DocumentType<Project>
			>
		).id(postId) as unknown as Post;

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

		const commpost = (
			project!.posts! as Post[] as unknown as Types.DocumentArray<
				DocumentType<Project>
			>
		).id(postId) as unknown as Post;

		if (!commpost) {
			throw new ApolloError(`Resource not found with id of ${postId}`);
		}

		const postIndex = project!.posts!.findIndex(
			(post) => post.id!.toString() === postId.toString()
		);
		project!.posts![postIndex].comments!.push({
			user: ctx.req.user!.id as unknown as Ref<User>,
			text,
		});

		project!.posts![postIndex].commentCount! += 1;

		// move post to top
		project!.posts!.splice(postIndex, 1);
		project!.posts!.unshift(commpost);

		await project!.save();
		return true;
	}

	@Mutation(() => Boolean)
	@UseMiddleware(protect, authorize('BOTH'))
	async editComment(
		@Arg('postId') postId: string,
		@Arg('commentId') commentId: string,
		@Arg('text') text: string,
		@Ctx() ctx: MyContext
	): Promise<Boolean> {
		const project = await ProjectModel.findById(ctx.req.project);

		const editpost = (
			project!.posts! as Post[] as unknown as Types.DocumentArray<
				DocumentType<Project>
			>
		).id(postId) as unknown as Post;

		if (!editpost) {
			throw new ApolloError(`Resource not found with id of ${postId}`);
		}

		const editcomment = (
			editpost.comments! as Comment[] as unknown as Types.DocumentArray<
				DocumentType<Project>
			>
		).id(commentId) as unknown as Comment;

		if (!editcomment) {
			throw new ApolloError(`Resource not found with id of ${commentId}`);
		}

		// only user who posted can edit posts
		if (editcomment!.user!.toString() != ctx.req.user!.id.toString()) {
			throw new ApolloError('Not authorised to access this resource');
		}

		const postIndex = project!.posts!.findIndex(
			(post) => post.id!.toString() === postId.toString()
		);

		const commentIndex = project!.posts![postIndex].comments!.findIndex(
			(comment) => comment.id!.toString() === commentId.toString()
		);

		project!.posts![postIndex].comments![commentIndex].text = text;
		project!.posts![postIndex].comments![commentIndex].edited = true;
		project!.posts![postIndex].comments![commentIndex].date = new Date();

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

		const delpost = (
			project!.posts! as Post[] as unknown as Types.DocumentArray<
				DocumentType<Project>
			>
		).id(postId) as unknown as Post;

		if (!delpost) {
			throw new ApolloError(`Resource not found with id of ${postId}`);
		}

		const delcomment = (
			delpost.comments! as Comment[] as unknown as Types.DocumentArray<
				DocumentType<Project>
			>
		).id(commentId) as unknown as Comment;

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

		project!.posts![postIndex].commentCount! -= 1;

		await project!.save();

		return true;
	}

	@Mutation(() => Boolean)
	@UseMiddleware(protect, authorize('BOTH'))
	async createTaskComment(
		@Arg('taskId') taskId: string,
		@Arg('text') text: string,
		@Ctx() ctx: MyContext
	): Promise<Boolean> {
		const project = await ProjectModel.findById(ctx.req.project);

		const commTask = (
			project!.tasks! as Task[] as unknown as Types.DocumentArray<
				DocumentType<Project>
			>
		).id(taskId) as unknown as Task;

		if (!commTask) {
			throw new ApolloError(`Resource not found with id of ${taskId}`);
		}

		const taskIndex = project!.tasks!.findIndex(
			(post) => post.id!.toString() === taskId.toString()
		);
		project!.tasks![taskIndex].comments!.push({
			user: ctx.req.user!.id as unknown as Ref<User>,
			text,
		});

		await project!.save();
		return true;
	}

	@Mutation(() => Boolean)
	@UseMiddleware(protect, authorize('BOTH'))
	async editTaskComment(
		@Arg('taskId') taskId: string,
		@Arg('commentId') commentId: string,
		@Arg('text') text: string,
		@Ctx() ctx: MyContext
	): Promise<Boolean> {
		const project = await ProjectModel.findById(ctx.req.project);

		const edittask = (
			project!.tasks! as Task[] as unknown as Types.DocumentArray<
				DocumentType<Project>
			>
		).id(taskId) as unknown as Task;

		if (!edittask) {
			throw new ApolloError(`Resource not found with id of ${taskId}`);
		}

		const editcomment = (
			edittask.comments! as Comment[] as unknown as Types.DocumentArray<
				DocumentType<Project>
			>
		).id(commentId) as unknown as Comment;

		if (!editcomment) {
			throw new ApolloError(`Resource not found with id of ${commentId}`);
		}

		// only user who posted can edit tasks
		if (editcomment!.user!.toString() != ctx.req.user!.id.toString()) {
			throw new ApolloError('Not authorised to access this resource');
		}

		const taskIndex = project!.tasks!.findIndex(
			(post) => post.id!.toString() === taskId.toString()
		);

		const commentIndex = project!.tasks![taskIndex].comments!.findIndex(
			(comment) => comment.id!.toString() === commentId.toString()
		);

		project!.tasks![taskIndex].comments![commentIndex].text = text;
		project!.tasks![taskIndex].comments![commentIndex].edited = true;
		project!.tasks![taskIndex].comments![commentIndex].date = new Date();

		await project!.save();
		return true;
	}

	@Mutation(() => Boolean)
	@UseMiddleware(protect, authorize('BOTH'))
	async deleteTaskComment(
		@Arg('taskId') taskId: string,
		@Arg('commentId') commentId: string,
		@Ctx() ctx: MyContext
	): Promise<Boolean> {
		const project = await ProjectModel.findById(ctx.req.project);

		const delTask = (
			project!.tasks! as Task[] as unknown as Types.DocumentArray<
				DocumentType<Project>
			>
		).id(taskId) as unknown as Task;

		if (!delTask) {
			throw new ApolloError(`Resource not found with id of ${taskId}`);
		}

		const delcomment = (
			delTask.comments! as Comment[] as unknown as Types.DocumentArray<
				DocumentType<Project>
			>
		).id(commentId) as unknown as Comment;

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

		const taskIndex = project!.tasks!.findIndex(
			(post) => post.id!.toString() === taskId.toString()
		);

		project!.tasks![taskIndex].comments = project!.tasks![
			taskIndex
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
	): Promise<PostsResponse> {
		const project = await ProjectModel.findById(ctx.req.project)
			.select(
				'-_id -__v -owner -title -description -closed -openings -previousMembers -applicants -offered -tasks -posts.comments'
			)
			.populate('posts.user', 'id name avatar')
			.populate('members.dev', 'id');

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

		return { posts, members: project!.members!, pagination };
	}

	@Query(() => PostResponse)
	@UseMiddleware(protect, authorize('BOTH'))
	async getPost(
		@Arg('postId')
		postId: string,
		@Ctx() ctx: MyContext
	): Promise<PostResponse> {
		let project = await ProjectModel.findById(ctx.req.project)
			.select('posts members')
			.populate('posts.user', 'id name avatar')
			.populate('posts.comments.user', 'id name avatar')
			.populate('members.dev', 'id');
		const post = (
			project!.posts! as Post[] as unknown as Types.DocumentArray<
				DocumentType<Project>
			>
		).id(postId) as unknown as Post;

		if (!post) {
			throw new ApolloError(`Resource not found with id of ${postId}`);
		}

		return { post, members: project!.members! };
	}

	@Query(() => CommentResponse)
	@UseMiddleware(protect, authorize('BOTH'))
	async getComment(
		@Arg('postId') postId: string,
		@Arg('commentId') commentId: string,
		@Ctx() ctx: MyContext
	) {
		const project = await ProjectModel.findById(ctx.req.project)
			.select('posts')
			.populate('posts.comments.user', 'id name avatar');

		const post = (
			project!.posts! as Post[] as unknown as Types.DocumentArray<
				DocumentType<Project>
			>
		).id(postId) as unknown as Post;

		if (!post) {
			throw new ApolloError(`Resource not found with id of ${postId}`);
		}

		const comment = (
			post.comments! as Comment[] as unknown as Types.DocumentArray<
				DocumentType<Project>
			>
		).id(commentId) as unknown as Comment;

		if (!comment) {
			throw new ApolloError(`Resource not found with id of ${commentId}`);
		}

		return { comment };
	}

	@Mutation(() => Boolean)
	@UseMiddleware(protect, authorize('BOTH'))
	async notifyMention(
		@Arg('input') { postId, commentId, userId }: MentionInput,
		@Ctx() ctx: MyContext
	): Promise<Boolean> {
		const project = await ProjectModel.findById(ctx.req.project).select(
			'members posts'
		);
		const profile = await ProfileModel.findOne({ user: userId });
		if (!profile) {
			throw new ApolloError(`Resource not found with id of ${userId}`);
		}

		if (
			!project!.members!.some(
				(member) => member.dev!.toString() === userId.toString()
			)
		) {
			throw new ApolloError('user not member of project');
		}

		const post = (
			project!.posts! as Post[] as unknown as Types.DocumentArray<
				DocumentType<Project>
			>
		).id(postId) as unknown as Post;

		if (!post) {
			throw new ApolloError(`Resource not found with id of ${postId}`);
		}

		const mention: Mention = {
			post: post.id as unknown as Schema.Types.ObjectId,
		};

		if (commentId) {
			const comment = (
				post.comments! as Comment[] as unknown as Types.DocumentArray<
					DocumentType<Project>
				>
			).id(commentId) as unknown as Comment;

			if (!comment) {
				throw new ApolloError(`Resource not found with id of ${commentId}`);
			}
			mention.comment = comment.id as unknown as Schema.Types.ObjectId;
		}

		profile.mentions!.push(mention);
		await profile.save();
		return true;
	}
}
