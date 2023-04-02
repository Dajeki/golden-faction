import { getServerSession } from "next-auth";
import styles from "./play.module.css";

export default async function Play() {
	const session = await getServerSession();

	if( session ) {
		return (
			<div>logged in</div>
		);
	}

	return (
		<></>
	);
	// return <div>Not logged in</div>;

}