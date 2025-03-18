import { NextResponse } from "next/server";

export async function GET() {
  const domain = process.env.AUTH0_DOMAIN;
  const clientId = process.env.AUTH0_CLIENT_ID;
  const baseUrl = process.env.AUTH0_BASE_URL;

  if (!domain || !clientId || !baseUrl) {
    console.error("Missing Auth0 environment variables");
    return NextResponse.json(
      { error: "Error fetching Aut0 Env Variables" },
      { status: 500 }
    );
  }

  const logoutUrl = `https://${domain}/v2/logout?client_id=${clientId}&returnTo=${encodeURIComponent(
    baseUrl
  )}`;

  return NextResponse.redirect(logoutUrl);
}
