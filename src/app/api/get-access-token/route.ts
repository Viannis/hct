// src/app/api/get-token/route.ts
import { getAccessToken } from "@auth0/nextjs-auth0";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
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
