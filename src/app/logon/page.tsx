"use client";
import React, { FormEvent, useState } from "react";
import { signIn, useSession } from "next-auth/react";
//...

export default function Login() {
	const [email, setEmail] = useState( "" );
	const [password, setPassword] = useState( "" );
	const [error, setError] = useState<null | string>( null );

	const { data: session, status } = useSession();

	async function handleSubmit( event: FormEvent<HTMLFormElement> ) {
		event.preventDefault();
		if( email.trim()==="" ) {
			setError( "Username is required" );
			return;
		}

		if( password.trim()==="" ) {
			setError( "Password is required" );
			return;
		}

		// Send login data to server
		// ...
		console.log( "sent to server!" );
		const status = await signIn( "credentials", {
			redirect   : true,
			callbackUrl: "/",
			email      : email,
			password   : password,
		});
		console.log( status );
	}

	return (
		<div>
			<h1>Login Form</h1>
			{
				error && (
					<p
						style={{
							color: "red",
						}}
					>
						{ error }
					</p>
				)
			}
			<form
				onSubmit={
					handleSubmit
				}
			>
				<label htmlFor="username">Username:</label>
				<input
					id="username"
					name="username"
					onChange={
						( event )=> setEmail( event.target.value )
					}
					type="text"
					value={
						email
					}
				/>
				<label htmlFor="password">Password:</label>
				<input
					id="password"
					name="password"
					onChange={
						( event )=> setPassword( event.target.value )
					}
					type="password"
					value={
						password
					}
				/>
				<button type="submit">Login</button>
			</form>
			{ session && (
				<div>
					{ `Signed in as ${ session.username } with id ${ session.id }` }
				</div>
			) }
		</div>
	);
}