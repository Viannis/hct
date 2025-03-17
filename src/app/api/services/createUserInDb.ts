import { gql } from "@apollo/client";
import { initializeApolloClient } from "@utils/apolloClient";
import axios from "axios";

const CREATE_USER_MUTATION = gql`
  mutation CreateUser($input: CreateUserInput!) {
    createUser(input: $input) {
      id
      name
      email
      role
      auth0Id
    }
  }
`;

interface CreateUserInput {
  email: string;
  name: string;
  role: string;
  auth0Id: string;
}

export const createUserInDb = async (input: CreateUserInput) => {
  try {
    // Fetch the access token from your API route
    const response = await axios.get("/api/get-token");
    const accessToken = response.data.accessToken;
    if (accessToken) {
      const client = initializeApolloClient(accessToken);
      try {
        const { data } = await client.mutate({
          mutation: CREATE_USER_MUTATION,
          variables: { input },
        });
        return data.createUser;
      } catch (error) {
        throw new Error(`GraphQL error: ${error}`);
      }
    } else {
      console.error("No access token received");
      throw new Error("No access token received");
    }
  } catch (error) {
    console.error("Error fetching access token:", error);
    throw new Error("Error fetching access token");
  }
};
