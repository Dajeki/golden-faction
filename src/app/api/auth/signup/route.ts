import { connectToDatabase } from "@/lib/mongodb";
import { hash } from "bcryptjs";
import emailValidator from "@/lib/validation/emailValidator";
import usernameValidator from "@/lib/validation/usernameValidator";
import passwordValidator from "@/lib/validation/passwordValidator";
import { NextRequest } from "next/server";
import BadWords from "bad-words";

type signupRequestBody = { email: string; password: string; username: string };

const badWordFilter = new BadWords();

export async function POST( req: NextRequest ) {
	if( !process.env.DB_USER_COLLECTION ) {
		throw new Error( "Need to declare DB_USER_COLLECTION env variable" );
	}
	//Getting email and password from body
	// eslint-disable-next-line prefer-const
	let { email, password, username }: signupRequestBody = await req.json();

	email = email.trim().toLowerCase();
	username = username.trim();

	console.log( email, password, username );
	//Validate
	if( typeof email !== "string" || !emailValidator.validate( email )) {
		return new Response( JSON.stringify({ message: "Incorrect email format" }), {
			status: 422,
		});
	}
	if( emailValidator.isTempEmail( email )) {
		return new Response( JSON.stringify({ message: "The domain provided is a known temp email" }), {
			status: 422,
		});
	}

	if( typeof password !== "string" || !passwordValidator.validate( password )) {
		return new Response( JSON.stringify({ message: "Invalid password format" }), {
			status: 422,
		});
	}


	if( typeof username !== "string" ||  !usernameValidator.validate( username ) || badWordFilter.isProfane( username )) {
		return new Response( JSON.stringify({ message: "Invalid username format" }), {
			status: 422,
		});
	}

	// !REQUIRED: Need to test DB  this to make sure it works.
	//Connect with database
	const { db } = await connectToDatabase();
	const userCollection = db
		.collection( process.env.DB_USER_COLLECTION );

	const checkExistingEmail = await userCollection.findOne({ email });
	if( checkExistingEmail ) {
		return new Response( JSON.stringify({ message: "Email already in use" }), {
			status: 422,
		});
	}

	//case insensitive
	const checkExistingUsername = await userCollection.findOne({ username }, { collation: { locale: "en_US", strength: 2 }});
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
	console.log( status );
	//Send success response
	console.log( "Add user successful" );
	return new Response( JSON.stringify({ message: "Add user successful" }), {
		status: 200,
	});
}
//...status
