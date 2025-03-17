import type { NextApiRequest, NextApiResponse } from "next";
import { NextResponse } from "next/server";
import axios from "axios";

export async function GET(req: NextApiRequest, res: NextApiResponse) {
  const domain = process.env.AUTH0_DOMAIN;
  const clientId = process.env.AUTH0_CLIENT_ID;
  const clientSecret = process.env.AUTH0_CLIENT_SECRET;

  console.log("Fetching roles from api");

  if (!domain || !clientId || !clientSecret) {
    console.error("Missing Auth0 environment variables");
    return res
      .status(500)
      .json({ error: "Missing Auth0 environment variables" });
  }

  try {
    const tokenResponse = await axios.post(`https://${domain}/oauth/token`, {
      client_id: clientId,
      client_secret: clientSecret,
      audience: `https://${domain}/api/v2/`,
      grant_type: "client_credentials",
    });

    const config = {
      method: "get",
      maxBodyLength: Infinity,
      url: `https://${domain}/api/v2/roles`,
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${tokenResponse.data.access_token}`,
      },
    };

    const rolesResponse = await axios.request(config);
    return NextResponse.json({ roles: rolesResponse.data }, { status: 200 });
  } catch (error) {
    console.error("Error fetching roles:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
