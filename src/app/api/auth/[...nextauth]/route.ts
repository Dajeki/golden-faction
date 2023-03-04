import { NextApiRequest, NextApiResponse } from "next";
import NextAuth from "next-auth";
import Providers from "next-auth/providers";
import { connectToDatabase } from "@/lib/mongodb";

export async function GET( request: NextApiRequest, res: NextApiResponse ) {
	console.log( request.url );
	return new Response( "Every Other Response!" );
}
