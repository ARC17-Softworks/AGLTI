import { Ref } from '@typegoose/typegoose';
import { ApolloError } from 'apollo-server-express';
import { Types } from 'mongoose';
import { Arg, Ctx, Resolver, Query, UseMiddleware } from 'type-graphql';
import { PostionModel } from '../../entities/Position';
import { ProfileModel } from '../../entities/Profile';
import { ProjectModel } from '../../entities/Project';
import { User } from '../../entities/User';
import { authorize, protect } from '../../middleware/auth';
import { DevSearchInput, PositionSearchInput } from '../types/InputTypes';
import { MyContext } from '../types/MyContext';
import {
	Pagiantion,
	PositionsResponse,
	ProfilesResponse,
} from '../types/ResponseTypes';

@Resolver()
export class SearchResolver {
	@Query(() => ProfilesResponse)
	@UseMiddleware(protect, authorize('OWNER'))
	async searchDevelopers(
		@Arg('input') { positionId, page, limit }: DevSearchInput,
		@Ctx() ctx: MyContext
	) {
		const project = await ProjectModel.findById(ctx.req.project);
		const position = await PostionModel.findById(positionId);

		// check if position exists
		if (!position) {
			throw new ApolloError(`Resource not found with id of ${positionId}`);
		}

		// check if position belongs to project
		if (
			!project!.openings!.some(
				(opening) => opening!.position!.toString() === position.id.toString()
			)
		) {
			throw new ApolloError('position not part of project');
		}

		const app = project!.applicants!.map((app) => {
			if (app.position!.toString() === position.id.toString()) {
				return app.dev;
			}
			return;
		});
		const off = project!.offered!.map((off) => {
			if (off!.position!.toString() === position.id.toString()) {
				return off.dev;
			}
			return;
		});

		let exclude: Ref<User, Types.ObjectId | undefined>[];

		if (app.length || off.length) {
			exclude = app.concat(off);
		} else {
			exclude = [];
		}

		// pagination
		page = page || 1;
		limit = limit || 20;
		const startIndex = (page - 1) * limit;
		const endIndex = page * limit;
		const total = await ProfileModel.countDocuments({
			activeProject: undefined,
			skills: { $all: position.skills },
			user: { $nin: exclude },
		});

		const profiles = await ProfileModel.find({
			activeProject: undefined,
			skills: { $all: position.skills },
			user: { $nin: exclude },
		})
			.skip(startIndex)
			.limit(limit)
			.select('user skills bio')
			.populate('user', 'id name avatar');

		const pagination: Pagiantion = {};

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
		pagination.count = profiles.length;

		return { position, profiles, pagination };
	}

	@Query(() => PositionsResponse)
	@UseMiddleware(protect)
	async searchPositions(
		@Arg('input') { qskills, page, limit }: PositionSearchInput,
		@Ctx() ctx: MyContext
	) {
		const profile = await ProfileModel.findOne({ user: ctx.req.user!.id });

		if (profile!.activeProject) {
			throw new ApolloError('user already part of a project');
		}

		const app = profile!.applied!.map((app) => app.position);
		const off = profile!.offers!.map((off) => off.position);
		const exclude = app.concat(off);

		if (!qskills) {
			qskills = profile!.skills;
		}

		// pagination
		page = page || 1;
		limit = 20;
		const startIndex = (page - 1) * limit;
		const endIndex = page * limit;
		const total = await PostionModel.countDocuments({
			$or: [
				{ $expr: { $setIsSubset: ['$skills', qskills] } },
				{ skills: { $all: qskills } },
			],
			_id: { $nin: exclude },
		});

		const positions = await PostionModel.find({
			$or: [
				{ $expr: { $setIsSubset: ['$skills', qskills] } },
				{ skills: { $all: qskills } },
			],
			_id: { $nin: exclude },
		})
			.skip(startIndex)
			.limit(limit)
			.populate('project', 'title');

		const pagination: Pagiantion = {};

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
		pagination.count = positions.length;

		return { qskills, positions, pagination };
	}
}
