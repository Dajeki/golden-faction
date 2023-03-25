import { Game } from "@/lib/game/game";
import { Team } from "@/lib/game/team";
import { Acolyte, LargeSpider, Rogue, Unit, Warrior } from "@/lib/game/unit";
import { NextRequest, NextResponse } from "next/server";

export async function GET( req: NextRequest ) {
	const teamOne = new Team( "Dan", new Warrior(), new Rogue(), new Acolyte(), new LargeSpider());
	const teamTwo = new Team( "Lunarix", new Warrior(), new Rogue(), new Acolyte(), new LargeSpider());

	teamOne.opposingTeam = teamTwo;
	teamTwo.opposingTeam = teamOne;

	const game = new Game( teamOne, teamTwo, 0 );
	game.run();
	console.log( `The winner is ${ game.winner }` );

	return NextResponse.json({ winner: game.winner });
}