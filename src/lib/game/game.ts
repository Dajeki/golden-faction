import { Action } from "./action";
import { Team } from "./team";

export class Game {
	#round = 0;
	#teamOne: Team;
	#teamTwo: Team;
	winner: Team | "draw" | null = null;
	constructor( teamOne: Team, teamTwo: Team, round: number ) {
		this.#teamOne = teamOne;
		this.#teamOne.game = this;
		this.#teamTwo = teamTwo;
		this.#teamTwo.game = this;
		this.#round = round;

		this.run();
	}

	get round() {
		return this.#round;
	}

	isAppropriateRound( everyXTurns: number ) {
		return Boolean( !( this.round % everyXTurns ));
	}

	run() {
		let teamOneHasAliveUnits = true;
		let teamTwoHasAliveUnits = true;
		let firstAliveTeamOne = this.#teamOne.units.find( unit => !unit.isDead );
		let firstAliveTeamTwo = this.#teamTwo.units.find( unit => !unit.isDead );

		if( !firstAliveTeamOne || !firstAliveTeamTwo ) {
			return;
		}
		//both of these are definitely not undefined. There is a return outside the while loop and one at the end of this loop to catch it
		this.#teamOne.units.forEach(( unit, indx ) => {
			unit.emit( Action.BEFORE_GAME, firstAliveTeamTwo! );
		});
		this.#teamTwo.units.forEach(( unit, indx ) => {
			unit.emit( Action.BEFORE_GAME, firstAliveTeamOne! );
		});
		// eslint-disable-next-line no-constant-condition
		while( true ) {
			console.log( `START OF ROUND: ${ this.#round }` );
			this.#round++;

			this.#teamOne.units.forEach(( unit, indx ) => {
				unit.emit( Action.START_OF_TURN, firstAliveTeamTwo! );
			});
			this.#teamTwo.units.forEach(( unit, indx ) => {
				unit.emit( Action.START_OF_TURN, firstAliveTeamOne! );
			});

			firstAliveTeamOne.emit( Action.BEFORE_ATTACK, firstAliveTeamTwo );
			firstAliveTeamTwo.emit( Action.BEFORE_ATTACK, firstAliveTeamOne );

			if( firstAliveTeamOne.isFirstAttack ) {
				firstAliveTeamOne.emit( Action.FIRST_ATTACK, firstAliveTeamTwo );
			}
			else {
				firstAliveTeamOne.emit( Action.ATTACK, firstAliveTeamTwo );
			}

			if( firstAliveTeamTwo.isFirstAttack ) {
				firstAliveTeamTwo.emit( Action.FIRST_ATTACK, firstAliveTeamOne );
			}
			else {
				firstAliveTeamTwo.emit( Action.ATTACK, firstAliveTeamOne );
			}

			firstAliveTeamOne.emit( Action.AFTER_ATTACK, firstAliveTeamTwo );
			firstAliveTeamTwo.emit( Action.AFTER_ATTACK, firstAliveTeamOne );

			this.#teamOne.units.forEach( unit => {
				unit.emit( Action.END_OF_TURN, firstAliveTeamTwo! );
			});
			this.#teamTwo.units.forEach( unit => {
				unit.emit( Action.END_OF_TURN, firstAliveTeamOne! );
			});

			this.#teamOne.units.forEach( unit=>{
				if( unit.stats.health <= 0 ) {
					unit.isDead = true;
				}
			});
			this.#teamTwo.units.forEach( unit=>{
				if( unit.stats.health <= 0 ) {
					unit.isDead = true;
				}
			});

			//REFACTOR Maybe a way to combine these two for loops. Although small could be optimized if an issue.
			//At the end of everything check for any dead teams.
			teamOneHasAliveUnits = this.#teamOne.units.some( unit => !unit.isDead );
			teamTwoHasAliveUnits = this.#teamTwo.units.some( unit => !unit.isDead );

			if( !teamOneHasAliveUnits && !teamTwoHasAliveUnits ) {
				this.winner = "draw";
				return;
			}
			else if( !teamOneHasAliveUnits ) {
				this.winner = this.#teamTwo;
				return;
			}
			else if( !teamTwoHasAliveUnits ) {
				this.winner = this.#teamOne;
				return;
			}

			firstAliveTeamOne = this.#teamOne.units.find( unit => !unit.isDead );
			firstAliveTeamTwo = this.#teamTwo.units.find( unit => !unit.isDead );
			if( !firstAliveTeamOne || !firstAliveTeamTwo ) {
				return;
			}
		}
	}
}
