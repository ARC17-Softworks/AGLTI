import { ApolloError } from 'apollo-server-express';
import { Arg, Ctx, Mutation, Resolver, UseMiddleware } from 'type-graphql';
import { ProfileModel } from '../../entities/Profile';
import { protect } from '../../middleware/auth';
import { MyContext } from '../types/MyContext';
import { sendEmail } from '../../utils/sendEmail';
import { ProjectModel } from '../../entities/Project';

@Resolver()
export class ReportResolver {
	@Mutation(() => Boolean)
	@UseMiddleware(protect)
	async reportUser(
		@Arg('userId')
		userId: string,
		@Arg('reason')
		reason: string,
		@Ctx() ctx: MyContext
	): Promise<Boolean> {
		const reported = await ProfileModel.findOne({ user: userId });
		if (!reported) {
			throw new ApolloError(`Resource not found with id of ${userId}`);
		}

		if (userId.toString() === ctx.req.user!.id.toString()) {
			throw new ApolloError(`can not report self`);
		}

		try {
			await sendEmail({
				email: process.env.REPORT_EMAIL as string,
				bcc: [
					process.env.REPORT_BCC_ONE,
					process.env.REPORT_BCC_TWO,
					process.env.REPORT_BCC_THREE,
				] as string[],
				subject: 'User Report',
				title: 'User Reported',
				body: `reporter: ${ctx.req.user!.id}<br>
				reported: ${userId}<br>
				reason: ${reason}`,
				link: '#',
				linkName: '',
			});
		} catch (err) {
			console.log(err);
			throw new ApolloError('email could not be sent');
		}
		return true;
	}

	@Mutation(() => Boolean)
	@UseMiddleware(protect)
	async reportProject(
		@Arg('projectId')
		projectId: string,
		@Arg('reason')
		reason: string,
		@Ctx() ctx: MyContext
	): Promise<Boolean> {
		const reported = await ProjectModel.findById(projectId);
		if (!reported) {
			throw new ApolloError(`Resource not found with id of ${projectId}`);
		}

		if (reported.owner!.toString() === ctx.req.user!.id.toString()) {
			throw new ApolloError(`can not report own project`);
		}

		try {
			await sendEmail({
				email: process.env.REPORT_EMAIL as string,
				bcc: [
					process.env.REPORT_BCC_ONE,
					process.env.REPORT_BCC_TWO,
					process.env.REPORT_BCC_THREE,
				] as string[],
				subject: 'Project Report',
				title: 'Project Report',
				body: `reporter: ${ctx.req.user!.id}<br>
				reported: ${projectId}<br>
				reason: ${reason}`,
				link: '#',
				linkName: '',
			});
		} catch (err) {
			console.log(err);
			throw new ApolloError('email could not be sent');
		}
		return true;
	}
}
