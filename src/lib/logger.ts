import * as fs from "fs";

const logFile = fs.createWriteStream( "logs/game_log.txt", { flags: "w" });
const origConsole = console;


const consoleProxy: typeof console = new Proxy( console, {
	get( target, property, receiver ) {
		const origMethod = target[property as keyof typeof target];
		if( property === "log" ) {
			return function ( ...args: unknown[] ) {
				const formattedArgs = args.map( arg =>
					typeof arg === "string" ? arg : JSON.stringify( arg ),
				);
				const message = formattedArgs.join( " " );
				logFile.write( `${ message  }\n` );
				// eslint-disable-next-line @typescript-eslint/ban-types
				( origMethod as Function ).apply( target, args );
			};
		}
		else {
			return origMethod;
		}
	},
});

export function startLogging() {
	// eslint-disable-next-line no-global-assign
	console = consoleProxy;
}

export function stopLogging() {
	// eslint-disable-next-line no-global-assign
	console = origConsole;
}

