import { Game } from "./game";
import { Unit } from "./unit";

export class Team {
	name: string;
	#game?: Game;
	units: Unit[];
	constructor( name: string, ...units: Unit[] ) {
		this.name = name;
		units.forEach( unit => unit.team = this );
		this.units = units;
	}

	set game( game: Game|undefined ) {
		if( !this.#game || !game ) {
			this.#game = game;
		}
	}

	get game(): Game|undefined {
		return this.#game;
	}

	findLowestHealthUnit() {
		let lowestHealthUnit = this.units[0];
		for( let i = 1; i < this.units.length; i++ ) {
			lowestHealthUnit = lowestHealthUnit.stats.health <= this.units[i].stats.health
				? lowestHealthUnit : this.units[i];
		}
		return lowestHealthUnit;
	}

	findDeadUnit() {
		return this.units.find(( unit )=>unit.isDead );
	}
}