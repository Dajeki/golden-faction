import { Game } from "@/lib/game/game";
import { Team } from "@/lib/game/team";
import { Acolyte, Alchemist, CorruptedWitch, Druid, LargeSpider, Mage, Minotaur, OrcWarrior, Paladin, RavenousDog, Rogue, Shaman, TimeKeeper, Unit, Warrior, Watcher } from "@/lib/game/unit";
import { startLogging, stopLogging } from "@/lib/logger";
import { NextRequest, NextResponse } from "next/server";


export async function GET( req: NextRequest ) {
	startLogging();
	const teamOne = new Team( "Dan", new LargeSpider(), new Warrior(), new Acolyte(), new Rogue(), new Shaman(), new Watcher(), new Druid(), new Alchemist(), new RavenousDog(), new Paladin(), new Mage(), new Minotaur(), new CorruptedWitch(), new OrcWarrior(), new TimeKeeper());
	const teamTwo = new Team( "Lunarix", new Rogue(), new Warrior(), new LargeSpider(), new Acolyte(), new Alchemist(), new Watcher(), new Shaman(), new RavenousDog(), new Druid(), new Minotaur(), new Mage(), new CorruptedWitch(), new Paladin(), new TimeKeeper(), new OrcWarrior());

	// const teamOne = new Team( "Dan", new CorruptedWitch());
	// const teamTwo = new Team( "Lunarix", new OrcWarrior());

	teamOne.opposingTeam = teamTwo;
	teamTwo.opposingTeam = teamOne;

	const game = new Game( teamOne, teamTwo, 0 );
	game.run();
	console.log( `The winner is ${ game.outcome.winner }` );
	console.log( `The losing is ${ game.outcome.loser }` );

	stopLogging();
	return NextResponse.json({ winner: game.outcome.winner?.toString(), loser: game.outcome.loser?.toString() });
}