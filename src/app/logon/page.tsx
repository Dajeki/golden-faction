"use client";
import React, { FormEvent, useState } from "react";

export default function Login() {
	const [username, setUsername] = useState( "" );
	const [password, setPassword] = useState( "" );
	const [error, setError] = useState<null|string>( null );

	function handleSubmit( event: FormEvent<HTMLFormElement> ) {
		event.preventDefault();
		if( username.trim()==="" ) {
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
						( event )=> setUsername( event.target.value )
					}
					type="text"
					value={
						username
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
		</div>
	);
}