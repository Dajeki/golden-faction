import EventEmitter from "node:events";
import { Action } from "./action";
import { Effect } from "./effect";
import { Item } from "./item";
import { Stats } from "./stats";
import { Team } from "./team";

export class Unit {

	stats: Stats;
	buffs: Effect[] = [];
	debuffs: Effect[] = [];
	items: Item[] = [];
	isFirstAttack = true;
	isDead = false;
	#team?: Team;

	private _actions:EventEmitter = new EventEmitter();

	constructor( attack?: number, health?: number, def?: number, crit?: number, dodge?: number, strikes?: number ) {
		this.stats =  new Stats( attack, health, def, crit, dodge, strikes );
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
}

//Tier 1 Units

export class Acolyte extends Unit {
	healCoef = .10;


	constructor() {
		super( 2, 3 );

		//Healing Flame
		this.on( Action.END_OF_TURN, () => {
			if( !this.team ) return;

			const lowestHealthUnit = this.team.findLowestHealthUnit();
			if( !lowestHealthUnit ) return;

			const healAmount = Math.ceil( this.stats.attack * this.healCoef );
			lowestHealthUnit.stats.add( "health", healAmount );

			console.log( `Acolyte on team ${ this.team?.name } healed ${ lowestHealthUnit } on team ${ this.team?.name } for ${ healAmount }` );
		});
	}
}

export class Goblin extends Unit {
	constructor() {
		super( 2, 2 );
	}
}

export class LargeSpider extends Unit {
	constructor() {
		super( 2, 2 );
	}
}

export class Rogue extends Unit {
	constructor() {
		super( 1, 3 );
	}
}

export class Warrior extends Unit {
	constructor() {
		super( 3, 3 );
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