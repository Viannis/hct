import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@auth0/nextjs-auth0";
import { initializeApolloClient } from "@utils/apolloClient";
import { getUserFromDb } from "@api/services";

export async function GET(req: NextRequest) {
  const res = NextResponse.next();
  const session = await getSession(req, res);

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

  const apolloClient = initializeApolloClient(idToken);

  const { userFromDB } = await getUserFromDb({
    userAuth0Id: session.user.sub,
    apolloClient: apolloClient,
  });

  if (!userFromDB) {
    return NextResponse.json(
      { message: "USER_NOT_FOUND", userInDb: userFromDB },
      { status: 200 }
    );
  }

  return NextResponse.json(
    { message: "USER_FOUND", userInDb: userFromDB },
    { status: 200 }
  );
}
