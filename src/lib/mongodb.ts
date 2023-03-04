import { Db, MongoClient, MongoClientOptions } from "mongodb";
import "server-only";

let cachedClient: MongoClient;
let cachedDb: Db;

export async function connectToDatabase() {
	if( cachedClient && cachedDb ) {
		// load from cache
		return {
			client: cachedClient,
			db    : cachedDb,
		};
	}

	if( !process.env.MONGODB_URI ) {
		throw new Error( "Define the MONGODB_URI environmental variable" );
	}
	if( !process.env.MONGODB_USER_DB ) {
		throw new Error( "Define the MONGODB_DB environmental variable" );
	}

	// Connect to cluster
	cachedClient = new MongoClient( process.env.MONGODB_URI );
	await cachedClient.connect();

	cachedDb = cachedClient.db( process.env.MONGODB_DB );

	return {
		client: cachedClient,
		db    : cachedDb,
	};
}