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
	if( !process.env.DB_USER_COLLECTION ) {
		throw new Error( "Define the DB_USER_COLLECTION environment variable" );
	}
	// Connect to cluster
	cachedClient = new MongoClient( process.env.MONGODB_URI );
	await cachedClient.connect();

	cachedDb = cachedClient.db( process.env.MONGODB_DB );
	//create the user collection so it can be queried case insensitive for both the username and email
	cachedDb.createCollection( process.env.DB_USER_COLLECTION, { collation: { locale: "en_US", strength: 2 }});

	return {
		client: cachedClient,
		db    : cachedDb,
	};
}