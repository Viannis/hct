import axios from "axios";

type UserRole = {
  id: string;
  name: string;
  description?: string;
};

export async function getAuthRoles(
  accessToken: string
): Promise<{ authRoles?: UserRole[]; error?: string }> {
  const domain = process.env.AUTH0_DOMAIN;

  if (!domain) {
    console.error("Missing Auth0 environment variables");
    return { error: "Missing Auth0 environment variables" };
  }

  try {
    const config = {
      method: "get",
      maxBodyLength: Infinity,
      url: `https://${domain}/api/v2/roles`,
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
    };

    const rolesResponse = await axios.request(config);

    if (!rolesResponse.data || !Array.isArray(rolesResponse.data)) {
      throw new Error(
        "Invalid response from Auth0: roles data is missing or not an array"
      );
    }

    return { authRoles: rolesResponse.data };
  } catch (error) {
    console.error("Error fetching roles:", error);
    return { error: "Error fetching roles" };
  }
}
