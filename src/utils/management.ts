import axios from "axios";

export const getManagementApiToken = async (): Promise<string> => { // Function to get the management API token
  const domain = process.env.AUTH0_DOMAIN; // Domain of the Auth0
  const clientId = process.env.AUTH0_CLIENT_ID; // Client ID of the Auth0
  const clientSecret = process.env.AUTH0_CLIENT_SECRET; // Client secret of the Auth0

  console.log("Domain:", domain); // Log the domain
  console.log("Client ID:", clientId); // Log the client ID
  console.log("Client Secret:", clientSecret); // Log the client secret

  if (!domain || !clientId || !clientSecret) {
    throw new Error("Missing Auth0 environment variables"); // Throw an error if the domain, client ID, or client secret is missing
  }

  const response = await axios.post(`https://${domain}/oauth/token`, { // Post request to get the management API token
    client_id: clientId, // Client ID
    client_secret: clientSecret, // Client secret
    audience: `https://${domain}/api/v2/`, // Audience
    grant_type: "client_credentials", // Grant type
  });

  return response.data.access_token; // Return the management API token
};
