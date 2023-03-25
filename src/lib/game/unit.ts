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
	isFirstDamageTaken = true;
	isDead = false;
	isCrowdControlled = false;
	#team?: Team;

	private _actions:EventEmitter = new EventEmitter();

	constructor( attack?: number, health?: number, def?: number, crit?: number, dodge?: number, strikes?: number ) {
		this.stats = new Stats( attack, health, def, crit, dodge, strikes );
		this.stats.setOwner( this );

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

		//fire off the After Unit Behind and Attack events after the unit attacks
		this.on( Action.AFTER_ATTACK, () => {
			const thisUnitsIndex = this.team?.getUnitIndex( this );
			if( !thisUnitsIndex|| !this.team ) return;

			let targetBeforeIndex : number | null = thisUnitsIndex - 1;
			targetBeforeIndex = targetBeforeIndex < 0 ? null : targetBeforeIndex;

			let targetAfterIndex : number | null = thisUnitsIndex + 1;
			targetAfterIndex = targetAfterIndex >= this.team.units.length ? null : targetAfterIndex;

			//target before means this unit is behind
			if( targetBeforeIndex ) {
				this.team.units[targetBeforeIndex].emit( Action.AFTER_UNIT_BEHIND_ATTACK, this );
			}

			//target after means that this unit is ahead
			if( targetAfterIndex ) {
				this.team.units[targetAfterIndex].emit( Action.AFTER_UNIT_AHEAD_ATTACK, this );
			}
		});
		//Wire up Unit events to your items, buffs and debuffs
		//They get the object they are on as the unit into the hadler


		( Object.values( Action ) as ( keyof typeof Action )[] ).forEach( action => {
			this.on( Action[action], () => {

				let lastItemLength = this.items.length;
				let lastBuffLength = this.buffs.length;
				let lastDebuffLength = this.debuffs.length;
				for(
					let i = 0;
					lastItemLength && i < this.items.length;
					i = lastItemLength < this.items.length ? i : i++
				) {
					console.log( lastDebuffLength );
					this.items[i].emit( Action[action], this );
					lastItemLength = this.items.length;
				}
				for( let i = 0;
					lastItemLength && i < this.buffs.length;
					i = lastBuffLength < this.buffs.length ? i : i++
				) {
					this.buffs[i].emit( Action[action], this );
					lastBuffLength = this.buffs.length;
				}
				for(
					let i = 0;
					lastItemLength && i < this.debuffs.length;
					i = lastDebuffLength < this.debuffs.length ? i : i++
				) {

					this.debuffs[i].emit( Action[action], this );
					lastDebuffLength = this.debuffs.length;
				}
				// this.items.forEach( item => {
				// 	item.emit( Action[action], this );
				// });

				// this.buffs.forEach( effect => {
				// 	effect.emit( Action[action], this );
				// });

				// this.debuffs.forEach( effect => {
				// 	effect.emit( Action[action], this );
				// });
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
		if( this.isDead ) return;
		if( event !== Action.START_OF_TURN && event !== Action.END_OF_TURN && this.isCrowdControlled ) return;
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
		console.log( `indx to remove: ${ this.buffs.findIndex(( currentBuff )=> currentBuff === buff ) }` );
		this.buffs.splice( this.buffs.findIndex(( currentBuff )=> currentBuff === buff ), 1 );
	}
	removeDebuff( debuff: Effect ) {
		console.log( `indx to remove: ${ this.debuffs.findIndex(( currentDebuff )=> currentDebuff === debuff ) }` );
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
		super( 2, 3 * 5 );

		//Healing Flame
		this.on( Action.END_OF_TURN, () => {
			if( !this.team ) return;
			if( !this.team.game?.isAppropriateRound( this.roundsToHeal )) return;
			const lowestHealthUnit = this.team.findLowestHealthUnit();
			if( !lowestHealthUnit ) return;

			const healAmount = Math.ceil( this.stats.attack * this.healCoef );
			lowestHealthUnit.stats.add( Stat.HEALTH, healAmount );
			this.totalAmountHealed += healAmount;

			console.log( `${ this.constructor.name } on team ${ this.team?.name } healed ${ lowestHealthUnit.getUnitName() } on team ${ this.team?.name } for ${ healAmount }` );
		});

		//Sanctimonious Flame
		this.on( Action.ATTACK, ( target ) => {
			if( !target ) return;
			if( this.totalAmountHealed > target.stats.health ) {
				const extraDamage = Math.ceil( this.stats.attack * this.sancCoef );
				target.stats.subtract( Stat.HEALTH, extraDamage );

				console.log( `${ this.constructor.name } on team ${ this.team?.name } did ${ extraDamage } with Sanctimonious Flame to ${ target.constructor.name } on team ${ this.team?.opposingTeam?.name }` );
			}
		});
	}
}

export class Goblin extends Unit {
	goldEarned = 0;

	constructor() {
		super( 2, 2 * 5 );
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
		super( 2, 2 * 10  );

		// this.on( Action.FIRST_ATTACK, ( target ) => {
		// 	target?.addDebuff( new WebWrap( this ));
		// });
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
		super( 1, 3 * 5  );

		//Sneak Attack
		this.on( Action.FIRST_ATTACK, ( target ) => {
			if( Math.random() >= this.sneakChance ) {
				const sneakDamage = Math.ceil( this.stats.attack * this.sneakCoef );
				target?.stats.subtract( Stat.HEALTH, sneakDamage );
				console.log( `${ this.getUnitName() } on team ${ this.team?.name } did ${ sneakDamage } with Sneak Attack to ${ target?.getUnitName() } on team ${ this.team?.opposingTeam?.name }` );
			}
		});
		//Backstab
		this.on( Action.ATTACK, ( target ) => {
			if( !target ) return;
			if( this.stats.attack * 2 < target.stats.health ) {
				const backstabDamage = Math.ceil( this.stats.attack * this.backstabCoef );
				target.stats.subtract( Stat.HEALTH, backstabDamage );
				console.log( `${ this.getUnitName() } on team ${ this.team?.name } did ${ backstabDamage } with Backstab to ${ target?.getUnitName() } on team ${ this.team?.opposingTeam?.name }` );
			}
		});
	}
}

export class Warrior extends Unit {
	cleaveCoef = .2;
	constructor() {
		super( 3, 3 * 5  );
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

			const cleaveDamage = Math.ceil( this.stats.attack * this.cleaveCoef );

			if( targetBeforeIndex ) {
				target.team.units[targetBeforeIndex].stats.subtract( Stat.HEALTH, cleaveDamage );
				console.log( `${ this.getUnitName() } on team ${ this.team?.name } did ${ cleaveDamage } with Cleave to ${ target.team.units[targetBeforeIndex].getUnitName() } on team ${ this.team?.opposingTeam?.name }` );
			}

			if( targetAfterIndex ) {
				target.team.units[targetAfterIndex].stats.subtract( Stat.HEALTH, cleaveDamage );
				console.log( `${ this.getUnitName() } on team ${ this.team?.name } did ${ cleaveDamage } with Cleave to ${ target.team.units[targetAfterIndex].getUnitName() } on team ${ this.team?.opposingTeam?.name }` );
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