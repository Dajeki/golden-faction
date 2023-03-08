export function validate( password: string ): boolean {
	if( !password ) { return false; }
	if( password.length > 30 || password.length < 8 ) { return false; }
	return true;
}

export default {
	validate,
};