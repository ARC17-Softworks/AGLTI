import { InputType, Field } from 'type-graphql';
import { MinLength, IsEmail } from 'class-validator';

@InputType()
export class AuthInput {
	@Field({ nullable: true })
	name?: string;

	@Field()
	@IsEmail()
	email!: string;

	@Field()
	@MinLength(6)
	password!: string;
}
