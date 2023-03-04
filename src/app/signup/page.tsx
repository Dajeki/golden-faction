"use client";
import { FormEvent, useState } from "react";
import isValidEmail from "@/lib/isValidEmail";

export default function Signup() {
	const [username, setUsername] = useState( "" );
	const [email, setEmail] = useState( "" );
	const [password, setPassword] = useState( "" );
	const [confirmPassword, setConfirmPassword] = useState( "" );
	const [errors, setErrors] = useState<string[]>( [] );

	function handleSubmit( event: FormEvent<HTMLFormElement> ) {
		event.preventDefault();
		const errors = [];

		if( username.trim() === "" ) {
			errors.push( "Name is required" );
		}

		if( email.trim() === "" ) {
			errors.push( "Email is required" );
		}
		else if( !isValidEmail( email.trim())) {
			errors.push( "Invalid email format" );
		}

		if( password.trim() === "" ) {
			errors.push( "Password is required" );
		}
		else if( password.trim().length < 8 ) {
			errors.push( "Password must be at least 8 characters long" );
		}

		if( confirmPassword.trim() === "" ) {
			errors.push( "Confirm password is required" );
		}
		else if( password.trim() !== confirmPassword.trim()) {
			errors.push( "Passwords do not match" );
		}

		setErrors( errors );

		if( errors.length === 0 ) {
			console.log( "Sent the request to the server" );

			/*
			* TODO: send data to server and Reroute to the servers response of either accepted or the reason for rejection
		   */
			fetch( "http://localhost:3000/api/auth/signup", {
				method : "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					username: username,
					password: password,
					email   : email,
				}),
				next: { revalidate: 0 },
			})
				.then( res => res.json())
				.then( data => console.log( data.username, data.password, data.email ));
		}
	}

	return (
		<div>
			<h1>Signup Form</h1>
			{ errors.map(( error, index ) => (
				<p key={ index } style={{ color: "red" }}>
					{ error }
				</p>
			)) }
			<form onSubmit={ handleSubmit }>
				<label htmlFor="name">Name:</label>
				<input
					id="name"
					name="name"
					onChange={ ( event ) => setUsername( event.target.value ) }
					type="text"
					value={ username }
				/>
				<label htmlFor="email">Email:</label>
				<input
					id="email"
					name="email"
					onChange={ ( event ) => setEmail( event.target.value ) }
					type="email"
					value={ email }
				/>
				<label htmlFor="password">Password:</label>
				<input
					id="password"
					name="password"
					onChange={ ( event ) => setPassword( event.target.value ) }
					type="password"
					value={ password }
				/>
				<label htmlFor="confirm-password">Confirm Password:</label>
				<input
					id="confirm-password"
					name="confirm-password"
					onChange={ ( event ) => setConfirmPassword( event.target.value ) }
					type="password"
					value={ confirmPassword }
				/>
				<button type="submit">Signup</button>
			</form>
		</div>
	);
}