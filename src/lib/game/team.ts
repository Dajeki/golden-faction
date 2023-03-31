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

	addUnitEnd( unit: Unit ) {
		this.units.push( unit );
	}
	addUnitFront( unit: Unit ) {
		this.units.unshift( unit );
	}
	//0 based indexing
	addUnit( unit: Unit, position: number ) {
		this.units.splice( position, 0, unit );
	}
	removeUnit( unit: Unit ) {
		this.units.splice( this.units.findIndex(( teamUnit ) => teamUnit === unit ), 1 );
	}

	findLowestHealthUnit() {
		const firstNotDeadIndex = this.findFirstAliveUnitIndex();
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

	findFirstAliveUnit() {
		return this.units.find( unit => !unit.isDead );
	}
	findFirstAliveUnitIndex() {
		return this.units.findIndex( unit => !unit.isDead );
	}

	getUnitIndex( target:Unit ) {
		return this.units.findIndex(( unit )=>unit === target );
	}

	getAliveUnitAroundTarget( target: Unit ) {
		const targetIndex = target.team?.getUnitIndex( target );
		if( targetIndex === undefined || !target.team ) {
			return {
				ahead : null,
				behind: null,
			};
		}

		let targetBeforeIndex: number | null = targetIndex - 1;
		let targetBefore: Unit | null = null;
		do {
			targetBeforeIndex = targetBeforeIndex < 0 ? null : targetBeforeIndex;
			if( targetBeforeIndex === null ) {
				targetBefore = null;
				break;
			}
			if( this.units[targetBeforeIndex].isDead ) {
				targetBeforeIndex--;
				continue;
			}
			targetBefore = this.units[targetBeforeIndex];

		} while( !targetBefore );

		let targetAfterIndex: number | null = targetIndex + 1;
		let targetAfter: Unit | null = null;
		do {
			targetAfterIndex = targetAfterIndex > this.units.length - 1 ? null : targetAfterIndex;
			if( targetAfterIndex === null ) {
				targetAfter = null;
				break;
			}
			if( this.units[targetAfterIndex].isDead ) {
				targetAfterIndex++;
				continue;
			}
			targetAfter = this.units[targetAfterIndex];

		} while( !targetAfter );

		//REFACTOR Try to think of a nicer way to write this...
		return {
			ahead : targetBefore,
			behind: targetAfter,
		};
	}

	toString() {
		return JSON.stringify({
			name: this.name,
			team: this.units.map( units => ({
				name  : units.name,
				health: units.currentHealth,
				dead  : units.isDead,
			})),
		}, null, 4 );
	}
}