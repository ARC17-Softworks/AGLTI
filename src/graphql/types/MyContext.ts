import { Request, Response } from 'express';
import { Schema } from 'mongoose';
import { User } from '../../entities/User';

interface RequestWithUser extends Request {
	user?: User;
	project?: Schema.Types.ObjectId;
}

export interface MyContext {
	req: RequestWithUser;
	res: Response;
}
