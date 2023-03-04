import tempEmails from "@/lib/tempEmailDomains.json";

const tempEmailsSet = new Set( tempEmails );
const tester = /^[-!#$%&'*+/0-9=?A-Z^_a-z{|}~](\.?[-!#$%&'*+/0-9=?A-Z^_a-z`{|}~])*@[a-zA-Z0-9](-*\.?[a-zA-Z0-9])*\.[a-zA-Z](-?[a-zA-Z0-9])+$/;
// Thanks to:
// http://fightingforalostcause.net/misc/2006/compare-email-regex.php
// http://thedailywtf.com/Articles/Validating_Email_Addresses.aspx
// http://stackoverflow.com/questions/201323/what-is-the-best-regular-expression-for-validating-email-addresses/201378#201378
export function validate( email : string ) : boolean {
	if( !email ) { return false; }

	if( email.length>254 ) { return false; }

	const valid = tester.test( email );
	if( !valid ) { return false; }

	// Further checking of some things regex can't handle
	const parts = email.split( "@" );
	if( parts[0].length>64 ) { return false; }

	const domainParts = parts[1].split( "." );
	if( domainParts.some( function ( part ) { return part.length>63; })) { return false; }

	return true;
}

export function isTempEmail( email: string ): boolean {
	const domain = email.split( "@" ).at( -1 );
	if( !domain ) {
		//if we get here and validate for some reason doesnt pick it up send true so that this check causes the error.
		return true;
	}
	return tempEmailsSet.has( domain );
}

// eslint-disable-next-line import/no-anonymous-default-export
export default {
	validate,
	isTempEmail,
};


// export default function isValidEmail( email: string ): boolean {
// 	const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// 	return emailRegex.test( email );
// }