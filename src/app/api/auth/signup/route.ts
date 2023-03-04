
import { connectToDatabase } from "@/lib/mongodb";
import { hash } from "bcrypt";
import isValidEmail from "@/lib/isValidEmail";
import { NextRequest } from "next/server";

export async function POST( req: NextRequest ) {
	//Getting email and password from body
	// const { email, password, username } = req.body;
	// console.log( req.body );
	//Validate
	// if( !email || !isValidEmail( email ) || !password  || !username ) {
	// 	res.status( 422 ).json({ message: "Incorrect data format" });
	// 	return;
	// }

	// if( typeof password === "object" || password.length < 8 ) {
	// 	res.status( 422 ).json({ message: "Invalid password format" });
	// 	return;
	// }

	// if( !process.env.DB_USER_COLLECTION ) {
	// 	res.status( 500 ).json({ message: "Internal Server Error"  });
	// 	throw new Error( "Define the DB_USER_COLLECTION environmental variable" );
	// }
	//Connect with database
	// const { db } = await connectToDatabase();
	// const userCollection = db
	// 	.collection( process.env.DB_USER_COLLECTION );

	// const checkExistingEmail = await userCollection.findOne({ email });
	// if( checkExistingEmail ) {
	// 	res.status( 422 ).json({ message: "Email already in use" });
	// 	return;
	// }

	// const checkExistingUsername = await userCollection.findOne({ username });
	// if( checkExistingUsername ) {
	// 	res.status( 422 ).json({ message: "Username already in use" });
	// 	return;
	// }
	// //Hash password
	// const status = await userCollection.insertOne({
	// 	email,
	// 	password: await hash( password, 12 ),
	// 	username,
	// });
	//Send success response
	console.log( req.body.username );
	return new Response( req.body, {
		status: 200,
	});
}
//...status
