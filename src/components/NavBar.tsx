"use client";
import { useRouter } from "next/navigation";
import styles from "./NavBar.module.css";

export default function NavBar() {
	const router = useRouter();

	return (
		<nav className={ styles.bar }>
			<button onClick={ () => router.push( "/logon" ) } type="button">
				Log On
			</button>
			<button onClick={ () => router.push( "/signup" ) } type="button">
				Sign Up
			</button>
		</nav>
	);
}
