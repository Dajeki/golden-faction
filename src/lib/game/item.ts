import EventEmitter from "node:events";
import { PropertiesOnly } from "../propertiesOnly";
import { Action } from "./action";
import { Stats } from "./stats";
import { Unit } from "./unit";

export class Item {
	name: string;
	stats: Stats;
	private _actions: EventEmitter = new EventEmitter();

	constructor( name: string, stats: Stats ) {
		this.name = name;
		this.stats = stats;

		this.on( Action.BEFORE_GAME, ( unit ) => {
			( Object.keys( this.stats ) as ( keyof PropertiesOnly<Stats> )[] ).forEach( stat => {
				unit?.stats.add( stat, this.stats[stat] );
			});
		});
	}

	on( event: keyof typeof Action, callback: ( unit?:Unit )=>void ) {
		this._actions.on( event, callback );
	}

	emit( event: keyof typeof Action, ...eventInfo: [Unit] ) {
		this._actions.emit( event, ...eventInfo );
	}

	getItemName() {
		return this.name;
	}
}