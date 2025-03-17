import axios from "axios";

export const getManagementApiToken = async (): Promise<string> => {
  const domain = process.env.AUTH0_DOMAIN;
  const clientId = process.env.AUTH0_CLIENT_ID;
  const clientSecret = process.env.AUTH0_CLIENT_SECRET;

  console.log("Domain:", domain);
  console.log("Client ID:", clientId);
  console.log("Client Secret:", clientSecret);

  if (!domain || !clientId || !clientSecret) {
    throw new Error("Missing Auth0 environment variables");
  }

  const response = await axios.post(`https://${domain}/oauth/token`, {
    client_id: clientId,
    client_secret: clientSecret,
    audience: `https://${domain}/api/v2/`,
    grant_type: "client_credentials",
  });

  return response.data.access_token;
};
