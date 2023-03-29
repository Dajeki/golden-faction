import { Game } from "@/lib/game/game";
import { Team } from "@/lib/game/team";
import { Acolyte, Alchemist, CorruptedWitch, Druid, LargeSpider, OrcWarrior, Paladin, Rogue, Unit, Warrior } from "@/lib/game/unit";
import { NextRequest, NextResponse } from "next/server";

export async function GET( req: NextRequest ) {
	// const teamOne = new Team( "Dan", new Druid(), new Warrior(), new Alchemist(), new Rogue(), new Paladin(), new Warrior, new Acolyte(), new LargeSpider());
	// const teamTwo = new Team( "Lunarix", new Warrior(), new Warrior(), new Alchemist(), new Rogue(), new Warrior, new Acolyte(), new LargeSpider());

	const teamOne = new Team( "Dan", new CorruptedWitch());
	const teamTwo = new Team( "Lunarix", new OrcWarrior());

	teamOne.opposingTeam = teamTwo;
	teamTwo.opposingTeam = teamOne;

	const game = new Game( teamOne, teamTwo, 0 );
	game.run();
	console.log( `The winner is ${ game.winner }` );

	return NextResponse.json({ winner: game.winner?.toString() });
}