import { NextApiRequest, NextApiResponse } from "next";
import NextAuth from "next-auth";
import Providers from "next-auth/providers";
import { connectToDatabase } from "src/lib/mongodb";

export async function GET( request: NextApiRequest, res: NextApiResponse ) {
	return new Response( "Every Other Response!" );
}
