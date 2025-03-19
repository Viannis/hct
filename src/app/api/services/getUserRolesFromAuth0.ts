import axios from "axios";

const AUTH0_DOMAIN = process.env.AUTH0_DOMAIN!;

type UserRole = {
  id: string;
  name: string;
  description?: string;
};

export async function getUserRolesFromAuth0({ // Service function to fetch the role of the current user from Auth0
  userId,
  accessToken,
}: {
  userId: string;
  accessToken: string; // Access token
}): Promise<{ userRoles?: UserRole[]; error?: string }> { // Promise to fetch the role of the current user from Auth0
  try {
    const rolesResponse = await axios.get( // Fetch the role of the current user from Auth0
      `https://${AUTH0_DOMAIN}/api/v2/users/${userId}/roles`, // URL
      {
        headers: {
          Authorization: `Bearer ${accessToken}`, // Authorization
        },
      }
    );

    if (!rolesResponse.data || !Array.isArray(rolesResponse.data)) { // Check if the response is valid
      throw new Error(
        "Invalid response from Auth0: roles data is missing or not an array"
      );
    }

    return { userRoles: rolesResponse.data }; // Return the role of the current user from Auth0 
  } catch (error) {
    console.error("Error fetching user roles from Auth0:", error); // Log the error
    return { error: "Error fetching user roles from Auth0" }; // Return the error
  }
}
