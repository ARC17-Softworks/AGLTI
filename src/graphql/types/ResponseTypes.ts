import { ObjectType, Field } from 'type-graphql';
import { User } from '../../entities/User';
import { FieldError } from './FieldError';

@ObjectType()
export class GenericResponse {
	@Field(() => [FieldError], { nullable: true })
	errors?: FieldError[];
}

@ObjectType()
export class RegisterResponse extends GenericResponse {
	@Field({ nullable: true })
	message?: string;
}

@ObjectType()
export class UserResponse extends GenericResponse {
	@Field(() => User, { nullable: true })
	user?: User;
}
