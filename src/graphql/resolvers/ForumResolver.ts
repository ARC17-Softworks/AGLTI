import { Ref } from '@typegoose/typegoose';
import {
	Arg,
	Ctx,
	Mutation,
	// Query,
	Resolver,
	UseMiddleware,
} from 'type-graphql';
import { ProjectModel } from '../../entities/Project';
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
}
