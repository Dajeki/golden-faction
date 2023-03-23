import EventEmitter from "node:events";
import { Effect } from "./effect";

class Stats {
	health = 1;
	attack = 1;
	crit = 0;
	dodge = 0;
	def = 0;
	strikes = 1;
}

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