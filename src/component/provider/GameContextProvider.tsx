"use client";
import { createContext, ReactNode, useEffect, useState } from "react";
import { GameAction } from "@/lib/game/game";

export interface GameContextProviderProps {
	children: React.ReactNode;
	gameActions: GameAction;
}

export interface GameContextValues {
	gameActions: GameAction;
}

export const GameContext = createContext<GameContextValues>({} as GameContextValues );

export default function GameContextProvider({ children, gameActions }: GameContextProviderProps ) {

	return (
		<GameContext.Provider value={{ gameActions }}>
			{ children }
		</GameContext.Provider>
	);
}