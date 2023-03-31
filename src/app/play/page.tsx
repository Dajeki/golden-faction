import { Game } from "@/lib/game/game";
import { Team } from "@/lib/game/team";
import { CorruptedWitch, OrcWarrior } from "@/lib/game/unit";
import { getServerSession } from "next-auth";
import styles from "./play.module.css";

export default async function Play() {
	const session = await getServerSession();

	if( session ) {
		return (
			<div>logged in</div>
		);
	}

	//GET THIS FROM FETCHING DATA!!!!
	//const teamOne = new Team( "Dan", new LargeSpider(), new Warrior(), new Acolyte(), new Rogue(), new Shaman(), new Watcher(), new Druid(), new Alchemist(), new RavenousDog(), new Paladin(), new Mage(), new Minotaur(), new CorruptedWitch(), new OrcWarrior(), new TimeKeeper());
	//const teamTwo = new Team( "Lunarix", new Rogue(), new Warrior(), new LargeSpider(), new Acolyte(), new Alchemist(), new Watcher(), new Shaman(), new RavenousDog(), new Druid(), new Minotaur(), new Mage(), new CorruptedWitch(), new Paladin(), new TimeKeeper(), new OrcWarrior());

	const teamOne = new Team( "Dan", new CorruptedWitch());
	const teamTwo = new Team( "Lunarix", new OrcWarrior());

	teamOne.opposingTeam = teamTwo;
	teamTwo.opposingTeam = teamOne;

	const game = new Game( teamOne, teamTwo, 0 );
	const gameOutcome = game.run();
	console.log( `The winner is ${ game.outcome.winner }` );
	console.log( `The losing is ${ game.outcome.loser }` );

	return (
		<div className={ styles.board }>
			<div className={ styles.team }>

			</div>
			<div className={ styles.team }>

			</div>
		</div>
	);
	// return <div>Not logged in</div>;

}