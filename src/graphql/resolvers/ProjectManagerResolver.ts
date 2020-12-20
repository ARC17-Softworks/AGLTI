import { ApolloError } from 'apollo-server-express';
import { Schema } from 'mongoose';
import { Arg, Ctx, Mutation, Resolver, UseMiddleware } from 'type-graphql';
import { PostionModel } from '../../entities/Position';
import { ProfileModel } from '../../entities/Profile';
import { ProjectModel } from '../../entities/Project';
import { protect } from '../../middleware/auth';
import { MyContext } from '../types/MyContext';

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
}
