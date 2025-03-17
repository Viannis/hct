import { ApolloClient, NormalizedCacheObject } from "@apollo/client";
import { CREATE_USER } from "@utils/mutations";
import { User } from "@prisma/client";

interface CreateUserInput {
  email: string;
  name: string;
  role: string;
  auth0Id: string;
}

export const createUserInDb = async ({
  input,
  apolloClient,
}: {
  input: CreateUserInput;
  apolloClient: ApolloClient<NormalizedCacheObject>;
}) => {
  try {
    const result = await apolloClient.mutate({
      mutation: CREATE_USER,
      variables: { input },
    });
    return { userFromDB: result.data.createUser as User };
  } catch (error) {
    console.error("Error creating user in DB:", error);
    throw error;
  }
};
