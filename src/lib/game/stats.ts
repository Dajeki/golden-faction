import { PropertiesOnly } from "../propertiesOnly";
import { Action } from "./action";
import { Unit } from "./unit";

export enum Stat {
	HEALTH = "health",
	ATTACK = "attack",
	CRITICAL = "crit",
	DODGE = "dodge",
	DEF = "def",
	STRIKES = "strikes"
}
export class Stats {

	//these are for sure getting assigned by the default values in the constructor
	#health: number;
	#attack: number;
	#crit: number;
	#dodge: number;
	#def: number;
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
	get def() {
		return this.#def;
	}
	get strikes() {
		return this.#strikes;
	}

	constructor( attack = 1, health = 1, def = 0, crit = 0, dodge = 0, strikes = 1 ) {
		this.#attack = attack;
		this.#health = health;
		this.#def = def;
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
		switch ( stat ) {
		case "attack":
			this.#attack += amount;
			break;
		case "health":
			if( this.owner ) {
				this.owner.emit( Action.BEFORE_TAKE_DAMAGE, this.owner );
				this.#health += amount;
				this.owner.emit( Action.AFTER_TAKE_DAMAGE, this.owner );
				if( this.owner.isFirstDamageTaken ) {
					this.owner.emit( Action.FIRST_TAKE_DAMAGE, this.owner );
				}
			}
			break;
		case "def":
			this.#def += amount;
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

	subtract( stat: keyof PropertiesOnly<Stats>, amount: number ) {
		switch ( stat ) {
		case "attack":
			this.#attack -= amount;
			break;
		case "health":
			this.#health -= amount;
			break;
		case "def":
			this.#def -= amount;
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
}