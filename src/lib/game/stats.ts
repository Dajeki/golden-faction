import { PropertiesOnly } from "../propertiesOnly";
import { Action } from "./action";
import { Unit } from "./unit";

export enum Stat {
	HEALTH = "health",
	ATTACK = "attack",
	CRITICAL = "critical",
	DODGE = "dodge",
	DEF = "defense",
	STRIKES = "strikes"
}
export class Stats {

	//these are for sure getting assigned by the default values in the constructor
	#health: number;
	#attack: number;
	#crit: number;
	#dodge: number;
	#defense: number;
	#strikes: number;
	owner?: Unit;

	get health() {
		return this.#health;
	}
	get attack() {
		return this.#attack;
	}
	get crit() {
		return this.#crit;
	}
	get dodge() {
		return this.#dodge;
	}
	get defense() {
		return this.#defense;
	}
	get strikes() {
		return this.#strikes;
	}

	constructor( attack = 1, health = 1, def = 0, crit = 0, dodge = 0, strikes = 1 ) {
		this.#attack = attack;
		this.#health = health;
		this.#defense = def;
		this.#crit = crit;
		this.#dodge = dodge;
		this.#strikes = strikes;
	}

	setOwner( unit: Unit ) {
		this.owner = unit;
	}

	//TS does not reconize the private variable dynamically so we are stuck with a switch *facepalm*
	// TODO: Find a way to access properties dynamically with a public getter and a private setter. Get rid of these darn switch cases.
	add( stat: keyof PropertiesOnly<Stats>, amount: number ) {
		if( amount < 0 ) {
			this.subtract( stat, amount );
			return;
		}

		switch ( stat ) {
		case "attack":
			this.#attack += amount;
			break;
		case "health": {
			this.#health += amount;
			this.owner?.heal( amount );
			break;
		}
		case "defense":
			this.#defense += amount;
			break;
		case "crit":
			this.#crit += amount;
			break;
		case "dodge":
			this.#dodge += amount;
			break;
		case "strikes":
			this.#strikes += amount;
			break;
		}
	}

	subtract( stat: keyof PropertiesOnly<Stats>, amount: number, unitModifying?: Unit )   {
		if( amount <= 0 ) {
			this.add( stat, Math.abs( amount ));
			return;
		}

		switch ( stat ) {
		case "attack":
			this.#attack -= amount;
			break;
		case "health":
			if( !unitModifying ) return;
			this.#health -= amount;
			this.owner?.hurt( amount, unitModifying );
			break;
		case "defense":
			this.#defense -= amount;
			break;
		case "crit":
			this.#crit -= amount;
			break;
		case "dodge":
			this.#dodge -= amount;
			break;
		case "strikes":
			this.#strikes -= amount;
			break;
		}
	}

	toJSON() {
		return {
			health: this.#health,
			attack: this.#attack,
			crit  : this.#crit,
			dodge : this.#dodge,
			def   : this.#defense,
			strike: this.#strikes,
		};
	}
}