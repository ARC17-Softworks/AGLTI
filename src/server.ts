import { ApolloServer, gql } from 'apollo-server-express';
import express from 'express';
import { db } from './services/db';
import dotenv from 'dotenv';
import 'colors';
import 'reflect-metadata';
import './services/cache';

const env = dotenv.config({ path: './config/config.env' });
if (env.error) {
	throw env.error;
}
db.connect();

const app = express();

const PORT = process.env.PORT || 5000;

const typeDefs = gql`
	type Query {
		sayHello: String
	}
`;
const resolvers = {
	Query: {
		sayHello() {
			return 'Hellow World';
		},
	},
};

const server = new ApolloServer({
	typeDefs,
	resolvers,
	context: ({ req, res }) => ({ req, res }),
});

server.applyMiddleware({ app, cors: true });

app.listen(PORT, () =>
	console.log(
		`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`.yellow.bold
	)
);
