import { EventEmitter } from "node:events";
import { Action } from "./action";
import { Stat } from "./stats";
import { Unit } from "./unit";


//IMPLIMENTATION is to add the appropriate event handlers into the event. Make sure you fire all this stuff off inside the base Unit.
export class Effect {
	private _caster: Unit;
	private _actions: EventEmitter = new EventEmitter();
	duration = 0;

	constructor( caster: Unit ) {
		this._caster = caster;
	}

	get caster() {
		return this._caster;
	}

	//TODO: Maybe type the event args for each Action?
	on( event: keyof typeof Action, callback: ( target?: Unit )=>void ) {
		this._actions.on( event, callback );
	}

	emit( event: keyof typeof Action, ...eventInfo: [Unit] ) {
		this._actions.emit( event, ...eventInfo );
	}

	getEffectName() {
		return this.constructor.name;
	}

	handleDuration( target: Unit ) {
		this.duration -= 1;
		if( !this.duration ) {
			target.removeDebuff( this );
			return false;
		}
		return true;
	}
}


export class PoisonFangs extends Effect {
	duration = 2;

	constructor( caster: Unit ) {
		super( caster );

		this.on( Action.START_OF_TURN, ( target ) => {
			if( !target ) return;

			const isStillRunning = !this.handleDuration( target );
			if( !isStillRunning ) return;
			target?.stats.subtract( Stat.HEALTH, 1 );
			console.log( `${ this.caster.getUnitName() } on team ${ target.team?.opposingTeam?.name } did ${ 1 } damage with ${ this.getEffectName() } to ${ target.team?.name }` );
		});
	}
}

export class WebWrap extends Effect {
	duration = 3;

	constructor( caster: Unit ) {
		super( caster );

		this.on( Action.START_OF_TURN, ( target ) => {
			if( !target ) return;

			const isStillRunning = this.handleDuration( target );
			if( !isStillRunning ) {
				target.isCrowdControlled = false;
				return;
			}

			target.isCrowdControlled = true;
			console.log( `${ this.caster.getUnitName() } on team ${ target.team?.opposingTeam?.name }'s ${ this.getEffectName() } crowd controlled ${ target.getUnitName() }` );
		});
	}
}