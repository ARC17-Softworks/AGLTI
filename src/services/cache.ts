import mongoose, { Query } from 'mongoose';
import redis from 'redis';
import util from 'util';

interface cacheOptions {
	key?: string;
}

declare module 'mongoose' {
	interface Query<T> extends DocumentQuery<T, any> {
		cache(options: cacheOptions): Query<T>;
		useCache: boolean;
		hashKey: string;
		mongooseCollection: { name: string };
		model: Model<any>;
	}
}

declare module 'redis' {
	interface RedisClient {
		hget(hasKey: string, key: string): Promise<string>;
		hset(
			hasKey: string,
			key: string,
			value: string,
			arg: string,
			time: number
		): boolean;
	}
}

// connect to redis
const redisUrl: string = process.env.REDIS_URL as string;
const client = redis.createClient(redisUrl);
// promisify get function to use with await keyword
client.hget = util.promisify(client.hget);

const exec = mongoose.Query.prototype.exec;

mongoose.Query.prototype.cache = function (
	options: cacheOptions = {}
): Query<any> {
	this.useCache = true;
	this.hashKey = JSON.stringify(options.key || 'default');
	// make function chainable
	return this;
};

mongoose.Query.prototype.exec = async function () {
	// if useCache flag not set
	if (!this.useCache) {
		return exec.apply(this, arguments as any);
	}
	// copy from query to new variable key and add new property called collection store as string
	const key = JSON.stringify(
		Object.assign({}, this.getFilter(), {
			collection: this.mongooseCollection.name,
		})
	);

	// see if we have a value for key in redis
	// if yes return
	const cacheValue = await client.hget(this.hashKey, key);
	if (cacheValue) {
		// hydrate model
		const doc = JSON.parse(cacheValue);
		return Array.isArray(doc)
			? // if array hydrate array
			  doc.map((d) => new this.model(d))
			: new this.model(doc);
	}

	// else issue query to mongo and store result in redis
	const result = await exec.apply(this, arguments as any);
	client.hset(this.hashKey, key, JSON.stringify(result), 'EX', 120);

	return result;
};

exports.clearHash = function (hashKey: string) {
	client.del(JSON.stringify(hashKey));
};
