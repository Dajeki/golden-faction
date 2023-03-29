import EventEmitter from "node:events";
import { PropertiesOnly } from "../propertiesOnly";
import { Action } from "./action";
import { Stats } from "./stats";
import { Unit } from "./unit";

export class Item {
	name: string;
	stats: Stats;
	private _actions: EventEmitter = new EventEmitter();

	constructor( name: string, attack?: number, health?: number, def?: number, crit?: number, dodge?: number, strikes?: number ) {
		this.name = name;
		this.stats = new Stats( attack, health, def, crit, dodge, strikes );

		this.on( Action.BEFORE_GAME, ( unit ) => {
			( Object.keys( this.stats ) as ( keyof PropertiesOnly<Stats> )[] ).forEach( stat => {
				if( !stat || typeof stat !== "number" ) return;
				const currentStat = this.stats[stat];
				if( !currentStat || typeof this.stats[stat] !== "number" ) return;

				unit?.stats.add( stat, currentStat );
			});
		});
	}

	on( event: keyof typeof Action, callback: ( unit?:Unit )=>void ) {
		this._actions.prependListener( event, callback );
	}

	emit( event: keyof typeof Action, ...eventInfo: [Unit] ) {
		this._actions.emit( event, ...eventInfo );
	}

	getItemName() {
		return this.name;
	}
}