import { Db, MongoClient } from "mongodb";
import "server-only";

let cachedClient: MongoClient;
let cachedUserDb: Db;
let cachedUnitDb: Db;
let cachedItemDb: Db;
let cachedSessionDb: Db;

export async function connectToDatabase() {
	// check the cached.
	if( cachedClient && cachedUserDb && cachedUnitDb && cachedItemDb && cachedSessionDb ) {
		// load from cache
		return {
			client   : cachedClient,
			userDb   : cachedUserDb,
			unitDb   : cachedUnitDb,
			itemDb   : cachedItemDb,
			sessionDb: cachedSessionDb,
		};
	}

	if( !process.env.MONGODB_URI ) {
		throw new Error( "Define the MONGODB_URI environmental variable" );
	}
	if( !process.env.MONGODB_USER_DB ) {
		throw new Error( "Define the MONGODB_USER_DB environmental variable" );
	}
	if( !process.env.MONGODB_UNIT_DB ) {
		throw new Error( "Define the MONGODB_UNIT_DB environmental variable" );
	}
	if( !process.env.MONGODB_ITEM_DB ) {
		throw new Error( "Define the MONGODB_ITEM_DB environmental variable" );
	}
	if( !process.env.MONGODB_SESSION_DB ) {
		throw new Error( "Define the MONGODB_ITEM_DB environmental variable" );
	}

	// Connect to cluster
	cachedClient = new MongoClient( process.env.MONGODB_URI );
	await cachedClient.connect();

	cachedUserDb = cachedClient.db( process.env.MONGODB_USER_DB );
	cachedUnitDb  = cachedClient.db( process.env.MONGODB_UNIT_DB );
	cachedItemDb = cachedClient.db( process.env.MONGODB_ITEM_DB );
	cachedSessionDb = cachedClient.db( process.env.MONGODB_ITEM_DB );

	return {
		client   : cachedClient,
		userDb   : cachedUserDb,
		unitDb   : cachedUnitDb,
		itemDb   : cachedItemDb,
		sessionDb: cachedSessionDb,
	};
}