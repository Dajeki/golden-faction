import { getServerSession } from "next-auth";

export default async function Play() {
	const session = await getServerSession();

	if( session ) {
		return (
			<div>logged in</div>
		);
	}

	return <div>Not logged in</div>;

}