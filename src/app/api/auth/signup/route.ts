
import { connectToDatabase } from "@/lib/mongodb";
import { hash } from "bcrypt";
import emailValidator from "@/lib/emailValidator";
import { NextRequest } from "next/server";

const invalidUsernameInclusion = new Set( [
	"admin",
	"root",
	"guest",
	"user",
] );

type signupRequestBody = { email: string; password: string; username: string };

//this is the reason for the non-null assert in TS
if( !process.env.DB_USER_COLLECTION ) {
	throw new Error( "Need to declare DB_USER_COLLECTION env variable" );
}

export async function POST( req: NextRequest ) {
	//Getting email and password from body
	// eslint-disable-next-line prefer-const
	let { email, password, username }: signupRequestBody = await req.json();

	email = email.trim().toLowerCase();
	username = username.trim();

	console.log( email, password, username );
	//Validate
	if( !email || typeof email !== "string" || !emailValidator.validate( email )) {
		return new Response( JSON.stringify({ message: "Incorrect email format" }), {
			status: 422,
		});
	}
	if( emailValidator.isTempEmail( email )) {
		return new Response( JSON.stringify({ message: "The domain provided is a known temp email" }), {
			status: 422,
		});
	}

	if( !password || typeof password !== "string" || password.length < 8 ) {
		return new Response( JSON.stringify({ message: "Invalid password format" }), {
			status: 422,
		});
	}

	if( !username || typeof username !== "string" || username.length < 4 || username.length > 30 ) {
		return new Response( JSON.stringify({ message: "Invalid username format" }), {
			status: 422,
		});
	}

	//Connect with database
	const { db } = await connectToDatabase();
	const userCollection = db
		//check located on top of file to error if not set
		// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
		.collection( process.env.DB_USER_COLLECTION! );

	const checkExistingEmail = await userCollection.findOne({ email });
	if( checkExistingEmail ) {
		return new Response( JSON.stringify({ message: "Email already in use" }), {
			status: 422,
		});
	}

	const checkExistingUsername = await userCollection.findOne({ username });
	if( checkExistingUsername ) {
		return new Response( JSON.stringify({ message: "Username already in use" }), {
			status: 422,
		});
	}

	//Hash password
	const status = await userCollection.insertOne({
		email,
		password: await hash( password, 12 ),
		username,
	});
	//Send success response
	console.log( "Add user successful" );
	return new Response( JSON.stringify({ message: "Add user successful" }), {
		status : 200,
		headers: {
			"Content-Type": "application/json",
		},
	});
}
//...status
