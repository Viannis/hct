import { NextRequest, NextResponse } from "next/server";
import { getSession, getAccessToken } from "@auth0/nextjs-auth0";
import { initializeApolloClient } from "@utils/apolloClient";
import { GET_LOCATION } from "@utils/queries";

export async function GET(req: NextRequest) {
  const res = NextResponse.next();
  const session = await getSession(req, res);
  const accessToken = getAccessToken(req, res);

  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const idToken = session.idToken;
  if (!idToken) {
    return NextResponse.json(
      { message: "Error fetching access token" },
      { status: 500 }
    );
  }

  console.log("Refresh token", session.refreshToken);

  const apolloClient = initializeApolloClient(idToken);

  const { data: locationData, error: locationDataError } =
    await apolloClient.query({
      query: GET_LOCATION,
    });

  if (locationDataError) {
    return NextResponse.json(
      { message: "Error fetching location data" },
      { status: 500 }
    );
  }

  if (!locationData) {
    return NextResponse.json(
      { message: "Location has not been set", hasLocationSet: false },
      { status: 200 }
    );
  }

  return NextResponse.json(
    { message: "Location has been set", hasLocationSet: true },
    { status: 200 }
  );
}
