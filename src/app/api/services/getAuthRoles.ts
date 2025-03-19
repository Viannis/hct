import axios from "axios";

type UserRole = {
  id: string;
  name: string;
  description?: string;
};

export async function getAuthRoles( // Service function to fetch all the roles set in Auth0
  accessToken: string
): Promise<{ authRoles?: UserRole[]; error?: string }> {
  const domain = process.env.AUTH0_DOMAIN;

  if (!domain) {
    console.error("Missing Auth0 environment variables");
    return { error: "Missing Auth0 environment variables" };
  }

  try {
    const config = { // Request config to fetch the roles from Auth0
      method: "get", // Method
      maxBodyLength: Infinity, // Max body length
      url: `https://${domain}/api/v2/roles`, // URL
      headers: {
        Accept: "application/json", // Accept
        Authorization: `Bearer ${accessToken}`, // Authorization
      },
    };

    const rolesResponse = await axios.request(config); // Fetch the roles from Auth0

    if (!rolesResponse.data || !Array.isArray(rolesResponse.data)) {
      throw new Error(
        "Invalid response from Auth0: roles data is missing or not an array"
      );
    }

    return { authRoles: rolesResponse.data }; // Return the roles from Auth0
  } catch (error) {
    console.error("Error fetching roles:", error); // Log the error
    return { error: "Error fetching roles" }; // Return the error
  }
}
