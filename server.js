const express = require('express');
const dotenv = require('dotenv');
const morgan = require('morgan');
const colors = require('colors');
const helmet = require('helmet');
const xss = require('xss-clean');
const rateLimit = require('express-rate-limit');
const hpp = require('hpp');
const fileupload = require('express-fileupload');
const cookieParser = require('cookie-parser');
const mongoSanitize = require('express-mongo-sanitize');
const errorHandler = require('./middleware/error');
const connectDB = require('./config/db');

// load env vars
dotenv.config({ path: './config/config.env' });

// connect to database
connectDB();

// route files
const auth = require('./routes/auth');
const profiles = require('./routes/profiles');
const projects = require('./routes/projects');
const positions = require('./routes/positions');
const search = require('./routes/search');
const posts = require('./routes/posts');
const contacts = require('./routes/contacts');
const messages = require('./routes/messages');

const app = express();

// body parser
app.use(express.json());

// cookie parser
app.use(cookieParser());

// dev logging middleware
if (process.env.NODE_ENV === 'development') {
	app.use(morgan('dev'));
}

// File uploading
app.use(fileupload());

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

// mount routers
app.use('/api/v1/auth', auth);
app.use('/api/v1/profiles', profiles);
app.use('/api/v1/projects', projects);
app.use('/api/v1/positions', positions);
app.use('/api/v1/search', search);
app.use('/api/v1/posts', posts);
app.use('/api/v1/contacts', contacts);
app.use('/api/v1/messages', messages);

app.use(errorHandler);

const PORT = process.env.PORT || 5000;

const server = app.listen(
	PORT,
	console.log(
		`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`.yellow.bold
	)
);

// handle undhandled promise rejections
process.on('unhandledRejection', (err, promise) => {
	console.log(`Error ${err.message}`.red);
	// close server and exit process
	server.close(() => process.exit(1));
});
