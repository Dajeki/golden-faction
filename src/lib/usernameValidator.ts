const tester = /^[a-zA-z0-9_]+$/; //Username can only be alphanumeric and _

export function validate( username: string ): boolean {
	if( !username ) { return false; }

	if( username.length > 30 || username.length < 4 ) { return false; }

	const valid = tester.test( username );
	if( !valid ) { return false; }

	return true;
}


export default {
	validate,
};