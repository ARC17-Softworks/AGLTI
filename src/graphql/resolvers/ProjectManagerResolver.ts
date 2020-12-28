import { ApolloError } from 'apollo-server-express';
import { Schema } from 'mongoose';
import { Arg, Ctx, Mutation, Resolver, UseMiddleware } from 'type-graphql';
import { PostionModel } from '../../entities/Position';
import { ProfileModel } from '../../entities/Profile';
import { Project, ProjectModel, Task } from '../../entities/Project';
import { authorize, protect } from '../../middleware/auth';
import { PositionInput } from '../types/InputTypes';
import { MyContext } from '../types/MyContext';
import mongoose from 'mongoose';
import { DocumentType, Ref } from '@typegoose/typegoose';
import { User } from '../../entities/User';
import { Types } from 'mongoose';

@Resolver()
export class ProjectManagerResolver {
	@Mutation(() => Boolean)
	@UseMiddleware(protect)
	async createProject(
		@Arg('title') title: string,
		@Arg('description') description: string,
		@Ctx() ctx: MyContext
	): Promise<Boolean> {
		try {
			const profile = await ProfileModel.findOne({ user: ctx.req.user!.id });
			if (profile!.activeProject) {
				throw new ApolloError('cannot create project while in a project');
			}

			const project = await ProjectModel.create({
				owner: ctx.req.user!.id,
				title,
				description,
			});

			profile!.projects!.unshift({
				proj: project.id,
				title: 'Project Manager',
			});

			// set active project of PM, delete offers and applications, add to project list

			profile!.activeProject = project.id;
			const positionsRemove = profile!.applied!.concat(profile!.offers!);
			const projectsRemove: { project: Schema.Types.ObjectId }[] = [];
			for (const x of positionsRemove) {
				const pos = await PostionModel.findById(x.position);
				const pro = await ProjectModel.findById(pos!.project);
				if (
					!projectsRemove.some(
						(y) => y.project.toString() === pro!.id.toString()
					) &&
					pro!.id.toString() != project.id.toString()
				) {
					projectsRemove.push({ project: pro!.id });
				}
			}

			for (const proj of projectsRemove) {
				const rejproj = await ProjectModel.findById(proj.project);
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
			await profile!.save();
		} catch (err) {
			console.log(err.message);
			throw new ApolloError(`project creation failed: ${err.message}`);
		}
		return true;
	}

	@Mutation(() => Boolean)
	@UseMiddleware(protect, authorize('OWNER'))
	async addPosition(
		@Arg('input') { title, description, skills }: PositionInput,
		@Ctx() ctx: MyContext
	): Promise<Boolean> {
		try {
			const project = await ProjectModel.findById(ctx.req.project);

			if (project!.openings!.length + project!.members!.length > 9) {
				throw new ApolloError(
					'developer limit reached cannot create any more positions'
				);
			}
			const position = await PostionModel.create({
				project: project!.id,
				skills,
				title,
				description,
			});

			project!.openings!.push({ position: position.id });
			await project!.save();
		} catch (err) {
			console.log(err.message);
			throw new ApolloError(`project creation failed: ${err.message}`);
		}
		return true;
	}

	@Mutation(() => Boolean)
	@UseMiddleware(protect, authorize('OWNER'))
	async removePosition(
		@Arg('positionId') positionId: string,
		@Ctx() ctx: MyContext
	): Promise<Boolean> {
		const session = await mongoose.startSession();
		session.startTransaction();
		try {
			const project = await ProjectModel.findById(ctx.req.project).session(
				session
			);
			const position = await PostionModel.findById(positionId).session(session);

			if (!position) {
				throw new ApolloError('position doesnt exist');
			}

			if (position.project!.toString() != ctx.req.project!.toString()) {
				throw new ApolloError('position not part of project');
			}

			if (
				!project!.openings!.some(
					(opening) => opening.position!.toString() === positionId.toString()
				)
			) {
				throw new ApolloError('position not part of project');
			}

			// check if position has any applicants then do the following:

			// (1)for each applicant of same position find profile and delete applied ref
			for (const app of project!.applicants!) {
				if (app.position!.toString() === position.id.toString()) {
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
					application.position!.toString() != position.id.toString()
			);

			// (3)for each offer with same position find profile and delete offer
			for (const offer of project!.offered!) {
				if (offer.position!.toString() === position.id.toString()) {
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
				(offer) => offer.position!.toString() != position.id.toString()
			);

			project!.openings = project!.openings!.filter(
				(opening) => opening.position!.toString() != position.id.toString()
			);

			await project!.save();
			// throw new Error('transaction check');

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

	@Mutation(() => Boolean)
	@UseMiddleware(protect, authorize('OWNER'))
	async assignTask(
		@Arg('userId') userId: string,
		@Arg('title') title: string,
		@Arg('description') description: string,
		@Ctx() ctx: MyContext
	): Promise<Boolean> {
		const project = await ProjectModel.findById(ctx.req.project);
		if (
			!project!.members!.some(
				(member) => member.dev!.toString() === userId.toString()
			)
		) {
			throw new ApolloError('user not member of project');
		}

		project!.tasks!.push({
			dev: (userId as unknown) as Ref<User>,
			title,
			description,
		});
		await project!.save();
		return true;
	}

	@Mutation(() => Boolean)
	@UseMiddleware(protect, authorize('OWNER'))
	async returnTask(
		@Arg('taskId') taskId: string,
		@Arg('note') note: string,
		@Ctx() ctx: MyContext
	): Promise<Boolean> {
		const project = await ProjectModel.findById(ctx.req.project);

		const task = ((((project!
			.tasks as Task[]) as unknown) as Types.DocumentArray<
			DocumentType<Project>
		>).id(taskId) as unknown) as Task;

		if (!task) {
			throw new ApolloError('task not found');
		}
		if (task.status != 'DONE') {
			throw new ApolloError('task not done can not return');
		}

		const taskIndex = project!.tasks!.findIndex((t) => t === task);

		if (!note) {
			throw new ApolloError('to send back task note is required');
		}

		project!.tasks![taskIndex].status = 'DOING';
		project!.tasks![taskIndex].note = note;
		project!.tasks![taskIndex].read = false;
		await project!.save();
		return true;
	}

	@Mutation(() => Boolean)
	@UseMiddleware(protect, authorize('OWNER'))
	async closeTask(
		@Arg('taskId') taskId: string,
		@Ctx() ctx: MyContext
	): Promise<Boolean> {
		const project = await ProjectModel.findById(ctx.req.project);
		const task = ((((project!
			.tasks as Task[]) as unknown) as Types.DocumentArray<
			DocumentType<Project>
		>).id(taskId) as unknown) as Task;

		if (!task) {
			throw new ApolloError('task not found');
		}
		if (task.status != 'DONE') {
			throw new ApolloError('task not done can not close');
		}

		const taskIndex = project!.tasks!.findIndex((t) => t === task);

		project!.tasks![taskIndex].status = 'COMPLETE';
		await project!.save();
		return true;
	}
}
