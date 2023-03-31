"use client";
import { getSession, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import styles from "./NavBar.module.css";
import { signOut } from "next-auth/react";
import { useEffect, useState } from "react";

export const revalidate = 0;

export default function NavBar() {
	const router = useRouter();
	const { data: session } = useSession();

	return (
		<nav className={ styles.bar }>
			{ session && (
				<>
					<button onClick={ () => router.push( "/play" ) } type="button">
						Play Game
					</button>
					<button onClick={ () => { signOut(); } }>Logout</button>
				</>
			) }
			{ !session && (
				<>
					<button onClick={ () => router.push( "/logon" ) } type="button">
						Log On
					</button>
					<button onClick={ () => router.push( "/signup" ) } type="button">
						Sign Up
					</button>
				</>
			) }

		</nav>
	);
}
