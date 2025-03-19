import { ApolloClient, NormalizedCacheObject } from "@apollo/client";
import { User } from "@prisma/client";
import { GET_USER } from "@utils/queries";

export const getUserFromDb = async ({ // Service function to fetch a user from the database
  apolloClient,
  userAuth0Id,
}: {
  apolloClient: ApolloClient<NormalizedCacheObject>; // Apollo client
  userAuth0Id: string; // User Auth0 ID
}): Promise<{ userFromDB?: User; error?: unknown }> => { // Promise to fetch a user from the database
  try {
    const result = await apolloClient.query({
      query: GET_USER, // Query to fetch a user from the database
      variables: { userId: userAuth0Id }, // Variables to fetch a user from the database
    });

    return { userFromDB: result.data.user }; // Return the user from the database
  } catch (error) {
    console.error("Error fetching user from DB:", error); // Log the error
    return { error: error }; // Return the error
  }
};
