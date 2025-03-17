import { ApolloClient, NormalizedCacheObject } from "@apollo/client";
import { User } from "@prisma/client";
import { GET_USER } from "@utils/queries";

export const getUserFromDb = async ({
  apolloClient,
  userAuth0Id,
}: {
  apolloClient: ApolloClient<NormalizedCacheObject>;
  userAuth0Id: string;
}): Promise<{ userFromDB?: User; error?: unknown }> => {
  try {
    const result = await apolloClient.query({
      query: GET_USER,
      variables: { userId: userAuth0Id },
    });

    return { userFromDB: result.data.user };
  } catch (error) {
    console.error("Error fetching user from DB:", error);
    throw error;
  }
};
