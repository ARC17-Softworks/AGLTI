import { ObjectType, Field } from 'type-graphql';
import { FieldError } from '../types/FieldError';

@ObjectType()
export class RegisterResponse {
	@Field()
	message?: string;
	@Field(() => [FieldError], { nullable: true })
	errors?: FieldError[];
}
