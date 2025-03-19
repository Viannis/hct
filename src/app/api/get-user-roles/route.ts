import { NextResponse } from "next/server";
import axios from "axios";

export async function GET() {
  const domain = process.env.AUTH0_DOMAIN;
  const clientId = process.env.AUTH0_CLIENT_ID;
  const clientSecret = process.env.AUTH0_CLIENT_SECRET;

  console.log("Fetching roles from api");

  if (!domain || !clientId || !clientSecret) { // Check if the domain, client ID, and client secret are found
    console.error("Missing Auth0 environment variables"); // Log the error from the database
    return NextResponse.json(
      { error: "Error fetching Aut0 Env Variables" },
      { status: 500 }
    );
  }

  try { // Try to fetch the roles from Auth0
    const tokenResponse = await axios.post(`https://${domain}/oauth/token`, { // Fetch the token from Auth0
      client_id: clientId, // Client ID
      client_secret: clientSecret, // Client secret
      audience: `https://${domain}/api/v2/`, // Audience
      grant_type: "client_credentials", // Grant type
    });

    const config = { // Fetch the roles from Auth0
      method: "get", // Method
      maxBodyLength: Infinity, // Max body length
      url: `https://${domain}/api/v2/roles`, // URL
      headers: {
        Accept: "application/json", // Accept
        Authorization: `Bearer ${tokenResponse.data.access_token}`, // Authorization
      },
    };

    const rolesResponse = await axios.request(config); // Fetch the roles from Auth0
    return NextResponse.json({ roles: rolesResponse.data }, { status: 200 }); // Return the roles from Auth0
  } catch (error) {
    console.error("Error fetching roles:", error); // Log the error from the database
    return NextResponse.json(
      { error: "Internal Server Error" }, // Return the error from the database
      { status: 500 }
    );
  }
}
