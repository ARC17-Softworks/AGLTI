import { ApolloServer } from 'apollo-server-express';
import { buildSchema } from 'type-graphql';
import express from 'express';
import { db } from './services/db';
import dotenv from 'dotenv';
import 'colors';
import 'reflect-metadata';
import './services/cache';

// resolvers
import { AuthResolver } from './graphql/resolvers/AuthResolver';

const env = dotenv.config({ path: './config/config.env' });
if (env.error) {
	throw env.error;
}

const main = async () => {
	db.connect();

	const app = express();

	const PORT = process.env.PORT || 5000;

	const server = new ApolloServer({
		schema: await buildSchema({
			resolvers: [AuthResolver],
			validate: true,
		}),
		context: ({ req, res }) => ({ req, res }),
		playground: {
			settings: {
				'request.credentials': 'include',
			},
		},
	});

	server.applyMiddleware({ app, cors: true });

	app.listen(PORT, () =>
		console.log(
			`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`.yellow
				.bold
		)
	);
};

main().catch((err) => {
	console.error(err);
});
