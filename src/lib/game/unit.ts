import EventEmitter from "node:events";
import { PropertiesOnly } from "../propertiesOnly";
import { Action } from "./action";
import { AcidicConcoction, Bramble, Curse, Effect, ExplodingNettle, Headbutt, PoisonFangs, Rally, WebWrap } from "./effect";
import { Item } from "./item";
import { Stat, Stats } from "./stats";
import { Team } from "./team";

export class Unit {
	name: string;
	currentHealth: number;
	stats: Stats;
	buffs: Effect[] = [];
	debuffs: Effect[] = [];
	items: Item[] = [];
	isFirstAttack = true;
	isFirstDamageTaken = true;
	isDead = false;
	isCrowdControlled = false;
	#team?: Team;
	killer: Unit | null = null;

	_actions: EventEmitter = new EventEmitter();

	constructor( name: string, attack?: number, health?: number, def?: number, crit?: number, dodge?: number, strikes?: number ) {
		this.name = name;
		this.stats = new Stats( attack, health, def, crit, dodge, strikes );
		this.currentHealth = health || 0;
		this.stats.setOwner( this );

		this.on( Action.FIRST_ATTACK, ( target ) => {
			this.isFirstAttack = false;
			this.emit( Action.ATTACK, target );
		});

		this.on( Action.ATTACK, ( target ) => {
			target.hurt( this.stats.attack, this );
			console.log( `${ this.name } on team ${ this.team?.name } did ${ this.stats.attack } with basic attack to ${ target.name } on team ${ this.team?.opposingTeam?.name }` );
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

		//when a unit dies, it can kill other targets with on death damage, so we need to loop through and make sure to check and fire anything that has died from the units death.
		this.on( Action.DIE, ( target ) => {
			this.team?.units.forEach( unit => {
				if( !unit.isDead && unit.currentHealth <= 0 ) {
					unit.isDead = true;
					unit.killer?.emit( Action.KILLED_UNIT, unit );
					const firstAlive = this.team?.findFirstAliveUnit();
					if( !firstAlive ) return;
					unit.emit( Action.DIE, firstAlive );
				}
			});
			this.team?.opposingTeam?.units.forEach( unit => {
				if( !unit.isDead && unit.currentHealth <= 0 ) {
					unit.isDead = true;
					unit.killer?.emit( Action.KILLED_UNIT, unit );
					const firstAlive = this.team?.opposingTeam?.findFirstAliveUnit();
					if( !firstAlive ) return;
					unit.emit( Action.DIE, firstAlive );
				}
			});
		});

		//Wire up Unit events to your items, buffs and debuffs
		//They get the object they are on as the unit into the hadler
		( Object.values( Action ) as ( keyof typeof Action )[] ).forEach( action => {
			this.on( Action[action], () => {
				this.fireAttchmentEvents( Action[action] );
			});
		});
	}

	set team( team: Team | undefined ) {
		this.#team = team;
	}

	get team() {
		return this.#team;
	}

	on( event: Action, callback: ( target:Unit, damage?:number )=>void ) {
		//this._actions.prependListener( event, callback );
		this._actions.on( event, callback );
	}

	once( event: Action, callback: ( target:Unit )=>void ) {
		this._actions.once( event, callback );
	}

	emit( event: Action, ...eventInfo: [Unit, number?] ) {
		if( this.isDead ) return;
		//allow item, debuff, and buff to fire start of turn and end of turn if cced
		if( this.isCrowdControlled ) {
			if(
				event === Action.START_OF_TURN ||
				event === Action.END_OF_TURN
			) {
				this.fireAttchmentEvents( event );
			}
			if( this.isCrowdControlled ) return;
		}
		this._actions.emit( event, ...eventInfo );
	}

	addBuff( buff: Effect ) {
		this.buffs.push( buff );
		buff.emit( Action.ON_ADD, this );
	}
	addDebuff( debuff: Effect ) {
		this.debuffs.push( debuff );
		debuff.emit( Action.ON_ADD, this );
	}

	removeBuff( buff: Effect ) {
		const buffIndex = this.buffs.findIndex(( currentBuff ) => currentBuff === buff );
		if( buffIndex < 0 ) return;
		this.buffs.splice( buffIndex, 1 );
		buff.emit( Action.ON_REMOVE, this );
	}
	removeDebuff( debuff: Effect ) {
		const debuffIndex = this.debuffs.findIndex(( currentDebuff ) => currentDebuff === debuff );
		if( debuffIndex < 0 ) return;
		this.debuffs.splice( debuffIndex, 1 );
		debuff.emit( Action.ON_REMOVE, this );
	}

	heal( amount: number ) : number {
		//dead is set at the end of the game loop. If dead heal no longer works, but if not dead check if a heal this turn brought back to life.
		if( this.isDead ) return 0;
		const wasDead = this.currentHealth <= 0;
		let effectiveHealing = amount;
		if( amount + this.currentHealth > this.stats.health ) {
			effectiveHealing = effectiveHealing - ( amount + this.currentHealth - this.stats.health );
		}

		this.currentHealth = Math.min( this.stats.health, amount + this.currentHealth );
		const isAlive = this.currentHealth > 0;
		if( wasDead && isAlive ) {
			this.killer = null;
		}
		return effectiveHealing;
	}

	hurt( amount: number, attacker: Unit ) {
		this.emit( Action.BEFORE_TAKE_DAMAGE, attacker, amount );

		const wasAlive = this.currentHealth > 0;
		const hurtAmount = amount - Math.ceil( amount * ( this.stats.def/100 ));
		this.currentHealth -= hurtAmount;
		attacker.emit( Action.DEALT_DAMAGE, this, hurtAmount );
		const isDead = this.currentHealth <= 0;

		if( wasAlive && isDead && attacker ) {
			this.killer = attacker;
		}
		this.emit( Action.AFTER_TAKE_DAMAGE, attacker, amount );
		if( this.isFirstDamageTaken ) {
			this.emit( Action.FIRST_TAKE_DAMAGE, this, amount );
			this.isFirstDamageTaken = false;
		}
		return hurtAmount;
	}

	hurtWithReflect( amount: number, attacker: Unit ) {
		const wasAlive = this.currentHealth > 0;
		const hurtAmount = amount - Math.ceil( amount * ( this.stats.def/100 ));
		this.currentHealth -= hurtAmount;
		const isDead = this.currentHealth <= 0;
		if( wasAlive && isDead && attacker ) {
			this.killer = attacker;
		}
		return hurtAmount;
	}

	fireAttchmentEvents( action: Action ) {
		for(
			let i = this.items.length - 1;
			this.items.length && i >= 0;
			i--
		) {
			this.items[i].emit( Action[action], this );
		}
		for(
			let i = this.buffs.length - 1;
			this.buffs.length && i >= 0;
			i--
		) {
			this.buffs[i].emit( Action[action], this );
		}
		for(
			let i = this.debuffs.length - 1;
			this.debuffs.length && i >= 0;
			i--
		) {
			this.debuffs[i].emit( Action[action], this );
		}
	}

}

//Tier 1 Units
export class Acolyte extends Unit {
	healCoef = .10;
	sancCoef = .05;
	roundsToHeal = 4;
	availableHealingRounds = 0;
	totalAmountHealed = 0;

	constructor() {
		super( "✝️ Acolyte", 2, 3 );

		//Healing Flame
		this.on( Action.END_OF_TURN, () => {
			if( !this.team ) return;

			this.availableHealingRounds++;
			if( this.availableHealingRounds % this.roundsToHeal ) return;

			const lowestHealthUnit = this.team.findLowestHealthUnit();
			if( !lowestHealthUnit ) return;

			const healAmount = Math.ceil( this.stats.attack * this.healCoef );
			const effectiveHeal = lowestHealthUnit.heal( healAmount );
			this.totalAmountHealed += effectiveHeal;

			console.log( `${ this.name } on team ${ this.team?.name } healed ${ lowestHealthUnit.name } on team ${ this.team?.name } for ${ effectiveHeal }` );
		});

		//Sanctimonious Flame
		this.on( Action.ATTACK, ( target ) => {
			if( this.totalAmountHealed > target.stats.health ) {
				const extraDamage = Math.ceil( this.stats.attack * this.sancCoef );
				target.hurt( extraDamage, this );

				console.log( `${ this.name } on team ${ this.team?.name } did ${ extraDamage } with Sanctimonious Flame to ${ target.constructor.name } on team ${ this.team?.opposingTeam?.name }` );
			}
		});
	}
}

export class Goblin extends Unit {
	goldEarned = 0;

	constructor() {
		super( "🪙 Goblin", 2, 2 );
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
		super( "🕷 Large Spider", 2, 2  );

		this.on( Action.FIRST_ATTACK, ( target ) => {
			target.addDebuff( new WebWrap( this ));
		});
		this.on( Action.ATTACK, ( target ) => {
			target.addDebuff( new PoisonFangs( this ));
		});

	}
}

export class Rogue extends Unit {
	backstabCoef = .3;
	sneakChance = .5;
	sneakCoef = .5;
	constructor() {
		super( "🗡 Rogue", 1, 3 );

		//Sneak Attack
		this.on( Action.FIRST_ATTACK, ( target ) => {
			if( Math.random() >= this.sneakChance ) {
				const sneakDamage = Math.ceil( this.stats.attack * this.sneakCoef );
				target.hurt( sneakDamage, this );
				console.log( `${ this.name } on team ${ this.team?.name } did ${ sneakDamage } with Sneak Attack to ${ target.name } on team ${ this.team?.opposingTeam?.name }` );
			}
		});
		//Backstab
		this.on( Action.ATTACK, ( target ) => {
			if( this.stats.attack * 2 < target.stats.health ) {
				const backstabDamage = Math.ceil( this.stats.attack * this.backstabCoef );
				target.hurt( backstabDamage, this );
				console.log( `${ this.name } on team ${ this.team?.name } did ${ backstabDamage } with Backstab to ${ target?.name } on team ${ this.team?.opposingTeam?.name }` );
			}
		});
	}
}

export class Warrior extends Unit {
	cleaveCoef = .2;
	constructor() {
		super( "💪 Warrior", 3, 3 );
		this.addBuff( new Rally( this ));
		//Cleave
		this.on( Action.ATTACK, ( target ) => {

			const targetNeighbor = target.team?.getAliveUnitAroundTarget( target );
			if( !target.team ) return;


			const cleaveDamage = Math.ceil( this.stats.attack * this.cleaveCoef );

			if( targetNeighbor?.ahead ) {
				targetNeighbor.ahead.hurt( cleaveDamage, this );
				console.log( `${ this.name } on team ${ this.team?.name } did ${ cleaveDamage } with Cleave to ${ targetNeighbor?.ahead.name } on team ${ this.team?.opposingTeam?.name }` );
			}

			if( targetNeighbor?.behind ) {
				targetNeighbor.behind.hurt( cleaveDamage, this );
				console.log( `${ this.name } on team ${ this.team?.name } did ${ cleaveDamage } with Cleave to ${ targetNeighbor.behind.name } on team ${ this.team?.opposingTeam?.name }` );
			}

		});
	}
}

//Tier 2 Units
export class Alchemist extends Unit {
	healCoef = .3;
	constructor() {
		super( "🧪 Alchemist", 3, 6 );

		this.on( Action.ATTACK, ( target ) => {
			target.addDebuff( new AcidicConcoction( this ));
		});

		//Healing Mist
		this.on( Action.START_OF_TURN, ( target ) => {
			const neighbor = this.team?.getAliveUnitAroundTarget( this );
			const healAmount = Math.ceil( this.stats.attack * this.healCoef );
			if( !neighbor ) return;
			if( neighbor.ahead ) {
				const effectiveHeal = neighbor.ahead.heal( healAmount );
				console.log( `${ this.name } on team ${ this.team?.name } healed ${ neighbor?.ahead.name } on team ${ this.team?.name } for ${ effectiveHeal } with Healing Mist` );
			}

			if( neighbor.behind ) {
				const effectiveHeal = neighbor.behind.heal( healAmount );
				console.log( `${ this.name } on team ${ this.team?.name } healed ${ neighbor?.behind.name } on team ${ this.team?.name } for ${ effectiveHeal } with Healing Mist` );
			}
		});

	}
}

export class Druid extends Unit {
	constructor() {
		super( "🦌 Druid", 5, 5 );

		//Bramble
		this.on( Action.BEFORE_ATTACK, ( target ) => {
			//find and reset bramble on the target
			const existingBramble = target?.debuffs.find( debuff => debuff.name === "Bramble" );
			if( existingBramble ) {
				existingBramble.resetDuration();
				return;
			}

			target.addDebuff( new Bramble( this ));
		});

		//Exploding Nettle
		//when the duration expires or the unit its attached to dies with this on it, it needs to add itself to the target behind it
		//if added through explosion, it gets a new duration.
		//if added through death, it needs to just transfer the duration with it to the target behind.

		this.on( Action.ATTACK, ( target ) => {
			const existingExplodingNettle = target.debuffs.find( debuff => debuff.name === "Exploding Nettle" );
			if( existingExplodingNettle ) {
				return;
			}

			target.addDebuff( new ExplodingNettle( this ));
		});
	}
}

export class RavenousDog extends Unit {
	damageTaken = 0;
	lastHealth = this.stats.health;
	isFrenzied = false;

	constructor() {
		super( "🐕 Ravenous Dog", 4, 6 );

		//Frenzy
		this.on( Action.END_OF_TURN, ( target ) => {
			// if( this.stats.health < this.lastHealth ) {
			// 	this.damageTaken += this.lastHealth - this.stats.health;
			// }
			if( Math.ceil( this.stats.health / this.currentHealth ) >= 2 && !this.isFrenzied ) {
				this.stats.add( Stat.ATTACK, 2 );
				this.isFrenzied = true;
				console.log( `${ this.name } on team ${ this.team?.name } has taken ${ this.damageTaken } and only has ${ this.stats.health } gaining Frenzy stats.` );
			}
			else if( Math.ceil( this.stats.health / this.currentHealth ) < 2 && this.isFrenzied ) {
				this.stats.subtract( Stat.ATTACK, 2, this );
				this.isFrenzied = false;
				console.log( `${ this.name } on team ${ this.team?.name } has taken ${ this.damageTaken } and has ${ this.stats.health } losing Frenzy stats.` );
			}
			this.lastHealth = this.stats.health;

		});

		//Feeding Frenzy
		this.on( Action.KILLED_UNIT, ( target ) => {
			this.stats.add( Stat.ATTACK, 1 );
			this.stats.add( Stat.HEALTH, 1 );
			console.log( `${ this.name } on team ${ this.team?.name } killed ${ target.name } on team ${ this.team?.opposingTeam?.name } and gained +1 attack and +1 health` );
		});
	}
}

export class Shaman extends Unit {
	hasAncestralGuidanced = false;
	constructor() {
		super( "👻 Shaman", 2, 5 );

		//Healing Aura
		this.on( Action.START_OF_TURN, ( target ) => {
			this?.team?.units.forEach( teammate => {
				if( teammate.isDead ) return;
				teammate.heal( 1 );
				console.log( `${ this.name } on team ${ this.team?.name } Healing Aura has healed ${ teammate.name } for 1 health.` );
			});
		});
		//Ancestral Guidance
		this.on( Action.START_OF_TURN, () => {
			if( !this.team || !this.team.units || this.hasAncestralGuidanced ) return;
			for( const unit of this.team.units ) {
				if( unit.isDead ) {
					unit.heal( Math.ceil( unit.stats.health / 2 ));
					this.hasAncestralGuidanced = true;
					unit.isDead = false;
					console.log( `${ this.name } on team ${ this.team?.name } resurrected ${ unit.name } with ${ Math.ceil( unit.stats.health / 2 ) } health.` );
					return;
				}
			}
		});
	}
}

export class Watcher extends Unit {
	hasStaredDown = false;
	stareDownReduc = 1;
	constructor() {
		super( "👁️ Watcher", 2, 5 );

		//Stare Down
		this.on( Action.AFTER_ATTACK, ( target ) => {
			if( target.stats.attack <= 0 || this.hasStaredDown ) return;

			target.stats.subtract( Stat.ATTACK, this.stareDownReduc, this );
			this.hasStaredDown = true;

			//Visionary Increase
			target.team?.getAliveUnitAroundTarget( target )?.behind?.stats.subtract( Stat.ATTACK, this.stareDownReduc, this );

		});
		this.on( Action.START_OF_TURN, ( target ) => {
			this.hasStaredDown = false;
		});
	}
}

// //Tier 3 Units

export class CorruptedWitch extends Unit {
	curseChance = .5;
	feedCoef = .5;
	constructor() {
		super( "🧹 Corrupted Witch", 6, 7 * 20 );

		//Curse
		this.on( Action.BEFORE_ATTACK, ( target ) => {

			if( Math.random() < this.curseChance ) return;

			const existingCurse = target?.debuffs.find( debuff => debuff.name === "Curse" );
			if( existingCurse ) {
				existingCurse.resetDuration();
				return;
			}

			target.addDebuff( new Curse( this ));
		});

		//Feed Off Suffering
		this.on( Action.DEALT_DAMAGE, ( target, amountDone ) => {
			if( !amountDone ) return;
			const healAmount = Math.ceil( amountDone * this.feedCoef );
			this.heal( healAmount );
			console.log( `${ this.name } on team ${ this.team?.name }'s feed off suffering healed for ${ healAmount }` );
		});

	}
}

export class Mage extends Unit {
	fireballCoef = .1;
	roundsToFireball = 3;
	availableFireballRounds = 0;
	constructor() {
		super( "🪄 Mage", 7, 4 );

		//Fireball
		this.on( Action.END_OF_TURN, ( target ) => {
			this.availableFireballRounds++;
			if( this.availableFireballRounds % this.roundsToFireball ) return;

			//Arcane Mastery
			this.stats.add( Stat.ATTACK, 1 );

			target.team?.units.forEach(( enemy ) => {
				if( enemy.isDead ) return;
				enemy.hurt( Math.ceil( this.stats.attack * this.fireballCoef ), this );
			});
		});
	}
}

export class Minotaur extends Unit {
	headbuttStun = false;
	constructor() {
		super( "🐂 Minotaur", 6, 7 );
		//Headbutt & Trample
		this.on( Action.FIRST_ATTACK, ( target ) => {
			target.team?.removeUnit( target );
			target.team?.addUnitEnd( target );

			this.once( Action.AFTER_ATTACK, ( target ) => {
				this.headbuttStun = true;
			});
		});

		this.on( Action.ATTACK, ( target ) => {
			if( this.headbuttStun ) {
				target.addDebuff( new Headbutt( this ));
			}
		});

	}
}

export class Paladin extends Unit {
	recoilCoef = .2;
	reduceCoef = 20;
	roundsToReduce = 2;
	availableReduceRound = 0;
	constructor() {
		super( "🛡️ Paladin", 5, 8 );

		//Divine Recoil
		this.on( Action.AFTER_TAKE_DAMAGE, ( attacker, damage = 0 ) => {
			attacker.hurtWithReflect( Math.ceil( damage * this.recoilCoef ), this );

			console.log( `${ this.name } on team ${ this.team?.name } reflected back damage to ${ attacker.name } on team ${ attacker.team?.name } for ${ Math.ceil( damage * this.recoilCoef ) }` );
		});

		//Holy Shield
		this.on( Action.END_OF_TURN, () => {
			if( !this.team || this.team.game?.round === 0 ) return;

			this.availableReduceRound++;
			if( this.availableReduceRound % this.roundsToReduce ) {
				this.stats.add( Stat.DEF, this.reduceCoef );
				console.log( `${ this.name } defense increased ${ this.reduceCoef } with holy shield` );

				return;
			}

			this.stats.subtract( Stat.DEF, this.reduceCoef, this );
			console.log( `${ this.name } lost holy shield and defense decreased by ${ this.reduceCoef }` );
		});
	}
}

// //Tier 4 Units

export class OrcWarrior extends Unit {
	hasReducedAttack: Unit[] = [];
	origStatObj = this.stats;
	constructor() {
		super( "🪓 Orc Warrior", 7, 10 * 20 );

		//Bloodlust
		this.on( Action.KILLED_UNIT, () => {
			const teammatesAround = this.team?.getAliveUnitAroundTarget( this );
			teammatesAround?.behind?.stats.add( Stat.ATTACK, 2 );
			this.stats.add( Stat.ATTACK, 2 );
			console.log( `${ this.name } on team ${ this.team?.name } and ${ teammatesAround?.behind?.name } on team ${ this.team?.name } gain +2 attack from ${ this.name } on team ${ this.team?.name }` );
		});

		this.on( Action.ATTACK, ( target ) => {
			if( this.hasReducedAttack.includes( target )) {
				target.hurt( 2, this );
			}
		});



		//Overpower
		//Proxy attack reduction from the stat on this unit to also increase the units health
		this.stats = new Proxy<Stats>( this.stats, {
			get: function ( target: Stats, property: keyof Stats, receiver ) {
				if( property === "subtract" ) {
					return function ( stat: keyof PropertiesOnly<Stats>, amount: number, unitModifying?: Unit ) {
						target[property]( stat, amount, unitModifying );
						if( stat === Stat.ATTACK && unitModifying && amount >= 0 ) {
							target.add( Stat.ATTACK, 2 );
							console.log( `${ target.owner?.name } on team ${ target.owner?.team?.name } gain +2 because ${ unitModifying.name } on team ${ unitModifying.team?.name } reduced ${ target.owner?.name } on team ${ target.owner?.team?.name }` );
						}
					};
				}
				const method = target[property];
				if( method && typeof method === "function" ) {
					return method.bind( target );
				}
				return target[property];
				// return Reflect.get( target, property, receiver );
			},
		});
	}
}


export class TimeKeeper extends Unit {
	roundsToTimeWarp = 4;
	availableTimeWarpRounds = 0;
	temporalShield = 0;
	constructor() {
		super( "⏰Time Keeper", 4, 9 );

		//Time Warp
		this.on( Action.AFTER_ATTACK, ( target ) => {
			this.availableTimeWarpRounds++;
			if( this.availableTimeWarpRounds % this.roundsToTimeWarp ) return;
			console.log( `${ this.name } on team ${ this.team?.name } has warped time attacking again this turn` );
			this.emit( Action.ATTACK, target );
		});

		//Temporal Shield
		this.on( Action.BEFORE_GAME, () => {
			this.temporalShield = Math.ceil( this.stats.health * .5 );
			console.log( `${ this.name } on team ${ this.team?.name } has gained a temporal shield for ${ this.temporalShield }` );
		});

		this.on( Action.START_OF_TURN, ( target ) => {
			const temporalShieldGain =  Math.ceil( this.temporalShield * .1 );
			this.temporalShield += temporalShieldGain;
			console.log( `${ this.name } on team ${ this.team?.name }'s temporal shield gained ${ temporalShieldGain }` );
		});
	}

	/*
	*	annoyingly override the parent hurt to allow for temporal shield to the current health calculation.
   	*	Health is taken from temporal shield first. Mitigating damage with shield does not fire attackers DAMAGE_DEALT event.
   	*/
	hurt( amount: number, attacker: Unit ): number {
		this.emit( Action.BEFORE_TAKE_DAMAGE, attacker, amount );

		const wasAlive = this.currentHealth > 0;
		const hurtAmount = amount - Math.ceil( amount * ( this.stats.def / 100 ));

		const overHit = this.temporalShield - hurtAmount;
		if( overHit < 0 ) {

			console.log( `${ this.name }'s on team ${ this.team?.name }'s temporal shield blocked ${ this.temporalShield } and had ${ -overHit } taken from health` );
			this.temporalShield = 0;
			//this is going to be negative for any damage done over temporal shield. Adding it will subtract from current health
			this.currentHealth += overHit;
			attacker.emit( Action.DEALT_DAMAGE, this, hurtAmount );

		}
		else {
			console.log( `${ this.name } on team ${ this.team?.name }'s temporal shield blocked ${ overHit }` );
			this.temporalShield = overHit;
		}

		const isDead = this.currentHealth <= 0;
		if( wasAlive && isDead && attacker ) {
			this.killer = attacker;
		}
		this.emit( Action.AFTER_TAKE_DAMAGE, attacker, hurtAmount );
		if( this.isFirstDamageTaken ) {
			this.emit( Action.FIRST_TAKE_DAMAGE, this, hurtAmount );
			this.isFirstDamageTaken = false;
		}
		return hurtAmount;
	}
}

// export class Tinkerer extends Unit {
// 	constructor() {
// 		super( 3, 7 );
// 	}
// }