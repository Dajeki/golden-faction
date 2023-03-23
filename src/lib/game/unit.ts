import EventEmitter from "node:events";
import { Effect } from "./effect";
import { Item } from "./item";
import { Stats } from "./stats";

export class Unit {

	stats: Stats;
	buffs: Effect[] = [];
	debuffs: Effect[] = [];
	items: Item[] = [];
	firstAttack = true;
	dead = false;
	actions:EventEmitter = new EventEmitter();

	constructor( stats: Stats ) {
		this.stats = { ...new Stats(), ...stats };
	}
}