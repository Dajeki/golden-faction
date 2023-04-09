import { EventEmitter } from "node:events";
import { Action } from "./action";
import { GameActionStat } from "./game";
import { Stat } from "./stats";
import { Unit } from "./unit";


//IMPLIMENTATION is to add the appropriate event handlers into the event. Make sure you fire all this stuff off inside the base Unit.
export class Effect {
	private _caster: Unit;
	private _actions: EventEmitter = new EventEmitter();
	duration;
	name: string;
	coef = 0;
	startDuration;

	constructor( name: string, caster: Unit, duration = 0 ) {
		this.name = name;
		this._caster = caster;
		this.duration = duration;
		this.startDuration = duration;
	}

	get caster() {
		return this._caster;
	}

	//TODO: Maybe type the event args for each Action?
	on( event: keyof typeof Action, callback: ( target: Unit, firstAlive?: Unit )=>void ) {
		this._actions.prependListener( event, callback );
	}

	once( event: keyof typeof Action, callback: ( target?: Unit, firstAlive?: Unit )=>void ) {
		this._actions.prependOnceListener( event, callback );
	}

	emit( event: keyof typeof Action, ...eventInfo: [Unit, Unit?] ) {
		this._actions.emit( event, ...eventInfo );
	}

	handleDuration( target: Unit ) {
		this.duration -= 1;
		target.team?.game?.addGameStep(
			this.caster.uuid,
			this.name,
			-1,
			GameActionStat.DURATION,
			target.uuid,
			`${ this.caster.name } on team ${ this.caster.team?.name }'s ${ this.name } duration on ${ target.name } on team ${ target.team?.name } reduced by 1`,
		);
		if( this.duration <= 0 ) {
			this.once( Action.END_OF_TURN, () => {
				target.removeDebuff( this );
			});
			return false;
		}

		return true;
	}

	resetDuration( target: Unit ) {
		this.duration = this.startDuration;
		this.caster.team?.game?.addGameStep(
			this.caster.uuid,
			this.name,
			this.startDuration,
			GameActionStat.DURATION,
			target.uuid,
			`${ this.caster.name } on team ${ this.caster.team?.name } ${ this.name } reset on ${ target.name } on team ${ target.team?.name }`,
		);
	}

	toJSON() {
		return {
			name             : this.name,
			caster           : this.caster.uuid,
			remainingDuration: this.duration,
			startDuration    : this.startDuration,
		};
	}
}

export class PoisonFangs extends Effect {
	coef = .5;

	constructor( caster: Unit ) {
		super( "poisonFang", caster, 2 );

		this.on( Action.START_OF_TURN, ( target ) => {
			this.handleDuration( target );
			const poisonFangDamage = target.hurt( Math.ceil( caster.stats.attack * this.coef ), this.caster );
			this.caster.team?.game?.addGameStep(
				this.caster.uuid,
				this.name,
				poisonFangDamage,
				GameActionStat.CURRENT_HEALTH,
				target.uuid,
				`${ this.caster.name } on team ${ this.caster.team?.name }'s ${ this.name } did ${ poisonFangDamage } damage with ${ this.name } to ${ target.name } on team ${ target.team?.name }`,
			);
			console.log( `${ this.caster.name } on team ${ this.caster.team?.name }'s ${ this.name } did ${ poisonFangDamage } damage with ${ this.name } to ${ target.name } on team ${ target.team?.name }` );
		});
	}
}

export class WebWrap extends Effect {
	constructor( caster: Unit ) {
		super( "webWrap", caster, 3 );

		this.on( Action.START_OF_TURN, ( target ) => {
			target.team?.game?.addGameStep(
				caster.uuid,
				this.name,
				1,
				GameActionStat.CONTROL,
				target.uuid,
				`${ this.caster.name } on team ${ this.caster.team?.name }'s ${ this.name } crowd controlled ${ target.name } on ${ target.team?.name }`,
			);
			console.log( `${ this.caster.name } on team ${ this.caster.team?.name }'s ${ this.name } crowd controlled ${ target.name }` );

			target.isCrowdControlled = true;

			const isStillRunning = this.handleDuration( target );
			if( !isStillRunning ) {
				//need to wait till end of turn to remove else attack and other stuff will end up firing still.
				//Events only have start of turn and end of turn logic for when you can remove cc for now.
				this.once( Action.END_OF_TURN, () => {
					target.team?.game?.addGameStep(
						caster.uuid,
						this.name,
						-1,
						GameActionStat.CONTROL,
						target.uuid,
						`${ target.name } on ${ target.team?.name } is no longer crowd controlled by ${ this.caster.name } on team ${ this.caster.team?.name }'s ${ this.name } `,
					);
					target.isCrowdControlled = false;
				});
				return;
			}
		});
	}
}

export class Rally extends Effect {
	warriorUnits = ["💪 Warrior", "🪓 Orc Warrior", "🛡️ Paladin", "🐂 Minotaur"];
	lastNumberOfWarriors = 0;
	rallyCoef = .3;
	lastAttackChange = 0;
	constructor( caster: Unit ) {
		super( "rally", caster );

		const rallyHandler = ( target: Unit ) => {
			if( !this.caster.team || target.isDead ) return;

			const numberOfWarriors = this.caster.team.units.reduce(( reducer, unit ) => {
				return this.warriorUnits.includes( unit.name ) && target !== unit && !unit.isDead ? ++reducer : reducer;
			}, 0 );

			if( numberOfWarriors === this.lastNumberOfWarriors ) return;

			//this should increase or decrease based on the difference appropriately.
			const warriorDIfference = this.lastNumberOfWarriors - numberOfWarriors;
			this.lastNumberOfWarriors = numberOfWarriors;
			this.caster.stats.subtract( Stat.ATTACK, Math.round( warriorDIfference * caster.stats.attack * this.rallyCoef ));
			this.lastAttackChange = warriorDIfference * -1;

		};

		this.on( Action.BEFORE_GAME, ( target ) => {
			rallyHandler( target );
			this.caster.team?.game?.addBeforeGameStep(
				this.caster.uuid,
				this.name,
				this.lastAttackChange,
				GameActionStat.ATTACK,
				this.caster.uuid,
				`${ this.caster.name } on team ${ this.caster.team?.name }'s ${ this.name } changed Attack ${ this.lastAttackChange }`,
			);
		});
		//Repeat process on the end of every turn.
		this.on( Action.END_OF_TURN, ( target ) => {
			rallyHandler( target );
			this.caster.team?.game?.addGameStep(
				this.caster.uuid,
				this.name,
				this.lastAttackChange,
				GameActionStat.ATTACK,
				this.caster.uuid,
				`${ this.caster.name } on team ${ this.caster.team?.name }'s ${ this.name } changed Attack ${ this.lastAttackChange }`,
			);
		});
	}
}

export class AcidicConcoction extends Effect {
	coef = 1.2;

	constructor( caster: Unit ) {
		super( "acidicConcoction", caster, 1 );

		this.on( Action.START_OF_TURN, ( target ) => {
			this.handleDuration( target );
			const acidConDamage = target.hurt( Math.ceil( caster.stats.attack * this.coef ), this.caster );
			this.caster.team?.game?.addGameStep(
				this.caster.uuid,
				this.name,
				acidConDamage,
				GameActionStat.CURRENT_HEALTH,
				target.uuid,
				`${ this.caster.name } on team ${ this.caster.team?.name }'s ${ this.name } did ${ acidConDamage } damage with ${ this.name } to ${ target.name } on team ${ target.team?.name }`,
			);
			console.log( `${ this.caster.name } on team ${ this.caster.team?.name }'s ${ this.name } did ${ acidConDamage } damage with ${ this.name } to ${ target.name } on team ${ target.team?.name }` );

		});
	}
}

export class Bramble extends Effect {
	brambleCoef = .2;
	brambleReduc = 0;

	constructor( caster: Unit ) {
		super( "bramble", caster, 2 );


		this.on( Action.ON_ADD, ( target ) => {
			this.brambleReduc = Math.ceil( target.stats.attack * this.brambleCoef );
			this.caster.team?.game?.addGameStep(
				this.caster.uuid,
				this.name,
				-this.brambleReduc,
				GameActionStat.ATTACK,
				target.uuid,
				`${ this.caster.name } on team ${ target.team?.opposingTeam?.name }'s ${ this.name } reduced ${ target.name } on team ${ target.team?.name }'s attack by ${ this.brambleReduc }`,
			);
			console.log( `${ this.caster.name } on team ${ target.team?.opposingTeam?.name }'s ${ this.name } reduced ${ target.name } on team ${ target.team?.name }'s attack by ${ this.brambleReduc }` );
			target.stats.subtract( Stat.ATTACK, this.brambleReduc );
		});

		this.on( Action.START_OF_TURN, ( target ) => {
			const brambleAttackChange = Math.ceil( target.stats.attack * this.brambleCoef ) - this.brambleReduc;
			this.caster.team?.game?.addGameStep(
				this.caster.uuid,
				this.name,
				-brambleAttackChange,
				GameActionStat.ATTACK,
				target.uuid,
				`${ this.caster.name } on team ${ target.team?.opposingTeam?.name }'s ${ this.name } reduced ${ target.name } on team ${ target.team?.name }'s attack by ${ this.brambleReduc }`,
			);

			target.stats.subtract( Stat.ATTACK, brambleAttackChange );
			this.handleDuration( target );
		});

		this.on( Action.ON_REMOVE, ( target ) => {
			target.stats.add( Stat.ATTACK, this.brambleReduc );
			this.caster.team?.game?.addGameStep(
				this.caster.uuid,
				this.name,
				this.brambleReduc,
				GameActionStat.ATTACK,
				target.uuid,
				`${ this.caster.name } on team ${ target.team?.opposingTeam?.name }'s ${ this.name } removed from ${ target.name } on team ${ target.team?.name }'s so attack incresed by ${ this.brambleReduc }`,
			);
			console.log( `${ this.caster.name } on team ${ target.team?.opposingTeam?.name }'s ${ this.name } removed from ${ target.name } on team ${ target.team?.name }'s so attack incresed by ${ this.brambleReduc }` );
		});
	}
}

export class ExplodingNettle extends Effect {
	nettleCoef = .6;
	lastDieEvent?: ( target: Unit, firstAlive: Unit, damage?: number ) => void;

	constructor( caster: Unit ) {
		super( "explodingNettle", caster, 3 );

		this.on( Action.ON_ADD, ( target ) => {
			//die event gets the first alive enemy unit
			this.lastDieEvent = target.once( Action.DIE, ( EnemyTarget ) => {
				const unitsAround = target.team?.getAliveUnitAroundTarget( target );
				unitsAround?.behind?.addDebuff( this );
				target.removeDebuff( this );
				this.caster.team?.game?.addGameStep(
					target.uuid,
					this.name,
					0,
					GameActionStat.CURRENT_HEALTH,
					unitsAround?.behind?.uuid || "",
					`${ target.name } died so ${ this.name } moved to ${ unitsAround?.behind?.name } with duration ${ this.duration }`,
				);
				console.log( `${ target.name } died so ${ this.name } moved to ${ unitsAround?.behind?.name } with duration ${ this.duration }` );
			});
		});

		this.on( Action.START_OF_TURN, ( target ) => {
			this.handleDuration( target );
		});

		this.on( Action.ON_REMOVE, ( target ) => {

			//check to see if the duration is getting transfered or creating a new one.
			if( !this.lastDieEvent || this.duration > 0 ) return;
			//remove the old die listener so they dont start stacking....
			target.removeListener( Action.DIE, this.lastDieEvent );

			const nettleDamage = Math.ceil( caster.stats.attack * this.nettleCoef );
			const effectiveNettleDamage = target.hurt( nettleDamage, this.caster );
			const unitsAround = target.team?.getAliveUnitAroundTarget( target );
			unitsAround?.behind?.addDebuff( new ExplodingNettle( caster ));
			this.caster.team?.game?.addGameStep(
				this.caster.uuid,
				this.name,
				effectiveNettleDamage,
				GameActionStat.CURRENT_HEALTH,
				target.uuid,
				`${ this.caster.name } on team ${ target.team?.opposingTeam?.name }'s ${ this.name } exploded dealing ${ nettleDamage } to ${ target.name } on team ${ target.team?.name }`,
			);
			console.log( `${ this.caster.name } on team ${ target.team?.opposingTeam?.name }'s ${ this.name } exploded dealing ${ nettleDamage } to ${ target.name } on team ${ target.team?.name }` );
		});
	}
}

export class Curse extends Effect {
	curseCoef = .3;
	reduction = 0;

	constructor( caster: Unit ) {
		super( "curse", caster, 3 );

		this.on( Action.ON_ADD, ( target ) => {

			this.reduction = Math.ceil( target.stats.attack * this.curseCoef );
			target.stats.subtract( Stat.ATTACK, this.reduction, this.caster );
			target.team?.game?.addGameStep(
				this.caster.uuid,
				this.name,
				-this.reduction,
				GameActionStat.ATTACK,
				target.uuid,
				`${ this.caster.name } on team ${ caster.team?.opposingTeam?.name }'s ${ this.name } infected ${ target.name } on team ${ target.team?.name } reducing attack by ${ this.reduction }`,
			);
			console.log( `${ this.caster.name } on team ${ caster.team?.opposingTeam?.name }'s ${ this.name } infected ${ target.name } on team ${ target.team?.name } reducing attack by ${ this.reduction }` );
		});

		this.on( Action.START_OF_TURN, ( target ) => {
			this.handleDuration( target );
		});

		this.on( Action.ON_REMOVE, ( target ) => {
			target.stats.add( Stat.ATTACK, this.reduction );
			target.team?.game?.addGameStep(
				this.caster.uuid,
				this.name,
				this.reduction,
				GameActionStat.ATTACK,
				target.uuid,
				`${ this.caster.name } on team ${ target.team?.opposingTeam?.name }'s ${ this.name } expired from ${ target.name } on team ${ target.team?.name } and ${ this.reduction } attack was returned`,
			);
			console.log( `${ this.caster.name } on team ${ target.team?.opposingTeam?.name }'s ${ this.name } expired from ${ target.name } on team ${ target.team?.name } and ${ this.reduction } attack was returned` );
		});
	}
}

export class Headbutt extends Effect {
	constructor( caster: Unit ) {
		super( "headbutt", caster, 1 );

		this.on( Action.START_OF_TURN, ( target ) => {
			target.team?.game?.addGameStep(
				caster.uuid,
				this.name,
				1,
				GameActionStat.CONTROL,
				target.uuid,
				`${ caster.name } on team ${ caster.team?.name } stunned ${ target.name } on team ${ target.team?.name } with headbutt`,
			);
			console.log( `${ caster.name } on team ${ caster.team?.name } stunned ${ target.name } on team ${ target.team?.name } with headbutt` );

			target.isCrowdControlled = true;

			const isStillRunning = this.handleDuration( target );
			if( isStillRunning ) return;
			//need to wait till end of turn to remove else attack and other stuff will end up firing still.
			//Events only have start of turn and end of turn logic for when you can remove cc for now.
			this.once( Action.END_OF_TURN, () => {
				target.isCrowdControlled = false;
				target.team?.game?.addGameStep(
					caster.uuid,
					this.name,
					-1,
					GameActionStat.CONTROL,
					target.uuid,
					`${ target.name } on ${ target.team?.name } is no longer crowd controlled by ${ this.caster.name } on team ${ this.caster.team?.name }'s ${ this.name } `,
				);
			});
		});
	}
}