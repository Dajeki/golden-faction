"use client";
import { FormEvent, useState } from "react";
import emailValidator from "@/lib/validation/emailValidator";
import passwordValidator from "@/lib/validation/passwordValidator";
import usernameValidator from "@/lib/validation/usernameValidator";

export default function Signup() {
	const [username, setUsername] = useState( "" );
	const [email, setEmail] = useState( "" );
	const [password, setPassword] = useState( "" );
	const [confirmPassword, setConfirmPassword] = useState( "" );
	const [errors, setErrors] = useState<string[]>( [] );

	function handleSubmit( event: FormEvent<HTMLFormElement> ) {
		event.preventDefault();
		const errors = [];

		const usernameTrimmed = username.trim();
		const emailTrimmed = email.trim();
		const passwordTrimmed = password.trim();
		const confirmPasswordTrimmed = confirmPassword.trim();

		if( usernameTrimmed === "" ) {
			errors.push( "Name is required" );
		}
		else if( !usernameValidator.validate( usernameTrimmed )) {
			errors.push( "Invalid username format" );
		}

		if( emailTrimmed === "" ) {
			errors.push( "Email is required" );
		}
		else if( !emailValidator.validate( emailTrimmed )) {
			errors.push( "Invalid email format" );
		}

		if( passwordTrimmed === "" ) {
			errors.push( "Password is required" );
		}
		else if( !passwordValidator.validate( passwordTrimmed )) {
			errors.push( "Password must be at least 8 characters long and less than 30 characters" );
		}

		if( confirmPasswordTrimmed  === "" ) {
			errors.push( "Confirm password is required" );
		}
		else if( passwordTrimmed !== confirmPasswordTrimmed ) {
			errors.push( "Passwords do not match" );
		}

		setErrors( errors );

		if( errors.length === 0 ) {
			console.log( "Sent the request to the server" );
			// TODO: send data to server and Reroute to the servers response of either accepted or the reason for rejection
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
				cache: "no-cache",
			})
				.then( res => res.json())
				// TODO: Handle error messages to the user
				.then( data => console.log( data.message ));
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