import { EventEmitter } from "node:events";
import { Action } from "./action";
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
	on( event: keyof typeof Action, callback: ( target: Unit )=>void ) {
		this._actions.prependListener( event, callback );
	}

	once( event: keyof typeof Action, callback: ( target: Unit )=>void ) {
		this._actions.prependOnceListener( event, callback );
	}

	emit( event: keyof typeof Action, ...eventInfo: [Unit] ) {
		this._actions.emit( event, ...eventInfo );
	}

	handleDuration( target: Unit ) {
		this.duration -= 1;
		if( this.duration === 0 ) {
			this.once( Action.END_OF_TURN, () => {
				target.removeDebuff( this );
			});
			return false;
		}

		return true;
	}

	resetDuration() {
		this.duration = this.startDuration;
	}
}

export class PoisonFangs extends Effect {
	coef = .5;

	constructor( caster: Unit ) {
		super( "Poison Fang", caster, 2 );

		this.on( Action.START_OF_TURN, ( target ) => {
			this.handleDuration( target );
			target.stats.subtract( Stat.HEALTH, Math.ceil( caster.stats.attack * this.coef ), this.caster );
			console.log( `${ this.caster.name } on team ${ target.team?.opposingTeam?.name } did ${ 1 } damage with ${ this.name } to ${ target.name } on team ${ target.team?.name }` );

		});
	}
}

export class WebWrap extends Effect {
	constructor( caster: Unit ) {
		super( "Web Wrap", caster, 3 );

		this.on( Action.START_OF_TURN, ( target ) => {
			console.log( `${ this.caster.name } on team ${ this.caster.team?.name }'s ${ this.name } crowd controlled ${ target.name }` );

			target.isCrowdControlled = true;

			const isStillRunning = this.handleDuration( target );
			if( !isStillRunning ) {
				//need to wait till end of turn to remove else attack and other stuff will end up firing still.
				//Events only have start of turn and end of turn logic for when you can remove cc for now.
				this.once( Action.END_OF_TURN, () => {
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
	constructor( caster: Unit ) {
		super( "Rally", caster );

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
			console.log( `${ this.caster.name } on team ${ this.caster.team?.name }'s ${ this.name } changed Attack ${ warriorDIfference * -1 }` );
		};

		this.on( Action.BEFORE_GAME, rallyHandler );
		//Repeat process on the end of every turn.
		this.on( Action.END_OF_TURN, rallyHandler );
	}
}

export class AcidicConcoction extends Effect {
	coef = 1.2;

	constructor( caster: Unit ) {
		super( "Acidic Concoction", caster, 1 );

		this.on( Action.START_OF_TURN, ( target ) => {
			this.handleDuration( target );
			target.hurt( Math.ceil( caster.stats.attack * this.coef ), this.caster );
			console.log( `${ this.caster.name } on team ${ target.team?.opposingTeam?.name } did ${ 1 } damage with ${ this.name } to ${ target.name } on team ${ target.team?.name }` );

		});
	}
}

export class Bramble extends Effect {
	brambleCoef = .2;
	startBrambleReduc = 0;

	constructor( caster: Unit ) {
		super( "Bramble", caster, 2 );


		this.on( Action.ON_ADD, ( target ) => {
			this.startBrambleReduc = Math.ceil( target.stats.attack * this.brambleCoef );
			console.log( `${ this.caster.name } on team ${ target.team?.opposingTeam?.name }'s ${ this.name } reduced ${ target.name } on team ${ target.team?.name }'s attack by ${ this.startBrambleReduc }` );
			target.stats.subtract( Stat.ATTACK, this.startBrambleReduc );
		});

		this.on( Action.START_OF_TURN, ( target ) => {
			this.handleDuration( target );
		});

		this.on( Action.ON_REMOVE, ( target ) => {
			target.stats.add( Stat.ATTACK, this.startBrambleReduc );
			console.log( `${ this.caster.name } on team ${ target.team?.opposingTeam?.name }'s ${ this.name } removed from ${ target.name } on team ${ target.team?.name }'s so attack incresed by ${ this.startBrambleReduc }` );
		});
	}
}

export class ExplodingNettle extends Effect {
	nettleCoef = .6;

	constructor( caster: Unit ) {
		super( "Exploding Nettle", caster, 3 );

		this.on( Action.ON_ADD, ( target ) => {
			//die event gets the first alive enemy unit
			target.once( Action.DIE, ( EnemyTarget ) => {
				const unitsAround = target.team?.getAliveUnitAroundTarget( target );
				unitsAround?.behind?.addDebuff( new ExplodingNettle( caster ));
				console.log( `${ target.name } died so ${ this.name } moved to ${ unitsAround?.behind?.name } with duration ${ this.duration }` );
			});

			console.log( `${ this.caster.name } on team ${ target.team?.opposingTeam?.name }'s ${ this.name } infected ${ target.name } on team ${ target.team?.name }` );
		});

		this.on( Action.START_OF_TURN, ( target ) => {
			this.handleDuration( target );
		});

		this.on( Action.ON_REMOVE, ( target ) => {
			const nettleDamage = Math.ceil( caster.stats.attack * this.nettleCoef );
			target.hurt( nettleDamage, this.caster );
			const unitsAround = target.team?.getAliveUnitAroundTarget( target );
			unitsAround?.behind?.addDebuff( new ExplodingNettle( caster ));
			console.log( `${ this.caster.name } on team ${ target.team?.opposingTeam?.name }'s ${ this.name } exploded dealing ${ nettleDamage } to ${ target.name } on team ${ target.team?.name } so it moved to ${ unitsAround?.behind?.name } and reset its duration.` );
		});
	}
}

export class Curse extends Effect {
	curseCoef = .3;
	reduction = 0;

	constructor( caster: Unit ) {
		super( "Curse", caster, 3 );

		this.on( Action.ON_ADD, ( target ) => {

			this.reduction = Math.ceil( target.stats.attack * this.curseCoef );
			//die event gets the first alive enemy unit
			target.stats.subtract( Stat.ATTACK, this.reduction, this.caster );
			console.log( `${ this.caster.name } on team ${ target.team?.opposingTeam?.name }'s ${ this.name } infected ${ target.name } on team ${ target.team?.name } reducing attack by ${ this.reduction }` );
		});

		this.on( Action.START_OF_TURN, ( target ) => {
			this.handleDuration( target );
		});

		this.on( Action.ON_REMOVE, ( target ) => {
			target.stats.add( Stat.ATTACK, this.reduction );
			console.log( `${ this.caster.name } on team ${ target.team?.opposingTeam?.name }'s ${ this.name } expired from ${ target.name } on team ${ target.team?.name } and ${ this.reduction } attack was returned` );
		});
	}
}

export class Headbutt extends Effect {
	constructor( caster: Unit ) {
		super( "Head Butt", caster, 1 );

		this.on( Action.START_OF_TURN, ( target ) => {
			console.log( `${ this.caster.name } on team ${ this.caster.team?.name }'s ${ this.name } crowd controlled ${ target.name }` );

			target.isCrowdControlled = true;

			const isStillRunning = this.handleDuration( target );
			if( !isStillRunning ) {
				//need to wait till end of turn to remove else attack and other stuff will end up firing still.
				//Events only have start of turn and end of turn logic for when you can remove cc for now.
				this.once( Action.END_OF_TURN, () => {
					target.isCrowdControlled = false;
				});
				return;
			}
		});
	}
}