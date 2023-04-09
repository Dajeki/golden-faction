import { randomUUID } from "node:crypto";
import EventEmitter from "node:events";
import { PropertiesOnly } from "../propertiesOnly";
import { Action } from "./action";
import { AcidicConcoction, Bramble, Curse, Effect, ExplodingNettle, Headbutt, PoisonFangs, Rally, WebWrap } from "./effect";
import { Game, GameAction, GameActionStat } from "./game";
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
	uuid;

	_actions: EventEmitter = new EventEmitter();

	constructor( name: string, attack?: number, health?: number, def?: number, crit?: number, dodge?: number, strikes?: number ) {
		this.name = name;
		this.stats = new Stats( attack, health, def, crit, dodge, strikes );
		this.currentHealth = health || 0;
		this.stats.setOwner( this );
		this.uuid = randomUUID();

		this.on( Action.FIRST_ATTACK, ( target ) => {
			this.isFirstAttack = false;
			this.emit( Action.ATTACK, target );
		});

		this.on( Action.ATTACK, ( target ) => {
			const effectiveDamage = target.hurt( this.stats.attack, this );
			this.team?.game?.addGameStep(
				this.uuid,
				GameAction.BASIC_ATTACK,
				-effectiveDamage,
				GameActionStat.CURRENT_HEALTH,
				target.uuid,
				`${ this.name } on team ${ this.team?.name } did ${ effectiveDamage } with basic attack to ${ target.name } on team ${ this.team?.opposingTeam?.name }`,
			);
			console.log( `${ this.name } on team ${ this.team?.name } did ${ effectiveDamage } with basic attack to ${ target.name } on team ${ this.team?.opposingTeam?.name }` );
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
			this.team?.game?.addGameStep(
				this.uuid,
				GameAction.DIE,
				0,
				GameActionStat.CURRENT_HEALTH,
				this.uuid,
				`${ this.name } on team ${ this.team?.name } has died.`,
			);
			console.log( `${ this.name } on team ${ this.team?.name } has died.` );
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
		Object.values( Action ).forEach( action => {
			this.on( action, ( target ) => {
				this.fireAttchmentEvents( Action[action], target );
			});
		});
	}

	set team( team: Team | undefined ) {
		this.#team = team;
	}

	get team() {
		return this.#team;
	}

	on( event: Action, callback: ( target:Unit, firstAlive: Unit, damage?:number )=>void ) {
		//this._actions.prependListener( event, callback );
		this._actions.on( event, callback );
	}

	once( event: Action, callback: ( target:Unit, firstAlive: Unit, damage?:number )=>void ) {
		this._actions.once( event, callback );
		return callback;
		// this._actions.prependOnceListener( event, callback );
	}

	removeListener( event: Action, callback: ( target:Unit, firstAlive: Unit, damage?:number )=>void ) {
		this._actions.removeListener( event, callback );
	}

	emit( event: Action, ...eventInfo: [Unit, Unit?, number?] ) {
		if( event !== Action.DIE && this.isDead ) return;
		//allow item, debuff, and buff to fire start of turn and end of turn if cced
		if( this.isCrowdControlled ) {
			if(
				event === Action.START_OF_TURN ||
				event === Action.END_OF_TURN
			) {
				this.fireAttchmentEvents( event, eventInfo[1] );
			}
			if( this.isCrowdControlled ) return;
		}
		this._actions.emit( event, ...eventInfo );
	}

	addBuff( buff: Effect ) {
		this.buffs.push( buff );
		this.team?.game?.addGameStep(
			buff.caster.uuid,
			buff.name,
			buff.duration,
			GameActionStat.BUFF,
			this.uuid,
			`${ this.name } on team ${ this.team?.name } was effected by ${ buff.caster.name } on team ${ buff.caster.team?.name }'s ${ buff.name }`,
		);
		buff.emit( Action.ON_ADD, this );
	}
	addDebuff( debuff: Effect ) {
		this.debuffs.push( debuff );
		this.team?.game?.addGameStep(
			debuff.caster.uuid,
			debuff.name,
			debuff.duration,
			GameActionStat.DEBUFF,
			this.uuid,
			`${ this.name } on team ${ this.team?.name } was effected by ${ debuff.caster.name } on team ${ debuff.caster.team?.name }'s ${ debuff.name }`,
		);
		debuff.emit( Action.ON_ADD, this );
	}

	removeBuff( buff: Effect ) {
		const buffIndex = this.buffs.findIndex(( currentBuff ) => currentBuff === buff );
		if( buffIndex < 0 ) return;
		this.buffs.splice( buffIndex, 1 );
		this.team?.game?.addGameStep(
			buff.caster.uuid,
			buff.name,
			-1,
			GameActionStat.BUFF,
			this.uuid,
			`${ this.name } on team ${ this.team?.name } is no longer effected by ${ buff.caster.name } on team ${ buff.caster.team?.name }'s ${ buff.name }`,
		);
		buff.emit( Action.ON_REMOVE, this );
	}
	removeDebuff( debuff: Effect ) {
		const debuffIndex = this.debuffs.findIndex(( currentDebuff ) => currentDebuff === debuff );
		if( debuffIndex < 0 ) return;
		this.debuffs.splice( debuffIndex, 1 );
		this.team?.game?.addGameStep(
			debuff.caster.uuid,
			debuff.name,
			-1,
			GameActionStat.DEBUFF,
			this.uuid,
			`${ this.name } on team ${ this.team?.name } is no longer effected by ${ debuff.caster.name } on team ${ debuff.caster.team?.name }'s ${ debuff.name }`,
		);
		debuff.emit( Action.ON_REMOVE, this );
	}

	resurrect( percent = 1 ) {
		if( this.isDead ) {
			this.isDead = false;
			this.team?.game?.addGameStep(
				this.uuid,
				GameAction.RESURRECT,
				0,
				GameActionStat.CURRENT_HEALTH,
				this.uuid,
				`${ this.name } on team ${ this.team?.name } was resurrected`,
			);
			return this.heal( Math.ceil( this.stats.health*percent ) - Math.abs( this.currentHealth ));
		}
		console.log( "Tried to res something that wasnt dead" );
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
		const firstAliveEnemy = this.team?.opposingTeam?.findFirstAliveUnit();
		this.emit( Action.BEFORE_TAKE_DAMAGE, attacker, firstAliveEnemy, amount );

		const wasAlive = this.currentHealth > 0;
		const hurtAmount = amount - Math.ceil( amount * ( this.stats.defense/100 ));
		this.currentHealth -= hurtAmount;
		attacker.emit( Action.DEALT_DAMAGE, this, firstAliveEnemy, hurtAmount );
		const isDead = this.currentHealth <= 0;

		if( wasAlive && isDead && attacker ) {
			this.killer = attacker;
		}
		this.emit( Action.AFTER_TAKE_DAMAGE, attacker, firstAliveEnemy, amount );
		if( this.isFirstDamageTaken ) {
			this.emit( Action.FIRST_TAKE_DAMAGE, this, firstAliveEnemy, amount );
			this.isFirstDamageTaken = false;
		}
		return hurtAmount;
	}

	hurtWithReflect( amount: number, attacker: Unit ) {
		const wasAlive = this.currentHealth > 0;
		const hurtAmount = amount - Math.ceil( amount * ( this.stats.defense/100 ));
		this.currentHealth -= hurtAmount;
		const isDead = this.currentHealth <= 0;
		if( wasAlive && isDead && attacker ) {
			this.killer = attacker;
		}
		return hurtAmount;
	}

	fireAttchmentEvents( action: Action, firstAlive?: Unit ) {
		for(
			let i = this.items.length - 1;
			this.items.length && i >= 0;
			i--
		) {
			this.items[i].emit( action, this, firstAlive );
		}
		for(
			let i = this.buffs.length - 1;
			this.buffs.length && i >= 0;
			i--
		) {
			this.buffs[i].emit( action, this, firstAlive );
		}
		for(
			let i = this.debuffs.length - 1;
			this.debuffs.length && i >= 0;
			i--
		) {
			this.debuffs[i].emit( action, this, firstAlive );
		}
	}

	toJSON() {
		return {
			name         : this.name,
			uuid         : this.uuid,
			buff         : this.buffs,
			debuff       : this.debuffs,
			stats        : this.stats,
			currentHealth: this.currentHealth,
		};
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

			this.team?.game?.addGameStep(
				this.uuid,
				GameAction.HEALING_FLAME,
				effectiveHeal,
				GameActionStat.CURRENT_HEALTH,
				lowestHealthUnit.uuid,
				`${ this.name } on team ${ this.team?.name } healed ${ lowestHealthUnit.name } on team ${ this.team?.name } for ${ effectiveHeal }`,
			);
			console.log( `${ this.name } on team ${ this.team?.name } healed ${ lowestHealthUnit.name } on team ${ this.team?.name } for ${ effectiveHeal }` );
		});

		//Sanctimonious Flame
		this.on( Action.ATTACK, ( target ) => {
			if( this.totalAmountHealed > target.stats.health ) {
				const extraDamage = Math.ceil( this.stats.attack * this.sancCoef );
				const effectiveSFlame = target.hurt( extraDamage, this );

				this.team?.game?.addGameStep(
					this.uuid,
					GameAction.SANCTIMONIOUS_FLAME,
					-effectiveSFlame,
					GameActionStat.CURRENT_HEALTH,
					target.uuid,
					`${ this.name } on team ${ this.team?.name } did ${ effectiveSFlame } with Sanctimonious Flame to ${ target.name } on team ${ this.team?.opposingTeam?.name }`,
				);
				console.log( `${ this.name } on team ${ this.team?.name } did ${ effectiveSFlame } with Sanctimonious Flame to ${ target.name } on team ${ this.team?.opposingTeam?.name }` );
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
				const effectiveSneak = target.hurt( sneakDamage, this );

				this.team?.game?.addGameStep(
					this.uuid,
					GameAction.SNEAK_ATTACK,
					-effectiveSneak,
					GameActionStat.CURRENT_HEALTH,
					target.uuid,
					`${ this.name } on team ${ this.team?.name } did ${ effectiveSneak } with Sneak Attack to ${ target.name } on team ${ this.team?.opposingTeam?.name }`,
				);
				console.log( `${ this.name } on team ${ this.team?.name } did ${ sneakDamage } with Sneak Attack to ${ target.name } on team ${ this.team?.opposingTeam?.name }` );
			}
		});
		//Backstab
		this.on( Action.ATTACK, ( target ) => {
			if( this.stats.attack * 2 < target.stats.health ) {
				const backstabDamage = Math.ceil( this.stats.attack * this.backstabCoef );
				const effectiveBackstab = target.hurt( backstabDamage, this );

				this.team?.game?.addGameStep(
					this.uuid,
					GameAction.BACKSTAB,
					-effectiveBackstab,
					GameActionStat.CURRENT_HEALTH,
					target.uuid,
					`${ this.name } on team ${ this.team?.name } did ${ effectiveBackstab } with Backstab to ${ target?.name } on team ${ this.team?.opposingTeam?.name }`,
				);
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
				const effectiveCleave = targetNeighbor.ahead.hurt( cleaveDamage, this );

				this.team?.game?.addGameStep(
					this.uuid,
					GameAction.CLEAVE,
					-effectiveCleave,
					GameActionStat.CURRENT_HEALTH,
					targetNeighbor.ahead.uuid,
					`${ this.name } on team ${ this.team?.name } did ${ effectiveCleave } with cleave to ${ targetNeighbor.ahead.name } on team ${ targetNeighbor.ahead.team?.opposingTeam?.name }`,
				);
				console.log( `${ this.name } on team ${ this.team?.name } did ${ effectiveCleave } with cleave to ${ targetNeighbor.ahead.name } on team ${ this.team?.opposingTeam?.name }` );
			}

			if( targetNeighbor?.behind ) {
				const effectiveCleave = targetNeighbor.behind.hurt( cleaveDamage, this );

				this.team?.game?.addGameStep(
					this.uuid,
					GameAction.CLEAVE,
					-effectiveCleave,
					GameActionStat.CURRENT_HEALTH,
					targetNeighbor.behind.uuid,
					`${ this.name } on team ${ this.team?.name } did ${ effectiveCleave } with cleave to ${ targetNeighbor.behind.name } on team ${ this.team?.opposingTeam?.name }`,
				);
				console.log( `${ this.name } on team ${ this.team?.name } did ${ effectiveCleave } with cleave to ${ targetNeighbor.behind.name } on team ${ this.team?.opposingTeam?.name }` );
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
				this.team?.game?.addGameStep(
					this.uuid,
					GameAction.HEALING_MIST,
					effectiveHeal,
					GameActionStat.CURRENT_HEALTH,
					neighbor.ahead.uuid,
					`${ this.name } on team ${ this.team?.name } healed ${ neighbor?.ahead.name } on team ${ this.team?.name } for ${ effectiveHeal } with Healing Mist`,
				);
				console.log( `${ this.name } on team ${ this.team?.name } healed ${ neighbor?.ahead.name } on team ${ this.team?.name } for ${ effectiveHeal } with Healing Mist` );
			}

			if( neighbor.behind ) {
				const effectiveHeal = neighbor.behind.heal( healAmount );
				this.team?.game?.addGameStep(
					this.uuid,
					GameAction.HEALING_MIST,
					effectiveHeal,
					GameActionStat.CURRENT_HEALTH,
					neighbor.behind.uuid,
					`${ this.name } on team ${ this.team?.name } healed ${ neighbor?.behind.name  } on team ${ this.team?.name } for ${ effectiveHeal } with Healing Mist`,
				);
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
			const existingBramble = target?.debuffs.find( debuff => debuff.name === "bramble" );
			if( existingBramble ) {
				existingBramble.resetDuration( target );
				return;
			}

			target.addDebuff( new Bramble( this ));
		});

		//Exploding Nettle
		//when the duration expires or the unit its attached to dies with this on it, it needs to add itself to the target behind it
		//if added through explosion, it gets a new duration.
		//if added through death, it needs to just transfer the duration with it to the target behind.

		this.on( Action.ATTACK, ( target ) => {
			const existingExplodingNettle = target.debuffs.find( debuff => debuff.name === "explodingNettle" );
			if( existingExplodingNettle ) {
				return;
			}

			target.addDebuff( new ExplodingNettle( this ));
		});
	}
}

export class RavenousDog extends Unit {
	isFrenzied = false;
	frenzyPercent = .5;
	frenzyAmount = 2;

	constructor() {
		super( "🐕 Ravenous Dog", 4, 6 );

		//Frenzy
		this.on( Action.END_OF_TURN, ( target ) => {
			if(( this.stats.health - this.currentHealth ) / this.stats.health >= this.frenzyPercent && !this.isFrenzied ) {
				this.stats.add( Stat.ATTACK, this.frenzyAmount );
				this.isFrenzied = true;
				this.team?.game?.addGameStep(
					this.uuid,
					GameAction.FRENZY,
					this.frenzyAmount,
					GameActionStat.ATTACK,
					this.uuid,
					`${ this.name } on team ${ this.team?.name } has taken ${ this.stats.health - this.currentHealth } and only has ${ this.stats.health } gaining Frenzy stats`,
				);
				console.log( `${ this.name } on team ${ this.team?.name } has taken ${ this.stats.health - this.currentHealth } and only has ${ this.stats.health } gaining Frenzy stats` );
			}
			else if(( this.stats.health - this.currentHealth ) / this.stats.health < this.frenzyPercent && this.isFrenzied ) {
				this.stats.subtract( Stat.ATTACK, this.frenzyAmount, this );
				this.isFrenzied = false;
				this.team?.game?.addGameStep(
					this.uuid,
					GameAction.FRENZY,
					-this.frenzyAmount,
					GameActionStat.ATTACK,
					this.uuid,
					`${ this.name } on team ${ this.team?.name } has taken ${ this.stats.health - this.currentHealth } and only has ${ this.stats.health } gaining Frenzy stats`,
				);
				console.log( `${ this.name } on team ${ this.team?.name } has taken ${ this.stats.health - this.currentHealth } and has ${ this.stats.health } losing Frenzy stats` );
			}
		});

		//Feeding Frenzy
		this.on( Action.KILLED_UNIT, ( target ) => {
			this.team?.game?.addGameStep(
				this.uuid,
				GameAction.FEEDING_FRENZY,
				1,
				GameActionStat.ATTACK,
				this.uuid,
				`${ this.name } on team ${ this.team?.name } killed ${ target.name } on team ${ this.team?.opposingTeam?.name } and gained +1 attack`,
			);
			this.stats.add( Stat.ATTACK, 1 );
			this.team?.game?.addGameStep(
				this.uuid,
				GameAction.FEEDING_FRENZY,
				1,
				GameActionStat.HEALTH,
				this.uuid,
				`${ this.name } on team ${ this.team?.name } killed ${ target.name } on team ${ this.team?.opposingTeam?.name } and gained +1 health`,
			);
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
				const effectiveHealing = teammate.heal( 1 );
				this.team?.game?.addGameStep(
					this.uuid,
					GameAction.HEALING_AURA,
					effectiveHealing,
					GameActionStat.CURRENT_HEALTH,
					teammate.uuid,
					`${ this.name } on team ${ this.team?.name } Healing Aura has healed ${ teammate.name } on team ${ this.team?.name } for ${ effectiveHealing } health.`,
				);
				console.log( `${ this.name } on team ${ this.team?.name } Healing Aura has healed ${ teammate.name } on team ${ this.team?.name } for ${ effectiveHealing } health.` );
			});
		});
		//Ancestral Guidance
		this.on( Action.START_OF_TURN, () => {
			if( !this.team || !this.team.units || this.hasAncestralGuidanced ) return;
			for( const teammate of this.team.units ) {
				if( !teammate.isDead ) return;
				const effectiveHealing = teammate.resurrect( .5 );
				this.hasAncestralGuidanced = true;
				this.team?.game?.addGameStep(
					this.uuid,
					GameAction.ANCESTRAL_GUIDANCE,
					effectiveHealing || 0,
					GameActionStat.CURRENT_HEALTH,
					teammate.uuid,
					`${ this.name } on team ${ this.team?.name } resurrected ${ teammate.name } on team ${ this.team?.name } with ${ effectiveHealing }`,
				);
				console.log( `${ this.name } on team ${ this.team?.name } resurrected ${ teammate.name } on team ${ this.team?.name } with ${ effectiveHealing }` );
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

			this.team?.game?.addGameStep(
				this.uuid,
				GameAction.STARE_DOWN,
				-this.stareDownReduc,
				GameActionStat.ATTACK,
				target.uuid,
				`${ this.name } on team ${ this.team?.name } used stare down and reduced ${ target?.name } on team ${ this.team?.opposingTeam?.name }'s attack by ${ this.stareDownReduc }`,
			);
			target.stats.subtract( Stat.ATTACK, this.stareDownReduc, this );
			this.hasStaredDown = true;


			const unitBehind = target.team?.getAliveUnitAroundTarget( target )?.behind;
			let unitTwoBehind: Unit | null | undefined;
			if( unitBehind ) {
				unitTwoBehind = target.team?.getAliveUnitAroundTarget(  unitBehind ).behind;
			}
			this.team?.game?.addGameStep(
				this.uuid,
				GameAction.VISIONARY_INCREASE,
				-this.stareDownReduc,
				GameActionStat.ATTACK,
				unitTwoBehind?.uuid || "",
				`${ this.name } on team ${ this.team?.name } used stare down and reduced ${ target?.name } on team ${ this.team?.opposingTeam?.name }'s attack by ${ this.stareDownReduc }`,
			);
			//Visionary Increase
			unitTwoBehind?.stats.subtract( Stat.ATTACK, this.stareDownReduc, this );

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
		super( "🧹 Corrupted Witch", 6, 7 );

		//Curse
		this.on( Action.BEFORE_ATTACK, ( target ) => {

			if( Math.random() < this.curseChance ) return;

			const existingCurse = target.debuffs.find( debuff => debuff.name === "Curse" );
			if( existingCurse ) {
				existingCurse.resetDuration( target );
				return;
			}

			target.addDebuff( new Curse( this ));
		});

		//Feed Off Suffering
		this.on( Action.DEALT_DAMAGE, ( target, firstAliveEnemy, amountDone ) => {
			if( !amountDone ) return;
			const healAmount = Math.ceil( amountDone * this.feedCoef );
			const effectiveHeal = this.heal( healAmount );
			this.team?.game?.addGameStep(
				this.uuid,
				GameAction.FEED_OFF_SUFFERING,
				effectiveHeal,
				GameActionStat.CURRENT_HEALTH,
				this.uuid,
				`${ this.name } on team ${ this.team?.name }'s feed off suffering healed for ${ healAmount }`,
			);
			console.log( `${ this.name } on team ${ this.team?.name }'s feed off suffering healed for ${ healAmount }` );
		});

	}
}

export class Mage extends Unit {
	fireballCoef = .1;
	roundsToFireball = 5;
	availableFireballRounds = 0;
	constructor() {
		super( "🪄 Mage", 7, 4 );

		//Fireball
		this.on( Action.END_OF_TURN, ( target ) => {
			this.availableFireballRounds++;
			if( this.availableFireballRounds % this.roundsToFireball ) return;

			//Arcane Mastery
			this.stats.add( Stat.ATTACK, 1 );
			this.team?.game?.addGameStep(
				this.uuid,
				GameAction.ARCANE_MASTERY,
				1,
				GameActionStat.ATTACK,
				this.uuid,
				`${ this.name } on team ${ this.team?.name } casted fireball and gained +1 attack`,
			);
			console.log( `${ this.name } on team ${ this.team?.name } casted fireball and gained +1 attack` );

			target.team?.units.forEach(( enemy ) => {
				if( enemy.isDead ) return;
				const fireballDamage = enemy.hurt( Math.ceil( this.stats.attack * this.fireballCoef ), this );

				this.team?.game?.addGameStep(
					this.uuid,
					GameAction.FIREBALL,
					-fireballDamage,
					GameActionStat.CURRENT_HEALTH,
					enemy.uuid,
					`${ this.name } on team ${ this.team?.name } hit ${ enemy.name } on team ${ enemy.team?.name } for ${ fireballDamage } with fireball`,
				);
				console.log( `${ this.name } on team ${ this.team?.name } hit ${ enemy.name } on team ${ enemy.team?.name } for ${ fireballDamage } with fireball` );
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
			this.team?.game?.addGameStep(
				this.uuid,
				GameAction.TRAMPLE,
				( target.team?.units?.length || 0 ) - 1,
				GameActionStat.POSITION,
				target.uuid,
				`${ this.name } on team ${ this.team?.name } moved ${ target.name } on team ${ target.team?.name } to the end of the line`,
			);
			console.log( `${ this.name } on team ${ this.team?.name } moved ${ target.name } on team ${ target.team?.name } to the end of the line` );

			//REFACTOR make this an actual buff effect?
			this.once( Action.AFTER_ATTACK, ( target ) => {
				this.team?.game?.addGameStep(
					this.uuid,
					GameAction.HEADBUTT,
					1,
					GameActionStat.BUFF,
					this.uuid,
					`${ this.name } on team ${ this.team?.name } is ready to headbutt`,
				);
				this.headbuttStun = true;
			});
		});

		this.on( Action.ATTACK, ( target ) => {
			if( this.headbuttStun ) {
				target.addDebuff( new Headbutt( this ));
				this.team?.game?.addGameStep(
					this.uuid,
					GameAction.HEADBUTT,
					-1,
					GameActionStat.BUFF,
					this.uuid,
					`${ this.name } on team ${ this.team?.name } is no longer ready to headbutt`,
				);
				this.headbuttStun = false;
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
		this.on( Action.AFTER_TAKE_DAMAGE, ( attacker, _, damage = 0 ) => {
			const effectiveReflect = attacker.hurtWithReflect( Math.ceil( damage * this.recoilCoef ), this );
			this.team?.game?.addGameStep(
				this.uuid,
				GameAction.DIVINE_RECOIL,
				-effectiveReflect,
				GameActionStat.CURRENT_HEALTH,
				attacker.uuid,
				`${ this.name } on team ${ this.team?.name } reflected back damage to ${ attacker.name } on team ${ attacker.team?.name } for ${ effectiveReflect }`,
			);
			console.log( `${ this.name } on team ${ this.team?.name } reflected back damage to ${ attacker.name } on team ${ attacker.team?.name } for ${ effectiveReflect }` );
		});

		//Holy Shield
		this.on( Action.END_OF_TURN, () => {
			if( !this.team || this.team.game?.round === 0 ) return;

			this.availableReduceRound++;
			if( this.availableReduceRound % this.roundsToReduce ) {
				this.stats.add( Stat.DEF, this.reduceCoef );
				this.team?.game?.addGameStep(
					this.uuid,
					GameAction.HOLY_SHIELD,
					this.reduceCoef,
					GameActionStat.DEF,
					this.uuid,
					`${ this.name } defense increased ${ this.reduceCoef } with holy shield`,
				);
				console.log( `${ this.name } defense increased ${ this.reduceCoef } with holy shield` );

				return;
			}

			this.stats.subtract( Stat.DEF, this.reduceCoef, this );
			this.team?.game?.addGameStep(
				this.uuid,
				GameAction.HOLY_SHIELD,
				-this.reduceCoef,
				GameActionStat.DEF,
				this.uuid,
				`${ this.name } lost holy shield and defense decreased by ${ this.reduceCoef }`,
			);
			console.log( `${ this.name } lost holy shield and defense decreased by ${ this.reduceCoef }` );
		});
	}
}

// //Tier 4 Units

export class OrcWarrior extends Unit {
	origStatObj = this.stats;
	bloodlustIncrease = 2;
	constructor() {
		super( "🪓 Orc Warrior", 7, 10 );

		//Bloodlust
		this.on( Action.KILLED_UNIT, () => {
			const teammatesAround = this.team?.getAliveUnitAroundTarget( this );
			teammatesAround?.behind?.stats.add( Stat.ATTACK, 2 );
			this.stats.add( Stat.ATTACK, 2 );
			this.team?.game?.addGameStep(
				this.uuid,
				GameAction.BLOODLUST,
				this.bloodlustIncrease,
				GameActionStat.ATTACK,
				this.uuid,
				`${ this.name } on team ${ this.team?.name } gain +2 attack from killing ${ this.name } on team ${ this.team?.name }`,
			);
			this.team?.game?.addGameStep(
				this.uuid,
				GameAction.BLOODLUST,
				this.bloodlustIncrease,
				GameActionStat.ATTACK,
				teammatesAround?.behind?.uuid || "",
				`${ teammatesAround?.behind?.name } on team ${ this.team?.name } gain +2 attack from ${ this.name } on team ${ this.team?.name } killing ${ this.name } on team ${ this.team?.name }`,
			);

			console.log( `${ this.name } on team ${ this.team?.name } and ${ teammatesAround?.behind?.name } on team ${ this.team?.name } gain +2 attack from ${ this.name } on team ${ this.team?.name }` );
		});


		//Overpower
		const origSubtract = this.stats.subtract;
		this.stats.subtract = function ( stat: keyof PropertiesOnly<Stats>, amount: number, unitModifying: Unit ) {

			if( stat === Stat.ATTACK && unitModifying && amount >= 0 ) {

				this.add( Stat.ATTACK, 2 );
				this.owner?.team?.game?.addGameStep(
					this.owner?.uuid,
					GameAction.OVERPOWER,
					2,
					GameActionStat.ATTACK,
					this.owner?.uuid,
					`${ this.owner?.name } on team ${ this.owner?.team?.name } gain +2 attack because ${ unitModifying.name } on team ${ unitModifying.team?.name } reduced its attack.`,
				);
				this.owner?.team?.game?.addGameStep(
					this.owner?.uuid,
					GameAction.OVERPOWER,
					2,
					GameActionStat.HEALTH,
					this.owner?.uuid,
					`${ this.owner?.name } on team ${ this.owner?.team?.name } gain +2 health because ${ unitModifying.name } on team ${ unitModifying.team?.name } reduced its attack.`,
				);
				console.log( `${ this.owner?.name } on team ${ this.owner?.team?.name } gain +2 attack and +2 health because ${ unitModifying.name } on team ${ unitModifying.team?.name } reduced its attack.` );
			}

			origSubtract.call( this, stat, amount, unitModifying );
		};
	}
}

export class TimeKeeper extends Unit {
	roundsToTimeWarp = 4;
	availableTimeWarpRounds = 0;
	temporalShield = 0;
	constructor() {
		super( "⏰ Time Keeper", 4, 9 );

		//Time Warp
		//REFACTOR Use the strike modifier to have this happen.
		this.on( Action.AFTER_ATTACK, ( target ) => {
			this.availableTimeWarpRounds++;
			if( this.availableTimeWarpRounds % this.roundsToTimeWarp ) return;

			this.team?.game?.addGameStep(
				this.uuid,
				GameAction.TIME_WARP,
				1,
				GameActionStat.STRIKES,
				this.uuid,
				`${ this.name } on team ${ this.team?.name } has warped time attacking again this turn`,
			);
			console.log( `${ this.name } on team ${ this.team?.name } has warped time attacking again this turn` );
			this.emit( Action.ATTACK, target );
		});

		//Temporal Shield
		this.on( Action.BEFORE_GAME, () => {
			this.temporalShield = Math.ceil( this.stats.health * .5 );

			this.team?.game?.addBeforeGameStep(
				this.uuid,
				GameAction.TEMPORAL_SHIELD,
				this.temporalShield,
				GameActionStat.SHIELD,
				this.uuid,
				`${ this.name } on team ${ this.team?.name } has gained a temporal shield for ${ this.temporalShield }`,
			);
			console.log( `${ this.name } on team ${ this.team?.name } has gained a temporal shield for ${ this.temporalShield }` );
		});

		this.on( Action.START_OF_TURN, ( target ) => {
			const temporalShieldGain =  Math.ceil( this.stats.health * .1 );
			this.temporalShield += temporalShieldGain;

			this.team?.game?.addGameStep(
				this.uuid,
				GameAction.TEMPORAL_SHIELD,
				temporalShieldGain,
				GameActionStat.SHIELD,
				this.uuid,
				`${ this.name } on team ${ this.team?.name }'s temporal shield gained ${ temporalShieldGain }`,
			);
			console.log( `${ this.name } on team ${ this.team?.name }'s temporal shield gained ${ temporalShieldGain }` );
		});
	}

	/*
	*	annoyingly override the parent hurt to allow for temporal shield to the current health calculation.
   	*	Health is taken from temporal shield first. Mitigating damage with shield does not fire attackers DAMAGE_DEALT event.
   	*/
	hurt( amount: number, attacker: Unit ): number {
		const firstAlive = this.team?.findFirstAliveUnit();
		this.emit( Action.BEFORE_TAKE_DAMAGE, attacker, firstAlive, amount );

		const wasAlive = this.currentHealth > 0;
		let hurtAmount = amount - Math.ceil( amount * ( this.stats.defense / 100 ));

		const overHit = this.temporalShield - hurtAmount;
		if( overHit < 0 ) {

			this.team?.game?.addGameStep(
				this.uuid,
				GameAction.TEMPORAL_SHIELD,
				-this.temporalShield,
				GameActionStat.SHIELD,
				this.uuid,
				`${ this.name }'s on team ${ this.team?.name }'s temporal shield blocked ${ this.temporalShield } and had the rest taken as health`,
			);
			console.log( `${ this.name }'s on team ${ this.team?.name }'s temporal shield blocked ${ this.temporalShield } and had ${ -overHit } taken from health` );
			this.temporalShield = 0;

			hurtAmount = -overHit;
			//this is going to be negative for any damage done over temporal shield. Adding it will subtract from current health
			this.currentHealth += overHit;
			attacker.emit( Action.DEALT_DAMAGE, this, firstAlive, hurtAmount );

		}
		else {
			this.team?.game?.addGameStep(
				this.uuid,
				GameAction.TEMPORAL_SHIELD,
				-this.temporalShield,
				GameActionStat.SHIELD,
				this.uuid,
				`${ this.name } on team ${ this.team?.name }'s temporal shield blocked ${ hurtAmount }`,
			);
			console.log( `${ this.name } on team ${ this.team?.name }'s temporal shield blocked ${ hurtAmount }` );

			hurtAmount = 0;
			this.temporalShield = overHit;
		}

		const isDead = this.currentHealth <= 0;
		if( wasAlive && isDead && attacker ) {
			this.killer = attacker;
		}
		this.emit( Action.AFTER_TAKE_DAMAGE, attacker, firstAlive, hurtAmount );
		if( this.isFirstDamageTaken ) {
			this.emit( Action.FIRST_TAKE_DAMAGE, this, firstAlive, hurtAmount );
			this.isFirstDamageTaken = false;
		}
		return hurtAmount;
	}
}

// export class Tinkerer extends Unit {
// 	constructor() {
// 		super( 3, 7 );

// }