import mongoose from 'mongoose';
export class db {
	static async connect(): Promise<void> {
		const conn = await mongoose.connect(process.env.MONGO_URI as string, {
			useNewUrlParser: true,
			useCreateIndex: true,
			useFindAndModify: false,
			useUnifiedTopology: true,
		});
		console.log(
			`MongoDB Connected: ${conn.connection.host}`.cyan.underline.bold
		);
	}
}
