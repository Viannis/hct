// src/api/services/apolloClient.ts
import { ApolloClient, InMemoryCache, HttpLink } from "@apollo/client";
import fetch from "cross-fetch";

export const initializeApolloClient = (accessToken: string) => {
  const httpLink = new HttpLink({ // Initialize the HTTP link
    uri: process.env.NEXT_PUBLIC_GRAPHQL_ENDPOINT, // e.g. "http://localhost:3000/api/graphql"
    credentials: "include", // ensures cookies are sent if needed
    headers: {
      Authorization: `Bearer ${accessToken}`, // Authorization header
    }, 
    fetch,
  });

  return new ApolloClient({ // Initialize the Apollo client
    link: httpLink, // Link to the Apollo client
    cache: new InMemoryCache(), // Cache to the Apollo client
  });
};
