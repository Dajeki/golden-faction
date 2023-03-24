import EventEmitter from "node:events";
import { Action } from "./action";
import { Stats } from "./stats";

export class Item {
	name: string;
	stats: Stats;
	private _actions: EventEmitter = new EventEmitter();

	constructor( name: string, stats: Stats ) {
		this.name = name;
		this.stats = stats;
	}

	on( event: keyof typeof Action, callback: ()=>void ) {
		this._actions.on( event, callback );
	}
}