import EventEmitter from "node:events";
import { Stats } from "./stats";

export class Item {
	name: string;
	stats: Stats;
	private _actions: EventEmitter = new EventEmitter();

	constructor( name: string, stats: Stats ) {
		this.name = name;
		this.stats = { ...new Stats(), ...stats };
	}
}