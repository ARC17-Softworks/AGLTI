import { ApolloError } from 'apollo-server-express';
import { Schema } from 'mongoose';
import { Arg, Ctx, Mutation, Resolver, UseMiddleware } from 'type-graphql';
import { PostionModel } from '../../entities/Position';
import { ProfileModel } from '../../entities/Profile';
import { Project, ProjectModel, Task } from '../../entities/Project';
import { authorize, protect } from '../../middleware/auth';
import { PositionInput, TaskInput } from '../types/InputTypes';
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
			throw new ApolloError(err.message);
		}
		return true;
	}

	@Mutation(() => Boolean)
	@UseMiddleware(protect, authorize('OWNER'))
	async editProject(
		@Arg('title') title: string,
		@Arg('description') description: string,
		@Ctx() ctx: MyContext
	): Promise<Boolean> {
		const project = await ProjectModel.findById(ctx.req.project);

		if (!project) {
			throw new ApolloError('project not found');
		}

		project.title = title;
		project.description = description;
		try {
			await project.save();
		} catch (err) {
			throw new ApolloError('could not complete request');
		}
		return true;
	}

	@Mutation(() => Boolean)
	@UseMiddleware(protect, authorize('OWNER'))
	async addPosition(
		@Arg('input') { title, description, skills, isPrivate }: PositionInput,
		@Ctx() ctx: MyContext
	): Promise<Boolean> {
		try {
			const project = await ProjectModel.findById(ctx.req.project);

			if (project!.openings!.length + project!.members!.length > 99) {
				throw new ApolloError(
					'developer limit reached cannot create any more positions'
				);
			}
			const position = await PostionModel.create({
				project: project!.id,
				skills,
				title,
				description,
				isPrivate,
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
	async addLabel(
		@Arg('label') label: string,
		@Ctx() ctx: MyContext
	): Promise<Boolean> {
		const project = await ProjectModel.findById(ctx.req.project);
		if (!label.length) {
			throw new ApolloError('label can not be empty');
		}
		if (project!.taskLabels!.includes(label)) {
			throw new ApolloError('label already exists');
		}

		label = label.toUpperCase().trim();
		project!.taskLabels!.push(label);
		await project!.save();
		return true;
	}

	@Mutation(() => Boolean)
	@UseMiddleware(protect, authorize('OWNER'))
	async deleteLabel(
		@Arg('label') label: string,
		@Ctx() ctx: MyContext
	): Promise<Boolean> {
		const project = await ProjectModel.findById(ctx.req.project);
		if (!project!.taskLabels!.includes(label)) {
			throw new ApolloError('label does not exists');
		}

		const removeIndex = project!.taskLabels!.findIndex((l) => l === label);
		project!.taskLabels!.splice(removeIndex, 1);
		await project!.save();
		return true;
	}

	@Mutation(() => Boolean)
	@UseMiddleware(protect, authorize('OWNER'))
	async assignTask(
		@Arg('input') { userId, title, description, startDate, dueDate }: TaskInput,
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
			dev: userId as unknown as Ref<User>,
			title,
			description,
			startDate,
			dueDate,
		});
		await project!.save();
		return true;
	}

	@Mutation(() => Boolean)
	@UseMiddleware(protect, authorize('OWNER'))
	async setTaskLabels(
		@Arg('taskId') taskId: string,
		@Arg('labels', () => [String], { nullable: 'items' }) labels: string[],
		@Ctx() ctx: MyContext
	): Promise<Boolean> {
		const project = await ProjectModel.findById(ctx.req.project);
		const task = (
			project!.tasks as Task[] as unknown as Types.DocumentArray<
				DocumentType<Project>
			>
		).id(taskId) as unknown as Task;

		if (!task) {
			throw new ApolloError('task not found');
		}

		const taskIndex = project!.tasks!.findIndex((t) => t === task);

		project!.tasks![taskIndex].labels = labels;

		await project!.save();
		return true;
	}

	@Mutation(() => Boolean)
	@UseMiddleware(protect, authorize('OWNER'))
	async addCheckListItem(
		@Arg('taskId') taskId: string,
		@Arg('description') description: string,
		@Ctx() ctx: MyContext
	): Promise<Boolean> {
		const project = await ProjectModel.findById(ctx.req.project);
		const task = (
			project!.tasks as Task[] as unknown as Types.DocumentArray<
				DocumentType<Project>
			>
		).id(taskId) as unknown as Task;

		if (!task) {
			throw new ApolloError('task not found');
		}

		if (description.length < 3) {
			throw new ApolloError('please enter description');
		}

		const taskIndex = project!.tasks!.findIndex((t) => t === task);

		project!.tasks![taskIndex].checkList!.push({ description });

		await project!.save();
		return true;
	}

	@Mutation(() => Boolean)
	@UseMiddleware(protect, authorize('OWNER'))
	async removeCheckListItem(
		@Arg('taskId') taskId: string,
		@Arg('checklistId') checklistId: string,
		@Ctx() ctx: MyContext
	): Promise<Boolean> {
		const project = await ProjectModel.findById(ctx.req.project);
		const task = (
			project!.tasks as Task[] as unknown as Types.DocumentArray<
				DocumentType<Project>
			>
		).id(taskId) as unknown as Task;

		if (!task) {
			throw new ApolloError('task not found');
		}
		if (task.status === 'COMPLETE') {
			throw new ApolloError('can not delete completed task');
		}

		const taskIndex = project!.tasks!.findIndex((t) => t === task);
		const removeIndex = project!.tasks![taskIndex].checkList!.findIndex(
			(cl) => cl.id === checklistId
		);

		project!.tasks![taskIndex].checkList!.splice(removeIndex, 1);
		await project!.save();
		return true;
	}

	@Mutation(() => Boolean)
	@UseMiddleware(protect, authorize('OWNER'))
	async editTask(
		@Arg('taskId') taskId: string,
		@Arg('input') { userId, title, description, startDate, dueDate }: TaskInput,
		@Ctx() ctx: MyContext
	): Promise<Boolean> {
		const project = await ProjectModel.findById(ctx.req.project);
		const task = (
			project!.tasks as Task[] as unknown as Types.DocumentArray<
				DocumentType<Project>
			>
		).id(taskId) as unknown as Task;

		if (!task) {
			throw new ApolloError('task not found');
		}

		const taskIndex = project!.tasks!.findIndex((t) => t === task);

		project!.tasks![taskIndex].dev = userId as unknown as Ref<User>;
		project!.tasks![taskIndex].title = title;
		project!.tasks![taskIndex].description = description;
		project!.tasks![taskIndex].startDate = startDate;
		project!.tasks![taskIndex].dueDate = dueDate;

		await project!.save();
		return true;
	}

	@Mutation(() => Boolean)
	@UseMiddleware(protect, authorize('OWNER'))
	async deleteTask(
		@Arg('taskId') taskId: string,
		@Ctx() ctx: MyContext
	): Promise<Boolean> {
		const project = await ProjectModel.findById(ctx.req.project);
		const task = (
			project!.tasks as Task[] as unknown as Types.DocumentArray<
				DocumentType<Project>
			>
		).id(taskId) as unknown as Task;

		if (!task) {
			throw new ApolloError('task not found');
		}
		if (task.status === 'COMPLETE') {
			throw new ApolloError('can not delete completed task');
		}

		const removeIndex = project!.tasks!.findIndex((t) => t === task);

		project!.tasks!.splice(removeIndex, 1);
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
		const task = (
			project!.tasks as Task[] as unknown as Types.DocumentArray<
				DocumentType<Project>
			>
		).id(taskId) as unknown as Task;

		if (!task) {
			throw new ApolloError('task not found');
		}
		if (task.checkList!.some((item) => item.checked === false)) {
			throw new ApolloError('task checklist not complete can not close');
		}

		const taskIndex = project!.tasks!.findIndex((t) => t === task);

		project!.tasks![taskIndex].status = 'COMPLETE';
		await project!.save();
		return true;
	}

	@Mutation(() => Boolean)
	@UseMiddleware(protect, authorize('OWNER'))
	async addColumn(
		@Arg('column') column: string,
		@Arg('columnPos') columnPos: number,
		@Ctx() ctx: MyContext
	): Promise<Boolean> {
		const project = await ProjectModel.findById(ctx.req.project);

		column = column.toUpperCase();

		if (project!.taskColumns!.includes(column)) {
			throw new ApolloError('column already exists');
		}

		if (columnPos > project!.taskColumns!.length - 2) {
			throw new ApolloError('invalid position');
		}

		project!.taskColumns!.splice(columnPos, 0, column);

		await project!.save();
		return true;
	}

	@Mutation(() => Boolean)
	@UseMiddleware(protect, authorize('OWNER'))
	async moveColumn(
		@Arg('column') column: string,
		@Arg('columnPos') columnPos: number,
		@Ctx() ctx: MyContext
	): Promise<Boolean> {
		const project = await ProjectModel.findById(ctx.req.project);

		if (!project!.taskColumns!.includes(column)) {
			throw new ApolloError('column not found');
		}

		if (columnPos > project!.taskColumns!.length - 2) {
			throw new ApolloError('invalid position');
		}

		const columnDelIndex = project!.taskColumns!.findIndex((c) => c === column);

		project!.taskColumns!.splice(columnDelIndex, 1);
		project!.taskColumns!.splice(columnPos, 0, column);

		await project!.save();
		return true;
	}

	@Mutation(() => Boolean)
	@UseMiddleware(protect, authorize('OWNER'))
	async deleteColumn(
		@Arg('column') column: string,
		@Arg('deleteTasks') deleteTasks: boolean,
		@Arg('shiftColumn', { nullable: true }) shiftColumn: string,
		@Ctx() ctx: MyContext
	): Promise<Boolean> {
		const project = await ProjectModel.findById(ctx.req.project);

		if (!project!.taskColumns!.includes(column)) {
			throw new ApolloError('column not found');
		}

		if (column === 'COMPLETE' || column === 'TODO') {
			throw new ApolloError('can not delete this column');
		}

		if (deleteTasks) {
			project!.tasks = project!.tasks!.filter((task) => task.status !== column);
			project!.taskColumns = project!.taskColumns!.filter((c) => c !== column);
		} else {
			if (!project!.taskColumns!.includes(shiftColumn)) {
				throw new ApolloError('column not found');
			}

			for (const task of project!.tasks!) {
				if (task.status === column) {
					task.status = shiftColumn;
				}
			}

			project!.taskColumns = project!.taskColumns!.filter((c) => c !== column);
		}
		await project!.save();
		return true;
	}

	@Mutation(() => Boolean)
	@UseMiddleware(protect, authorize('OWNER'))
	async removeDeveloper(
		@Arg('userId') userId: string,
		@Ctx() ctx: MyContext
	): Promise<Boolean> {
		const project = await ProjectModel.findById(ctx.req.project);

		const developer = project!.members!.find(
			(member) => member.dev!.toString() === userId.toString()
		);

		if (!developer) {
			throw new ApolloError('user not part of project');
		}

		// profile of developer
		const profile = await ProfileModel.findOne({ user: userId });

		// if developer did not contribute to project
		if (
			!project!.tasks!.some(
				(task) =>
					task.dev!.toString() === userId.toString() &&
					task.status === 'COMPLETE'
			)
		) {
			// remove project from profile
			profile!.projects!.shift();
		} else {
			// add to past members
			project!.previousMembers!.push(developer);
		}

		// remove from members
		project!.members = project!.members!.filter(
			(member) => member != developer
		);
		// unset active project
		profile!.activeProject = undefined;
		// clear project forum mentions
		profile!.mentions = [];

		// remove tasks of dev
		project!.tasks = project!.tasks!.filter(
			(task) =>
				!(
					task.dev!.toString() === userId.toString() &&
					task.status != 'COMPLETE'
				)
		);

		await profile!.save();
		await project!.save();
		return true;
	}

	@Mutation(() => Boolean)
	@UseMiddleware(protect, authorize('OWNER'))
	async closeProject(@Ctx() ctx: MyContext): Promise<Boolean> {
		const session = await mongoose.startSession();
		session.startTransaction();
		try {
			const project = await ProjectModel.findById(ctx.req.project).session(
				session
			);

			// position handling
			// go to all applicants profiles remove position from applied list
			// go to all offered profiles remove position from offers list
			// delete each position
			// clear openings array
			//
			for (const openpos of project!.openings!) {
				const position = await PostionModel.findById(openpos.position).session(
					session
				);

				// (1)for each applicant of same position find profile and delete applied ref
				for (const app of project!.applicants!) {
					if (app.position!.toString() === position!.id.toString()) {
						const rejpro = await ProfileModel.findOne({
							user: app.dev,
						}).session(session);
						rejpro!.applied!.splice(
							rejpro!.applied!.findIndex(
								(a) => a.position!.toString() === position!.id.toString()
							),
							1
						);
						await rejpro!.save();
					}
				}

				// (2)for each offer with same position find profile and delete offer
				for (const offer of project!.offered!) {
					if (offer.position!.toString() === position!.id.toString()) {
						const rejpro = await ProfileModel.findOne({
							user: offer.dev,
						}).session(session);
						rejpro!.offers!.splice(
							rejpro!.offers!.findIndex(
								(o) => o.position!.toString() === position!.id.toString()
							),
							1
						);
						await rejpro!.save();
					}
				}

				// delete position
				await PostionModel.findByIdAndDelete(position!.id).session(session);
			}

			project!.openings = [];

			// members handling
			// go to each member profile set activeProject as undefined
			// if member dont have any completed task remove them from member list
			//
			for (const mem of project!.members!) {
				// profile of developer
				const memprofile = await ProfileModel.findOne({
					user: mem.dev,
				}).session(session);

				// if developer did not contribute to project
				if (
					!project!.tasks!.some(
						(task) =>
							task.dev!.toString() === mem.dev!.toString() &&
							task.status === 'COMPLETE'
					)
				) {
					// remove project from profile
					memprofile!.projects!.shift();
				} else {
					// add to past members
					project!.previousMembers!.push(mem);
				}

				// unset active project
				memprofile!.activeProject = undefined;
				// clear project forum mentions
				memprofile!.mentions = [];

				await memprofile!.save();
			}

			project!.members = [];

			// delete everything else
			project!.tasks = [];
			project!.applicants = [];
			project!.offered = [];
			project!.posts = [];

			// go to owner profile
			// set active project as undefined
			const ownerprofile = await ProfileModel.findOne({
				user: project!.owner,
			}).session(session);
			ownerprofile!.activeProject = undefined;
			await ownerprofile!.save();

			// set project as closed
			project!.closed = true;
			await project!.save();

			// throw new Error('transaction check');
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
