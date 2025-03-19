import fetch from "node-fetch";

const AUTH0_DOMAIN = process.env.AUTH0_DOMAIN;

interface Auth0Role {
  id: string;
  name: string;
}

export async function verifyUserRoleWithAuth0( // Service function to verify the user role with Auth0
  role: string, // Role to verify
  accessToken: string // Access token
): Promise<boolean> {
  // Promise to verify the user role with Auth0
  try {
    const response = await fetch(`https://${AUTH0_DOMAIN}/api/v2/roles`, {
      // Fetch the roles from Auth0
      method: "GET", // Method
      headers: {
        Authorization: `Bearer ${accessToken}`, // Authorization
        "Content-Type": "application/json", // Content type
      },
    });

    if (!response.ok) {
      throw new Error(`Error fetching roles: ${response.statusText}`); // Throw the error
    }

    const roles: Auth0Role[] = await response.json(); // Parse the roles from Auth0
    if (roles.length === 0) {
      return false;
    }
    return roles.some((auth0Role) => auth0Role.name === role); // Return true if the role is found
  } catch (error) {
    console.error("Error verifying user roles:", error); // Log the error
    return false; // Return false
  }
}
