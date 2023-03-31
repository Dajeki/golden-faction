"use client";
import { getSession, SessionProvider } from "next-auth/react";
import { ReactNode, useEffect, useState } from "react";
import { Session } from "next-auth";
import { headers } from "next/headers";

export interface AuthContextProps {
	children: React.ReactNode;
	session: Session;
}

export default function SessionContextProvider({ children, session }: AuthContextProps ) {

	return (
		<SessionProvider session={ session }>
			{ children }
		</SessionProvider>
	);
}