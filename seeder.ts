const fs = require('fs');
const mongoose = require('mongoose');
import 'colors';
const dotenv = require('dotenv');

// load env vars
dotenv.config({ path: './config/config.env' });

// load models
import { UserModel as User } from './src/entities/User';
import { ProfileModel as Profile } from './src/entities/Profile';
import { ProjectModel as Project } from './src/entities/Project';
import { PostionModel as Position } from './src/entities/Position';
import { MessageThreadModel as MessageThread } from './src/entities/MessageThread';

// Connect to DB
mongoose.connect(process.env.MONGO_URI, {
	useNewUrlParser: true,
	useCreateIndex: true,
	useFindAndModify: false,
	useUnifiedTopology: true,
});

// read JSON files
const users = JSON.parse(
	fs.readFileSync(`${__dirname}/_data/users.json`, 'utf-8')
);

const profiles = JSON.parse(
	fs.readFileSync(`${__dirname}/_data/profiles_v3.json`, 'utf-8')
);

const projects = JSON.parse(
	fs.readFileSync(`${__dirname}/_data/projects_v3.json`, 'utf-8')
);

const positions = JSON.parse(
	fs.readFileSync(`${__dirname}/_data/positions_v3.json`, 'utf-8')
);

// import into DB
const importData = async () => {
	try {
		await User.create(users);
		await Profile.create(profiles);
		await Project.create(projects);
		await Position.create(positions);
		console.log('Data Imported...'.green.inverse);
		process.exit();
	} catch (err) {
		console.error(err);
	}
};

// delete data
const deleteData = async () => {
	try {
		await User.deleteMany({});
		await Profile.deleteMany({});
		await Project.deleteMany({});
		await Position.deleteMany({});
		await MessageThread.deleteMany({});
		console.log('Data Destroyed...'.red.inverse);
		process.exit();
	} catch (err) {
		console.error(err);
	}
};

if (process.argv[2] == '-i') {
	importData();
} else if (process.argv[2] == '-d') {
	deleteData();
}
