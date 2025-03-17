// src/app/api/graphql/route.ts
import { ApolloServer } from "@apollo/server";
import { startServerAndCreateNextHandler } from "@as-integrations/next";
import typeDefs from "./schema";
import { resolvers } from "./resolvers";
import { NextRequest, NextResponse } from "next/server";
import { Claims, getSession } from "@auth0/nextjs-auth0";
import { verifyAccessToken } from "@api/services";
// Define the context type
type Context = {
  req: NextRequest;
  user?: Claims;
};

const server = new ApolloServer<Context>({
  typeDefs,
  resolvers,
});

const handler = startServerAndCreateNextHandler(server, {
  context: async (req: NextRequest): Promise<Context> => {
    console.log("GraphQL route called handler");

    const res = NextResponse.next();
    const session = await getSession(req, res);

    console.log("Session found in graphql route");

    if (!session?.user) {
      const authHeader = req.headers.get("authorization") ?? "";
      const token = authHeader.replace("Bearer ", "");
      if (!token) {
        throw new Error("Authorization token is required");
      }

      console.log("Token found in grpahql route");

      try {
        const decodedToken = await verifyAccessToken(token);
        console.log("Token Decoded");
        const session = { user: decodedToken } as any;
        return { req, user: session.user };
      } catch (error) {
        console.error("Error verifying JWT token:", error);
        throw new Error("Unauthorized");
      }
    }

    console.log("Session found in graphql route", session.user);

    return { req, user: session.user };
  },
});

export { handler as GET, handler as POST };
