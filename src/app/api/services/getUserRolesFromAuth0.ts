import axios from "axios";

const AUTH0_DOMAIN = process.env.AUTH0_DOMAIN!;

type UserRole = {
  id: string;
  name: string;
  description?: string;
};

export async function getUserRolesFromAuth0({
  userId,
  accessToken,
}: {
  userId: string;
  accessToken: string;
}): Promise<{ userRoles?: UserRole[], error?: string}> {
  try {
    const rolesResponse = await axios.get(
      `https://${AUTH0_DOMAIN}/api/v2/users/${userId}/roles`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!rolesResponse.data || !Array.isArray(rolesResponse.data)) {
      throw new Error(
        "Invalid response from Auth0: roles data is missing or not an array"
      );
    }

    return { userRoles: rolesResponse.data }
  } catch (error) {
    console.error("Error fetching user roles from Auth0:", error);
    return { error: "Error fetching user roles from Auth0" };
  }
}
