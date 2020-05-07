const fs = require('fs');
const mongoose = require('mongoose');
const colors = require('colors');
const dotenv = require('dotenv');

// load env vars
dotenv.config({ path: './config/config.env' });

// load models
const User = require('./models/User');
const Profile = require('./models/Profile');

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
	fs.readFileSync(`${__dirname}/_data/profiles.json`, 'utf-8')
);

// import into DB
const importData = async () => {
	try {
		await User.create(users);
		await Profile.create(profiles);
		console.log('Data Imported...'.green.inverse);
		process.exit();
	} catch (err) {
		console.error(err);
	}
};

// delete data
const deleteData = async () => {
	try {
		await User.deleteMany();
		await Profile.deleteMany();
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
