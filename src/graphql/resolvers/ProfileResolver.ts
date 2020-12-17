import { ApolloError } from 'apollo-server-express';
import { Arg, Ctx, Mutation, Resolver, UseMiddleware } from 'type-graphql';
import { ProfileModel } from '../../entities/Profile';
import { UserModel } from '../../entities/User';
import { protect } from '../../middleware/auth';
import { ProfileInput } from '../types/InputTypes';
import { MyContext } from '../types/MyContext';

@Resolver()
export class ProfileResolver {
	@Mutation(() => Boolean)
	@UseMiddleware(protect)
	async setProfile(
		@Arg('input')
		{ name, bio, location, skills, links }: ProfileInput,
		@Ctx() ctx: MyContext
	): Promise<Boolean> {
		let profile = await ProfileModel.findOne({ user: ctx.req.user!.id });
		if (profile) {
			if (bio) profile.bio = bio;
			if (location) profile.location = location;
			if (skills) profile.skills = skills;
			if (links) {
				if (links.youtube) profile.links!.youtube = links.youtube;
				if (links.github) profile.links!.github = links.github;
				if (links.hackerRank) profile.links!.hackerRank = links.hackerRank;
				if (links.dribble) profile.links!.dribble = links.dribble;
				if (links.linkedin) profile.links!.linkedin = links.linkedin;
				if (links.behance) profile.links!.behance = links.behance;
				if (links.vimeo) profile.links!.vimeo = links.vimeo;
				if (links.website) profile.links!.website = links.website;
			}
			try {
				await profile.save();
			} catch (err) {
				throw new ApolloError('could not complete request');
			}
		} else {
			try {
				profile = await ProfileModel.create({
					user: ctx.req.user!.id,
					skills,
					bio,
					location,
					links,
				});
			} catch (err) {}
		}

		if (name) {
			try {
				const user = await UserModel.findById(ctx.req.user!.id);
				user!.name = name;
				await user!.save();
			} catch (err) {
				throw new ApolloError('could not complete request');
			}
		}

		return true;
	}
}
