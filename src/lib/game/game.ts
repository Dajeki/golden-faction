import { Action } from "./action";
import { Team } from "./team";

export enum GameAction {
	BASIC_ATTACK = "basicAttack",
	RESURRECT = "res",
	DIE = "die",
	KILLED_UNIT = "killedUnit",
	HEALING_FLAME = "healingFlame",
	SANCTIMONIOUS_FLAME = "sanctimoniousFlame",
	SNEAK_ATTACK = "sneakAttack",
	BACKSTAB = "backstab",
	CLEAVE = "cleave",
	HEALING_MIST = "healingMist",
	FRENZY = "frenzy",
	FEEDING_FRENZY = "feedingFrenzy",
	HEALING_AURA = "healingAura",
	ANCESTRAL_GUIDANCE = "ancestralGuidance",
	STARE_DOWN = "stareDown",
	VISIONARY_INCREASE = "visionaryIncrease",
	FEED_OFF_SUFFERING = "feedSuffering",
	FIREBALL = "fireball",
	ARCANE_MASTERY = "arcaneMastery",
	TRAMPLE = "trample",
	HEADBUTT = "headbutt",
	DIVINE_RECOIL = "divineRecoil",
	HOLY_SHIELD = "holyShield",
	BLOODLUST = "bloodlust",
	OVERPOWER = "overpower",
	TIME_WARP = "timeWarp",
	TEMPORAL_SHIELD = "temporalShield",
}
export enum GameActionStat {
	CURRENT_HEALTH = "currentHealth",
	ATTACK = "attack",
	HEALTH = "health",
	CRITICAL = "critical",
	DODGE = "dodge",
	DEF = "defense",
	STRIKES = "strikes",
	SHIELD = "shield",
	POSITION = "position",
	BUFF = "buff",
	DEBUFF = "debuff",
	DURATION = "duration",
	CONTROL = "cc",
}

export interface GameStep {
	uuid: string;
	action: {
		name: GameAction;
		amount: number;
		stat: GameActionStat;
	};
	target: {
		uuid: string;
	},
	text: string;
}



export class Game {
	#round = 0;
	#teamOne: Team;
	#teamTwo: Team;
	outcome: {
		winner: Team | "draw" | null;
		loser: Team | "draw" | null
	} = {
			winner: null,
			loser : null,
		};

	beforeGameSteps: GameStep[] = [];
	//first index is the turn second index is the action the units take
	gameSteps: GameStep[][] = [];

	constructor( teamOne: Team, teamTwo: Team, round: number ) {
		this.#teamOne = teamOne;
		this.#teamOne.game = this;
		this.#teamTwo = teamTwo;
		this.#teamTwo.game = this;
		this.#round = round;

		this.run();
	}
	get teamOne() {
		return this.#teamOne;
	}
	get teamTwo() {
		return this.#teamTwo;
	}

	addBeforeGameStep(
		uuid: string,
		actionName: GameAction,
		actionAmount: number,
		actionEffect: GameActionStat,
		targetUuid: string,
		text: string,
	) {
		this.beforeGameSteps.push({
			uuid,
			action: {
				name  : actionName,
				amount: actionAmount,
				stat  : actionEffect,
			},
			target: {
				uuid: targetUuid,
			},
			text: text,
		});
	}

	addGameStep(
		uuid: string,
		actionName: GameAction,
		actionAmount: number,
		actionEffect: GameActionStat,
		targetUuid: string,
		text: string,
	) {
		//The array for adding the round will be available at the beggining of inside the loop
		this.gameSteps[this.#round-1].push({
			uuid,
			action: {
				name  : actionName,
				amount: actionAmount,
				stat  : actionEffect,
			},
			target: {
				uuid: targetUuid,
			},
			text: text,
		});
	}

	get round() {
		return this.#round;
	}

	run() {
		let teamOneHasAliveUnits = true;
		let teamTwoHasAliveUnits = true;
		let firstAliveTeamOne = this.#teamOne.findFirstAliveUnit();
		let firstAliveTeamTwo = this.#teamTwo.findFirstAliveUnit();

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

		//REFACTOR rewrite this async with setInterval so that the loop can run if something else needs to.
		// eslint-disable-next-line no-constant-condition
		while( true && this.#round <= 600 ) {
			console.log( `START OF ROUND: ${ this.#round }` );
			this.gameSteps.push( [] as GameStep[] );
			this.#round++;

			this.#teamOne.units.forEach(( unit, indx ) => {
				if( unit.isDead ) return;
				unit.emit( Action.START_OF_TURN, firstAliveTeamTwo! );
			});

			this.#teamTwo.units.forEach(( unit, indx ) => {
				if( unit.isDead ) return;
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
				if( unit.isDead ) return;
				unit.emit( Action.END_OF_TURN, firstAliveTeamTwo! );
			});
			this.#teamTwo.units.forEach( unit => {
				if( unit.isDead ) return;
				unit.emit( Action.END_OF_TURN, firstAliveTeamOne! );
			});

			this.#teamOne.units.forEach( unit =>{
				if( !unit.isDead && unit.currentHealth <= 0 ) {
					unit.isDead = true;
					unit.killer?.emit( Action.KILLED_UNIT, unit );
					unit.emit( Action.DIE, firstAliveTeamTwo! );

					this.addGameStep(
						unit.killer?.uuid || "",
						GameAction.KILLED_UNIT,
						0,
						GameActionStat.HEALTH,
						unit.uuid,
						`${ unit.killer?.name } on team ${ unit.killer?.team?.name } killed ${ unit.name } on team ${ unit.team?.name }`,
					);
					console.log( `${ unit.killer?.name } on team ${ unit.killer?.team?.name } killed ${ unit.name } on team ${ unit.team?.name }` );
				}
			});
			this.#teamTwo.units.forEach( unit =>{
				if( !unit.isDead && unit.currentHealth <= 0 ) {
					unit.isDead = true;
					unit.killer?.emit( Action.KILLED_UNIT, unit );
					unit.emit( Action.DIE, firstAliveTeamOne! );
					this.addGameStep(
						unit.killer?.uuid || "",
						GameAction.KILLED_UNIT,
						0,
						GameActionStat.HEALTH,
						unit.uuid,
						`${ unit.killer?.name } on team ${ unit.killer?.team?.name } killed ${ unit.name } on team ${ unit.team?.name }`,
					);
					console.log( `${ unit.killer?.name } on team ${ unit.killer?.team?.name } killed ${ unit.name } on team ${ unit.team?.name }` );
				}
			});

			//REFACTOR Maybe a way to combine these two for loops. Although small could be optimized if an issue.
			//At the end of everything check for any dead teams.
			teamOneHasAliveUnits = this.#teamOne.units.some( unit => !unit.isDead );
			teamTwoHasAliveUnits = this.#teamTwo.units.some( unit => !unit.isDead );

			if( !teamOneHasAliveUnits && !teamTwoHasAliveUnits ) {
				this.outcome.winner = "draw";
				this.outcome.loser = "draw";
				return;
			}
			else if( !teamOneHasAliveUnits ) {
				this.outcome.winner = this.#teamTwo;
				this.outcome.loser = this.#teamOne;
				return;
			}
			else if( !teamTwoHasAliveUnits ) {
				this.outcome.winner = this.#teamOne;
				this.outcome.loser = this.#teamTwo;
				return;
			}

			firstAliveTeamOne = this.#teamOne.findFirstAliveUnit();
			firstAliveTeamTwo = this.#teamTwo.findFirstAliveUnit();
			if( !firstAliveTeamOne || !firstAliveTeamTwo ) {
				return;
			}
			// console.log( this.#teamOne.toString(), this.#teamTwo.toString());
		}
	}
}
