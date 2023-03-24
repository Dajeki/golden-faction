import { Team } from "./team";

export class Game {
	#round = 0;
	#teamOne: Team;
	#teamTwo: Team;
	constructor( teamOne: Team, teamTwo: Team, round: number ) {
		this.#teamOne = teamOne;
		this.#teamOne.game = this;
		this.#teamTwo = teamTwo;
		this.#teamTwo.game = this;
		this.#round = round;
	}

	get round() {
		return this.#round;
	}

	isAppropriateRound( everyXTurns: number ) {
		return Boolean( this.round && !( this.round % everyXTurns ));
	}
}