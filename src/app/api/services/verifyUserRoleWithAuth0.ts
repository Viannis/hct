import fetch from "node-fetch";

const AUTH0_DOMAIN = process.env.AUTH0_DOMAIN;

interface Auth0Role {
  id: string;
  name: string;
}

export async function verifyUserRoleWithAuth0(
  role: string,
  accessToken: string
): Promise<boolean> {
  try {
    const response = await fetch(`https://${AUTH0_DOMAIN}/api/v2/roles`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`Error fetching roles: ${response.statusText}`);
    }

    const roles: Auth0Role[] = await response.json();
    if (roles.length === 0) {
      return false;
    }
    return roles.some((auth0Role) => auth0Role.name === role);
  } catch (error) {
    console.error("Error verifying user roles:", error);
    return false;
  }
}
