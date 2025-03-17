// src/api/services/apolloClient.ts
import { ApolloClient, InMemoryCache, HttpLink } from "@apollo/client";
import fetch from "cross-fetch";

export const initializeApolloClient = (accessToken: string) => {
  const httpLink = new HttpLink({
    uri: process.env.NEXT_PUBLIC_GRAPHQL_ENDPOINT, // e.g. "http://localhost:3000/api/graphql"
    credentials: "include", // ensures cookies are sent if needed
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    fetch,
  });

  return new ApolloClient({
    link: httpLink,
    cache: new InMemoryCache(),
  });
};
