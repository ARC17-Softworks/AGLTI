import { Ref } from '@typegoose/typegoose';
import { ApolloError } from 'apollo-server-express';
import { Arg, Ctx, Mutation, Resolver, UseMiddleware } from 'type-graphql';
import { PostionModel } from '../../entities/Position';
import { ProfileModel } from '../../entities/Profile';
import { ProjectModel } from '../../entities/Project';
import { User } from '../../entities/User';
import { protect } from '../../middleware/auth';
import { MyContext } from '../types/MyContext';
import mongoose from 'mongoose';

@Resolver()
export class JobHuntingResolver {
	@Mutation(() => Boolean)
	@UseMiddleware(protect)
	async apply(
		@Arg('positionId') positionId: string,
		@Ctx() ctx: MyContext
	): Promise<Boolean> {
		const profile = await ProfileModel.findOne({ user: ctx.req.user!.id });

		// check if user already part of a project
		if (profile!.activeProject) {
			throw new ApolloError(
				'cannot apply for position already part of a project'
			);
		}

		const position = await PostionModel.findById(positionId);

		// check if position exists
		if (!position) {
			throw new ApolloError(`Resource not found with id of ${positionId}`);
		}

		const project = await ProjectModel.findById(position.project);

		// check if position belongs to project
		if (
			!project!.openings!.some(
				(opening) => opening.position!.toString() === position.id.toString()
			)
		) {
			throw new ApolloError('position not part of project');
		}

		// check if user has required skills
		if (!position.skills.every((skill) => profile!.skills.includes(skill))) {
			throw new ApolloError('user does not have requred skills');
		}

		// check if already applied for this position
		if (
			project!.applicants!.some(
				(applicant) =>
					applicant.dev!.toString() === ctx.req.user!.id.toString() &&
					applicant.position!.toString() === position.id.toString()
			)
		) {
			throw new ApolloError('user already applied for this position');
		}

		// check if already offered this position
		if (
			project!.offered!.some(
				(offer) =>
					offer.dev!.toString() === ctx.req.user!.id.toString() &&
					offer.position!.toString() === position.id.toString()
			)
		) {
			throw new ApolloError('user already offered this position');
		}

		profile!.applied!.push({ position: position.id });
		project!.applicants!.push({
			dev: (ctx.req.user!.id as unknown) as Ref<User>,
			position: position.id,
		});
		await profile!.save();
		await project!.save();
		return true;
	}

	@Mutation(() => Boolean)
	@UseMiddleware(protect)
	async cancelApplication(
		@Arg('positionId') positionId: string,
		@Ctx() ctx: MyContext
	): Promise<Boolean> {
		const profile = await ProfileModel.findOne({ user: ctx.req.user!.id });
		if (
			!profile!.applied!.some(
				(application) =>
					application.position!.toString() === positionId.toString()
			)
		) {
			throw new ApolloError('application not found');
		}

		const position = await PostionModel.findById(positionId);

		// check if position exists
		if (!position) {
			throw new ApolloError(`Resource not found with id of ${positionId}`);
		}

		const project = await ProjectModel.findById(position.project);

		// check if position belongs to project
		if (
			!project!.openings!.some(
				(opening) => opening.position!.toString() === position.id.toString()
			)
		) {
			throw new ApolloError('position not part of project');
		}

		profile!.applied = profile!.applied!.filter(
			(application) => application.position!.toString() != positionId.toString()
		);
		project!.applicants = project!.applicants!.filter(
			(applicant) =>
				applicant.position!.toString() != positionId.toString() ||
				applicant.dev!.toString() != ctx.req.user!.id.toString()
		);

		await profile!.save();
		await project!.save();
		return true;
	}

	@Mutation(() => Boolean)
	@UseMiddleware(protect)
	async acceptOffer(
		@Arg('positionId') positionId: string,
		@Ctx() ctx: MyContext
	): Promise<Boolean> {
		const session = await mongoose.startSession();
		session.startTransaction();
		try {
			const profile = await ProfileModel.findOne({
				user: ctx.req.user!.id,
			}).session(session);
			const position = await PostionModel.findById(positionId).session(session);
			const project = await ProjectModel.findById(position!.project).session(
				session
			);

			// check if opening has been filled
			if (!position) {
				throw new Error('position unavalible');
			}

			if (position!.project!.toString() != project!.id.toString()) {
				throw new Error('position unavalible');
			}

			if (
				!project!.openings!.some(
					(opening) => opening.position!.toString() === positionId.toString()
				)
			) {
				throw new Error('position unavalible');
			}

			// check if project manager deleted application
			const application = profile!.offers!.find(
				(application) =>
					application.position!.toString() === positionId.toString()
			);

			if (!application) {
				throw new Error('offer missing');
			}

			const applicant = project!.offered!.find(
				(application) =>
					application.dev!.toString() === ctx.req.user!.id.toString() &&
					application.position!.toString() === position.id.toString()
			);

			if (!applicant) {
				throw new Error('offer missing');
			}

			// check if user availible
			if (profile!.activeProject) {
				throw new Error('user availible');
			}

			project!.members!.push({
				dev: (ctx.req.user!.id as unknown) as Ref<User>,
				title: position.title,
				skills: position.skills,
			});
			project!.offered = project!.offered!.filter(
				(offer) => offer != applicant
			);
			project!.openings = project!.openings!.filter(
				(opening) => opening.position!.toString() != position.id.toString()
			);

			// check if position has any more applicants then do the following:

			// (1)for each applicant of same position find profile and delete applied ref
			for (const app of project!.applicants!) {
				if (app.position!.toString() === applicant.position!.toString()) {
					const rejpro = await ProfileModel.findOne({ user: app.dev }).session(
						session
					);
					rejpro!.applied!.splice(
						rejpro!.applied!.findIndex(
							(a) => a.position!.toString() === positionId.toString()
						),
						1
					);
					await rejpro!.save();
				}
			}

			// (2)filter out applicants with taken position or applications of hired applicant
			project!.applicants = project!.applicants!.filter(
				(application) =>
					application.position!.toString() != applicant.position!.toString() &&
					application.dev!.toString() != applicant.dev!.toString()
			);

			// (3)for each offer with same position find profile and delete offer
			for (const offer of project!.offered) {
				if (offer.position!.toString() === applicant.position!.toString()) {
					const rejpro = await ProfileModel.findOne({
						user: offer.dev,
					}).session(session);
					rejpro!.offers!.splice(
						rejpro!.offers!.findIndex(
							(o) => o.position!.toString() === positionId.toString()
						),
						1
					);
					await rejpro!.save();
				}
			}

			// (4)filter out offer with taken position or offers to hired applicant
			project!.offered = project!.offered.filter(
				(offer) =>
					offer.position!.toString() != applicant.position!.toString() &&
					offer.dev!.toString() != applicant.dev!.toString()
			);

			// set active project of employee, delete offers and applications, add to project list
			profile!.activeProject = project!.id;
			const positionsRemove = profile!.applied!.concat(profile!.offers!);
			const projectsRemove: { project: string }[] = [];
			for (const x of positionsRemove) {
				const pos = await PostionModel.findById(x.position).session(session);
				const pro = await ProjectModel.findById(pos!.project).session(session);
				if (
					!projectsRemove.some(
						(y) => y.project.toString() === pro!.id.toString()
					) &&
					pro!.id.toString() != project!.id.toString()
				) {
					projectsRemove.push({ project: pro!.id });
				}
			}

			for (const proj of projectsRemove) {
				const rejproj = await ProjectModel.findById(proj.project).session(
					session
				);
				rejproj!.applicants = rejproj!.applicants!.filter(
					(a) => a.dev!.toString() != ctx.req.user!.id.toString()
				);
				rejproj!.offered = rejproj!.offered!.filter(
					(o) => o.dev!.toString() != ctx.req.user!.id.toString()
				);
				await rejproj!.save();
			}

			profile!.offers = [];
			profile!.applied = [];

			profile!.projects!.unshift({
				proj: project!.id,
				title: position.title,
				skills: position.skills,
			});

			await project!.save();
			// throw new Error('transaction check');
			await profile!.save();

			// delete position
			await PostionModel.findByIdAndDelete(positionId).session(session);
			await session.commitTransaction();
			return true;
		} catch (err) {
			await session.abortTransaction();
			console.error(err.message);
			console.log(err.stack.red);
			throw new ApolloError(`Server Error ${err.message}`);
		} finally {
			session.endSession();
		}
	}
}
