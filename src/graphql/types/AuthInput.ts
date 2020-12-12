import { InputType, Field } from 'type-graphql';
import { MinLength, IsEmail } from 'class-validator';

@InputType()
export class AuthInput {
	@Field()
	name!: string;

	@Field()
	@IsEmail()
	email!: string;

	@Field()
	@MinLength(6)
	password!: string;
}
