import { Ref } from '@typegoose/typegoose';
import { ApolloError } from 'apollo-server-express';
import { Arg, Ctx, Mutation, Resolver, UseMiddleware } from 'type-graphql';
import { PostionModel } from '../../entities/Position';
import { Offers, ProfileModel } from '../../entities/Profile';
import { ProjectModel } from '../../entities/Project';
import { User } from '../../entities/User';
import { protect, authorize } from '../../middleware/auth';
import { MyContext } from '../types/MyContext';
import mongoose from 'mongoose';

@Resolver()
export class HiringResolver {
	@Mutation(() => Boolean)
	@UseMiddleware(protect, authorize('OWNER'))
	async offer(
		@Arg('positionId') positionId: string,
		@Arg('userId') userId: string,
		@Ctx() ctx: MyContext
	): Promise<Boolean> {
		const project = await ProjectModel.findById(ctx.req.project);
		const position = await PostionModel.findById(positionId);
		const profile = await ProfileModel.findOne({ user: userId });

		// check if user already part of a project
		if (profile!.activeProject) {
			throw new ApolloError(
				'cannot offer position user already part of a project'
			);
		}

		// check if position exists
		if (!position) {
			throw new ApolloError(`Resource not found with id of ${positionId}`);
		}

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
					applicant.dev!.toString() === userId.toString() &&
					applicant.position!.toString() === position.id.toString()
			)
		) {
			throw new ApolloError('user already applied for this position');
		}

		// check if already offered this position
		if (
			project!.offered!.some(
				(offer) =>
					offer.dev!.toString() === userId.toString() &&
					offer.position!.toString() === position.id.toString()
			)
		) {
			throw new ApolloError('user already offered this position');
		}

		profile!.offers!.push({ position: position.id } as Offers);
		project!.offered!.push({
			dev: (userId as unknown) as Ref<User>,
			position: position.id,
		});
		await profile!.save();
		await project!.save();
		return true;
	}

	@Mutation(() => Boolean)
	@UseMiddleware(protect, authorize('OWNER'))
	async cancelOffer(
		@Arg('positionId') positionId: string,
		@Arg('userId') userId: string,
		@Ctx() ctx: MyContext
	): Promise<Boolean> {
		const project = await ProjectModel.findById(ctx.req.project);
		const profile = await ProfileModel.findOne({ user: userId });
		const position = await PostionModel.findById(positionId);
		if (
			!project!.offered!.some(
				(offer) =>
					offer.position!.toString() === positionId.toString() &&
					offer.dev!.toString() === userId.toString()
			)
		) {
			throw new ApolloError('offer not found');
		}

		// check if position exists
		if (!position) {
			throw new ApolloError(`Resource not found with id of ${positionId}`);
		}

		// check if position belongs to project
		if (
			!project!.openings!.some(
				(opening) => opening.position!.toString() === position.id.toString()
			)
		) {
			throw new ApolloError('position not part of project');
		}

		profile!.offers = profile!.offers!.filter(
			(offer) => offer.position!.toString() != positionId.toString()
		);
		project!.offered = project!.offered!.filter(
			(offer) =>
				offer.position!.toString() != positionId.toString() ||
				offer.dev!.toString() != userId.toString()
		);

		await profile!.save();
		await project!.save();
		return true;
	}

	@Mutation(() => Boolean)
	@UseMiddleware(protect, authorize('OWNER'))
	async acceptApplication(
		@Arg('positionId') positionId: string,
		@Arg('userId') userId: string,
		@Ctx() ctx: MyContext
	): Promise<Boolean> {
		const session = await mongoose.startSession();
		session.startTransaction();
		try {
			const project = await ProjectModel.findById(ctx.req.project).session(
				session
			);
			const position = await PostionModel.findById(positionId).session(session);
			const profile = await ProfileModel.findOne({
				user: userId,
			}).session(session);

			// check if opening has been filled
			if (!position) {
				throw new Error('position unavalible');
			}

			if (position!.project!.toString() != ctx.req.project!.toString()) {
				throw new Error('position unavalible');
			}

			if (
				!project!.openings!.some(
					(opening) => opening.position!.toString() === positionId.toString()
				)
			) {
				throw new Error('position unavalible');
			}

			// check if applicant deleted application
			const application = profile!.applied!.find(
				(application) =>
					application.position!.toString() === positionId.toString()
			);

			if (!application) {
				throw new Error('application missing');
			}

			const applicant = project!.applicants!.find(
				(application) =>
					application.dev!.toString() === userId.toString() &&
					application.position!.toString() === position.id.toString()
			);

			if (!applicant) {
				throw new Error('application missing');
			}

			// check if applicant employed
			if (profile!.activeProject) {
				throw new Error('applicant found another job');
			}

			project!.members!.push({
				dev: (userId as unknown) as Ref<User>,
				title: position.title,
				skills: position.skills,
			});
			project!.applicants = project!.applicants!.filter(
				(app) => app != applicant
			);
			project!.openings = project!.openings!.filter(
				(opening) => opening.position!.toString() != position.id.toString()
			);

			// check if position has any more applicants then do the following:

			// (1)for each applicant of same position find profile and delete applied ref
			for (const app of project!.applicants) {
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
			project!.applicants = project!.applicants.filter(
				(application) =>
					application.position!.toString() != applicant.position!.toString() &&
					application.dev!.toString() != applicant.dev!.toString()
			);

			// (3)for each offer with same position find profile and delete offer
			for (const offer of project!.offered!) {
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
			project!.offered = project!.offered!.filter(
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
					(a) => a.dev!.toString() != userId.toString()
				);
				rejproj!.offered = rejproj!.offered!.filter(
					(o) => o.dev!.toString() != userId.toString()
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
