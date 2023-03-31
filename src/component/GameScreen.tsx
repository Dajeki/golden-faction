import GameContextProvider from "./provider/GameContextProvider";
import { Stat } from "@/lib/game/stats";
import { Game, GameAction } from "@/lib/game/game";
import { Team } from "@/lib/game/team";
import { CorruptedWitch, OrcWarrior } from "@/lib/game/unit";

export default function GameScreen() {
	//call game function here
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

	const mockGameInfo : GameAction = {
		name  : "warrior",
		uuid  : crypto.randomUUID(),
		action: {
			name  : "attack",
			amount: 5,
			stat  : Stat.HEALTH,
		},
		target: {
			name: "acolyte",
			uuid: crypto.randomUUID(),
		},
		text: "hello",
	};
	return (
		<GameContextProvider gameActions={ mockGameInfo }>

		</GameContextProvider>
	);

}