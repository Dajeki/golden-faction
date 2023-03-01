import { Db, MongoClient } from "mongodb";

const MONGODB_URI = process.env.MONGODB_URI;
const MONGODB_USER_DB = process.env.MONGODB_USER_DB;
const MONGODB_UNIT_DB = process.env.MONGODB_UNIT_DB;
const MONGODB_ITEM_DB = process.env.MONGODB_ITEM_DB;

let cachedClient: MongoClient;
let cachedUserDb: Db;
let cachedUnitDb: Db;
let cachedItemDb: Db;

export async function connectToDatabase() {
	// check the cached.
	if( cachedClient && cachedUserDb && cachedUnitDb && cachedItemDb ) {
		// load from cache
		return {
			client: cachedClient,
			userDb: cachedUserDb,
			unitDb: cachedUnitDb,
			itemDb: cachedItemDb,
		};
	}

	// set the connection options
	// const opts = {
	// 	useNewUrlParser   : true,
	// 	useUnifiedTopology: true,
	// };

	// check the MongoDB URI
	if( !MONGODB_URI ) {
		throw new Error( "Define the MONGODB_URI environmental variable" );
	}
	// check the MongoDB User DB
	if( !MONGODB_USER_DB ) {
		throw new Error( "Define the MONGODB_USER_DB environmental variable" );
	}
	// check the MongoDB Unit DB
	if( !MONGODB_UNIT_DB ) {
		throw new Error( "Define the MONGODB_UNIT_DB environmental variable" );
	}

	// check the MongoDB Item DB
	if( !MONGODB_ITEM_DB ) {
		throw new Error( "Define the MONGODB_ITEM_DB environmental variable" );
	}

	// Connect to cluster
	const client = new MongoClient( MONGODB_URI );
	await client.connect();
	const userDb = client.db( MONGODB_USER_DB );
	const unitDb = client.db( MONGODB_UNIT_DB );
	const itemDb = client.db( MONGODB_ITEM_DB );

	// set cache
	cachedClient = client;
	cachedUnitDb = unitDb;
	cachedUserDb = userDb;
	cachedItemDb = itemDb;

	return {
		client: cachedClient,
		userDb: cachedUserDb,
		unitDb: cachedUnitDb,
		itemDb: cachedItemDb,
	};
}