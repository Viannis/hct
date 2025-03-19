// src/app/api/get-token/route.ts
import { getAccessToken } from "@auth0/nextjs-auth0";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  // Get the access token from Auth0 for Apollo Client Provider. Uses POST request to avoid exposing the access token in the URL
  try {
    const tokenResponse = await getAccessToken(req, NextResponse.next());
    return NextResponse.json({ accessToken: tokenResponse.accessToken });
  } catch (error) {
    console.error("Error retrieving access token:", error);
    return NextResponse.json(
      { error: "Failed to retrieve access token" },
      { status: 500 }
    );
  }
}
