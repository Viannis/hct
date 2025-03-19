import axios from "axios";

const AUTH0_DOMAIN = process.env.AUTH0_DOMAIN!;
const AUTH0_CLIENT_ID = process.env.AUTH0_CLIENT_ID!;
const AUTH0_CLIENT_SECRET = process.env.AUTH0_CLIENT_SECRET!;

export async function getManagementAPIAccessToken(): Promise<string> { // Service function to get the management API access token for Machine to Machine Auth0 Communication
  try {
    const response = await axios.post(`https://${AUTH0_DOMAIN}/oauth/token`, {
      client_id: AUTH0_CLIENT_ID,
      client_secret: AUTH0_CLIENT_SECRET,
      audience: `https://${AUTH0_DOMAIN}/api/v2/`,
      grant_type: "client_credentials",
    });

    return response.data.access_token; // Return the access token
  } catch (error) {
    throw error; // Throw the error
  }
}
