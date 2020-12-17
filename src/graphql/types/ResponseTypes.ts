import { ObjectType, Field } from 'type-graphql';
import { Profile } from '../../entities/Profile';
import { User } from '../../entities/User';

@ObjectType()
export class UserResponse {
	@Field(() => User, { nullable: true })
	user?: User;
}

@ObjectType()
export class ProfileResponse {
	@Field(() => Profile, { nullable: true })
	profile?: Profile;
}
