import { ApolloError } from 'apollo-server-express';
import { Arg, Ctx, Mutation, Resolver, UseMiddleware } from 'type-graphql';
import { ProfileModel } from '../../entities/Profile';
import { protect } from '../../middleware/auth';
import { MyContext } from '../types/MyContext';
import { sendEmail } from '../../utils/sendEmail';

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
				cc: [process.env.REPORT_CC_ONE, process.env.REPORT_CC_TWO] as string[],
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
}
