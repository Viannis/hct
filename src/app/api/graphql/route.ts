import { ApolloServer } from "@apollo/server";
import { startServerAndCreateNextHandler } from "@as-integrations/next";
import typeDefs from "./schema";
import { resolvers } from "./resolvers";
import { NextRequest, NextResponse } from "next/server";
import { Claims, getSession } from "@auth0/nextjs-auth0";
import { verifyAccessToken } from "@api/services";

// Define the context type for Apollo Server
type Context = {
  req: NextRequest;
  user?: Claims;
};

// Create the Apollo Server instance with your schema and resolvers
const server = new ApolloServer<Context>({
  typeDefs,
  resolvers,
});

// Create the handler using the integration's helper function and define the context function
const handler = startServerAndCreateNextHandler(server, {
  context: async (req: NextRequest): Promise<Context> => {
    // The context is the request and user
    console.log("GraphQL route called handler");

    const res = NextResponse.next(); // The response is the next response
    const session = await getSession(req, res); // The session is the session from the request

    console.log("Session found in graphql route");

    if (!session?.user) {
      // Check if the user is authenticated
      const authHeader = req.headers.get("authorization") ?? ""; // The authorization header is the authorization header from the request
      const token = authHeader.replace("Bearer ", ""); // The token is the token from the authorization header
      if (!token) {
        throw new Error("Authorization token is required"); // Throw an error if the token is not found
      }

      console.log("Token found in graphql route");

      try {
        const decodedToken = await verifyAccessToken(token); // Decode the token
        console.log("Token Decoded");
        const session = { user: decodedToken } as Claims; // The session is the decoded token
        return { req, user: session.user }; // Return the request and user
      } catch (error) {
        console.error("Error verifying JWT token:", error); // Log the error
        throw new Error("Unauthorized"); // Throw an error if the token is not valid
      }
    }

    console.log("Session found in graphql route", session.user); // Log the user
    return { req, user: session.user }; // Return the request and user
  },
});

// Export GET and POST functions that wrap the handler to satisfy Next.js's expected signature
export async function GET(req: NextRequest) {
  return handler(req); // Return the handler
}

export async function POST(req: NextRequest) {
  return handler(req); // Return the handler
}
