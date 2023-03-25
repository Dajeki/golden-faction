import { Game } from "./game";
import { Unit } from "./unit";

export class Team {
	name: string;
	#game?: Game;
	#opposingTeam?: Team;
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

	set opposingTeam( team: Team|undefined ) {
		if( !this.#opposingTeam || !team ) {
			this.#opposingTeam = team;
		}
	}
	get opposingTeam(): Team|undefined {
		return this.#opposingTeam;
	}

	findLowestHealthUnit() {
		const firstNotDeadIndex = this.findFirstNotDeadUnitIndex();
		let lowestHealthUnit: Unit | null = this.units[firstNotDeadIndex];
		for( let i = firstNotDeadIndex + 1; i < this.units.length; i++ ) {
			if( lowestHealthUnit.stats.health > this.units[i].stats.health && !this.units[i].isDead ) {
				lowestHealthUnit = this.units[i];
			}
		}
		return lowestHealthUnit;
	}

	findDeadUnit() {
		return this.units.find(( unit )=> unit.isDead );
	}

	findFirstNotDeadUnit() {
		return this.units.find( unit => !unit.isDead );
	}
	findFirstNotDeadUnitIndex() {
		return this.units.findIndex( unit => !unit.isDead );
	}

	getUnitIndex( target:Unit ) {
		return this.units.findIndex(( unit )=>unit === target );
	}
}