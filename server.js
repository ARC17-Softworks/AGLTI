const express = require('express');
const dotenv = require('dotenv');
const morgan = require('morgan');
const colors = require('colors');
const helmet = require('helmet');
const xss = require('xss-clean');
const rateLimit = require('express-rate-limit');
const hpp = require('hpp');
const cookieParser = require('cookie-parser');
const mongoSanitize = require('express-mongo-sanitize');
const errorHandler = require('./middleware/error');
require('./services/cache');
const connectDB = require('./config/db');
const { ApolloServer } = require('apollo-server-express');
const { gql } = require('apollo-server-express');

// load env vars
dotenv.config({ path: './config/config.env' });

// connect to database
connectDB();

const app = express();

// cookie parser
app.use(cookieParser());

// sanitize data
app.use(mongoSanitize());

// set security headers
app.use(helmet());

// prevent xss atacks
app.use(xss());

// rate limiting
const limiter = rateLimit({
	windowMs: 10 * 60 * 100,
	max: 100,
});

app.use(limiter);

// prevent http param pollution
app.use(hpp());

app.use(errorHandler);

const PORT = process.env.PORT || 5000;

const typeDefs = gql`
	type Query {
		sayHi: String!
	}
`;
const apolloServer = new ApolloServer({ typeDefs });

const server = app.listen(
	PORT,
	console.log(
		`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`.yellow.bold
	)
);

apolloServer.applyMiddleware({ app });

// handle undhandled promise rejections
process.on('unhandledRejection', (err, promise) => {
	console.log(`Error ${err.message}`.red);
	// close server and exit process
	server.close(() => process.exit(1));
});
