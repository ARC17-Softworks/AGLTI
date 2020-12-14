import { Request, Response } from 'express';
import { User } from '../../entities/User';

interface RequestWithUser extends Request {
	user?: User;
}

export interface MyContext {
	req: RequestWithUser;
	res: Response;
}
