"use client";

import React, { useState, useEffect } from "react";
import {
  ApolloProvider,
  ApolloClient,
  NormalizedCacheObject,
} from "@apollo/client";
import axios from "axios";
import { initializeApolloClient } from "@utils/apolloClient"; // Adjust the import path as needed

export default function ApolloProviderWrapper({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [client, setClient] =
    useState<ApolloClient<NormalizedCacheObject> | null>(null);

  useEffect(() => {
    const fetchTokenAndInitializeClient = async () => {
      try {
        // Fetch the access token from your API route
        const response = await axios.get("/api/get-access-token");
        const accessToken = response.data.accessToken;
        if (accessToken) {
          const apolloClient = initializeApolloClient(accessToken);
          setClient(apolloClient);
        } else {
          const apolloClient = initializeApolloClient("");
          setClient(apolloClient);
          console.error("No access token received");
        }
      } catch (error) {
        const apolloClient = initializeApolloClient("");
        setClient(apolloClient);
        console.error("Error fetching access token:", error);
      }
    };

    fetchTokenAndInitializeClient();
  }, []);

  if (!client) {
    return <div>Loading...</div>;
  }

  return <ApolloProvider client={client}>{children}</ApolloProvider>;
}
