import { EventEmitter } from "node:events";
import { Action } from "./action";
import { Unit } from "./unit";

export class Effect {
	name: string;
	private _caster: Unit;
	private _actions: EventEmitter = new EventEmitter();

	constructor( name: string, caster: Unit ) {
		this.name = name;
		this._caster = caster;
	}

	//TODO: Maybe type the event args for each Action?
	on( event: keyof typeof Action, callback: ()=>void ) {
		this._actions.on( event, callback );
	}
}