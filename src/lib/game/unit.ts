import EventEmitter from "node:events";
import { Action } from "./action";
import { Effect, PoisonFangs, Rally, WebWrap } from "./effect";
import { Item } from "./item";
import { Stat, Stats } from "./stats";
import { Team } from "./team";

export class Unit {

	stats: Stats;
	buffs: Effect[] = [];
	debuffs: Effect[] = [];
	items: Item[] = [];
	isFirstAttack = true;
	isDead = false;
	isCrowdControlled = false;
	#team?: Team;

	private _actions:EventEmitter = new EventEmitter();

	constructor( attack?: number, health?: number, def?: number, crit?: number, dodge?: number, strikes?: number ) {
		this.stats = new Stats( attack, health, def, crit, dodge, strikes );

		this.on( Action.FIRST_ATTACK, ( target ) => {
			if( !target ) return;
			this.isFirstAttack = false;
			this.emit( Action.ATTACK, target );
		});

		this.on( Action.ATTACK, ( target ) => {
			if( !target ) return;
			target.stats.subtract( Stat.HEALTH, this.stats.attack );

			console.log( `${ this.constructor.name } on team ${ this.team?.name } did ${ this.stats.attack } with basic attack to ${ target.constructor.name } on team ${ this.team?.opposingTeam?.name }` );
		});
		//Wire up Unit events to your items, buffs and debuffs
		( Object.values( Action ) as ( keyof typeof Action )[] ).forEach( action => {
			this.on( Action[action], () => {
				this.items.forEach( item => {
					item.emit( Action[action], this );
				});

				this.buffs.forEach( effect => {
					effect.emit( Action[action], this );
				});

				this.debuffs.forEach( effect => {
					effect.emit( Action[action], this );
				});
			});
		});

	}

	set team( team: Team | undefined ) {
		if( !this.#team || !team ) {
			this.#team = team;
		}
	}

	get team() {
		return this.#team;
	}

	on( event: keyof typeof Action, callback: ( target?:Unit )=>void ) {
		this._actions.on( event, callback );
	}

	emit( event: keyof typeof Action, ...eventInfo: [Unit] ) {
		this._actions.emit( event, ...eventInfo );
	}

	getUnitName() {
		return this.constructor.name;
	}

	addBuff( buff: Effect ) {
		this.buffs.push( buff );
	}
	addDebuff( debuff: Effect ) {
		this.debuffs.push( debuff );
	}

	removeBuff( buff: Effect ) {
		this.buffs.splice( this.buffs.findIndex(( currentBuff )=> currentBuff === buff ), 1 );
	}
	removeDebuff( debuff: Effect ) {
		this.debuffs.splice( this.debuffs.findIndex(( currentDebuff )=> currentDebuff === debuff ), 1 );
	}

}

//Tier 1 Units

export class Acolyte extends Unit {
	healCoef = .10;
	sancCoef = .05;
	roundsToHeal = 4;

	totalAmountHealed = 0;

	constructor() {
		super( 2, 3 );

		//Healing Flame
		this.on( Action.END_OF_TURN, () => {
			if( !this.team ) return;
			if( this.team.game?.isAppropriateRound( this.roundsToHeal )) return;
			const lowestHealthUnit = this.team.findLowestHealthUnit();
			if( !lowestHealthUnit ) return;

			const healAmount = Math.round( this.stats.attack * this.healCoef );
			lowestHealthUnit.stats.add( "health", healAmount );
			this.totalAmountHealed += healAmount;

			console.log( `${ this.constructor.name } on team ${ this.team?.name } healed ${ lowestHealthUnit } on team ${ this.team?.name } for ${ healAmount }` );
		});

		//Sanctimonious Flame
		this.on( Action.ATTACK, ( target ) => {
			if( !target ) return;
			if( this.totalAmountHealed > target.stats.health ) {
				const extraDamage = Math.round( this.stats.attack * this.sancCoef );
				target.stats.subtract( Stat.HEALTH, extraDamage );

				console.log( `${ this.constructor.name } on team ${ this.team?.name } did ${ extraDamage } with Sanctimonious Flame to ${ target.constructor.name } on team ${ this.team?.opposingTeam?.name }` );
			}
		});
	}
}

export class Goblin extends Unit {
	goldEarned = 0;

	constructor() {
		super( 2, 2 );
		//Pick Pocket
		this.on( Action.ATTACK, ( target ) => {
			this.goldEarned += .5;
		});

		this.on( Action.BEFORE_GAME, ( target ) => {
			//TODO Wire this up to the DB to update the coins they start with on the round.
		});

	}
}

export class LargeSpider extends Unit {
	constructor() {
		super( 2, 2 );

		this.on( Action.FIRST_ATTACK, ( target ) => {
			target?.addDebuff( new WebWrap( this ));
		});
		this.on( Action.ATTACK, ( target ) => {
			target?.addDebuff( new PoisonFangs( this ));
		});

	}
}

export class Rogue extends Unit {
	backstabCoef = .3;
	sneakChance = .5;
	sneakCoef = .5;
	constructor() {
		super( 1, 3 );

		//Sneak Attack
		this.on( Action.FIRST_ATTACK, ( target ) => {
			if( Math.random() >= this.sneakChance ) {
				target?.stats.subtract( Stat.HEALTH, this.stats.attack * this.sneakCoef );
			}
		});
		//Backstab
		this.on( Action.ATTACK, ( target ) => {
			if( !target ) return;
			if( this.stats.attack * 2 < target.stats.health ) {
				target.stats.subtract( Stat.ATTACK, Math.round( this.stats.attack * this.backstabCoef ));
			}
		});
	}
}

export class Warrior extends Unit {
	cleaveCoef = .2;
	constructor() {
		super( 3, 3 );
		this.addBuff( new Rally( this ));
		//Cleave
		this.on( Action.ATTACK, ( target ) => {
			if( !target ) return;

			const targetIndex = target.team?.getUnitIndex( target );
			if( !targetIndex|| !target.team ) return;

			let targetBeforeIndex : number | null = targetIndex - 1;
			targetBeforeIndex = targetBeforeIndex < 0 ? null : targetBeforeIndex;

			let targetAfterIndex : number | null = targetIndex + 1;
			targetAfterIndex = targetAfterIndex > target.team.units.length ? null : targetAfterIndex;

			if( targetBeforeIndex ) {
				target.team.units[targetBeforeIndex].stats.subtract( Stat.HEALTH, Math.round( this.stats.attack * this.cleaveCoef ));
			}

			if( targetAfterIndex ) {
				target.team.units[targetAfterIndex].stats.subtract( Stat.HEALTH, Math.round( this.stats.attack * this.cleaveCoef ));
			}
		});
	}
}

//Tier 2 Units

export class Alchemist extends Unit {
	constructor() {
		super( 3, 6 );
	}
}

export class Druid extends Unit {
	constructor() {
		super( 5, 5 );
	}
}

export class RavenousDog extends Unit {
	constructor() {
		super( 4, 6 );
	}
}

export class Shaman extends Unit {
	constructor() {
		super( 2, 5 );
	}
}

export class Watcher extends Unit {
	constructor() {
		super( 2, 5 );
	}
}

//Tier 3 Units

export class CorruptedWitch extends Unit {
	constructor() {
		super( 6, 7 );
	}
}

export class Mage extends Unit {
	constructor() {
		super( 7, 5 );
	}
}

export class Minotaur extends Unit {
	constructor() {
		super( 6, 7 );
	}
}

export class Paladin extends Unit {
	constructor() {
		super( 5, 8 );
	}
}

//Tier 4 Units

export class OrcWarrior extends Unit {
	constructor() {
		super( 7, 10 );
	}
}

export class TimeKeeper extends Unit {
	constructor() {
		super( 4, 9 );
	}
}

export class Tinkerer extends Unit {
	constructor() {
		super( 3, 7 );
	}
}