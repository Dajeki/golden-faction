import { Db, MongoClient } from "mongodb";
let cachedClient: MongoClient;
let cachedDb: Db;
let clientPromise: Promise<MongoClient>;

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
	if( !process.env.MONGODB_DB ) {
		throw new Error( "Define the MONGODB_DB environmental variable" );
	}
	if( !process.env.DB_USER_COLLECTION ) {
		throw new Error( "Define the DB_USER_COLLECTION environment variable" );
	}
	// Connect to cluster
	cachedClient = new MongoClient( process.env.MONGODB_URI );

	clientPromise = cachedClient.connect();
	await clientPromise;

	cachedDb = cachedClient.db( process.env.MONGODB_DB );

	const collections = await cachedDb.listCollections().toArray();
	const collectionExists = collections.some(( c ) => c.name === process.env.DB_USER_COLLECTION );
	if( collectionExists ) {
		console.log( `Collection ${ process.env.DB_USER_COLLECTION   } exists` );
	}
	else {
		console.log( `Collection ${ process.env.DB_USER_COLLECTION  } does not exist`, `Creating ${ process.env.DB_USER_COLLECTION  } collection.` );
		//create the user collection so it can be queried case insensitive for both the username and email
		cachedDb.createCollection( process.env.DB_USER_COLLECTION, { collation: { locale: "en_US", strength: 2 }});
	}

	return {
		client: cachedClient,
		db    : cachedDb,
	};
}