import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { connectToDatabase } from "@/lib/mongodb";
import { compare } from "bcrypt";
import { MongoDBAdapter } from "@next-auth/mongodb-adapter";


export default NextAuth({
	//Specify Provider
	providers: [
		MongoDbA({
			async authorize( credentials, req ) {
				//Connect to DB
				const { db } = await connectToDatabase();
				if( !credentials ) {
					throw Error( "No credentials being sent to authorize" );
				}
				//Get all the users
				const userCollection = db.collection( process.env.DB_USER_COLLECTION || "users" );
				//Find user with the email
				const result = await userCollection.findOne({
					email: credentials.email,
				}, { collation: { locale: "en_US", strength: 2 }});
				//Not found - send error res
				if( !result ) {
					throw new Error( "No user found with the email" );
				}
				//Check hased password with DB password
				const checkPassword = await compare( credentials.password, result.password );
				//Incorrect password - send response
				if( !checkPassword ) {
					throw new Error( "Password doesnt match" );
				}
				return { username: result.username, email: result.email };
			},
		}),
	],
});