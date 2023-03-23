import { Unit } from "./unit";

export class Team {
	units: Unit[];
	constructor( ...units: Unit[] ) {
		this.units = units;
	}
}