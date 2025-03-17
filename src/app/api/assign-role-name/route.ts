// src/app/api/assign-role/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getSession, updateSession } from "@auth0/nextjs-auth0";
import {
  getManagementAPIAccessToken,
  createUserInDb,
  updateUserRoleInAuth0,
} from "@api/services";
import { initializeApolloClient } from "@utils/apolloClient";
import axios from "axios";

type ReqBody = {
  roleName: string;
  name: string;
};

export async function POST(req: NextRequest) {
  console.log("Assigning role to user");
  const res = NextResponse.next();
  const { roleName, name } = (await req.json()) as ReqBody;
  if (!roleName || !name) {
    return NextResponse.json(
      { error: "Role name and name are required" },
      { status: 400 }
    );
  }

  if (roleName.toLowerCase() !== "manager" || "caretaker") {
    return NextResponse.json(
      { error: "Role name must be either 'manager' or 'caretaker'" },
      { status: 400 }
    );
  }
  console.log("Role & name:", roleName, name);
  const session = await getSession(req, res);
  const accessToken = await getManagementAPIAccessToken();

  if (!session?.user) {
    console.log("Session not found or User not authenticated");
    return NextResponse.json(
      { error: "User not authenticated" },
      { status: 401 }
    );
  }

  const idToken = session.idToken;
  if (!idToken) {
    console.error("Error fetching access token");
    return NextResponse.json(
      { error: "Error fetching access token" },
      { status: 500 }
    );
  }

  const apolloClient = initializeApolloClient(idToken);

  if (!accessToken) {
    console.error("Error fetching management API access token");
    return NextResponse.json(
      { error: "Error fetching management API access token" },
      { status: 500 }
    );
  }

  console.log("Assigning role to user:", session.user.sub);

  const { userFromDB } = await createUserInDb({
    input: {
      email: session.user.email,
      name: name,
      role: roleName.toUpperCase(),
      auth0Id: session.user.sub,
    },
    apolloClient: apolloClient,
  });

  if (!userFromDB) {
    console.error("Error creating user in DB:");
    return NextResponse.json(
      { error: "Error creating user in DB" },
      { status: 500 }
    );
  }

  const domain = process.env.AUTH0_DOMAIN;

  if (!domain) {
    console.error("Missing Auth0 environment variables");
    return NextResponse.json(
      { error: "Missing Auth0 environment variables" },
      { status: 500 }
    );
  }

  const config = {
    method: "get",
    maxBodyLength: Infinity,
    url: `https://${domain}/api/v2/roles`,
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
  };

  const rolesResponse = await axios.request(config);

  if (!rolesResponse.data || !Array.isArray(rolesResponse.data)) {
    console.error(
      "Invalid response from Auth0: roles data is missing or not an array"
    );
    return NextResponse.json(
      {
        error:
          "Invalid response from Auth0: roles data is missing or not an array",
      },
      { status: 500 }
    );
  }

  const role = rolesResponse.data.find(
    (role) => role.name.toUpperCase() === userFromDB.role.toUpperCase()
  );

  if (!role) {
    console.error("Role not found in Auth0");
    return NextResponse.json(
      { error: "Role not found in Auth0" },
      { status: 404 }
    );
  }

  const hasUpdatedRoleInAuth0 = await updateUserRoleInAuth0({
    role: role,
    accessToken: accessToken,
    userId: session.user.sub,
  });

  if (!hasUpdatedRoleInAuth0) {
    console.error("Error updating user role in Auth0");
    return NextResponse.json(
      { error: "Error updating user role in Auth0" },
      { status: 500 }
    );
  }

  await updateSession(req, res, {
    ...session,
    user: {
      ...session.user,
      "https://localhost-murphy.com/roles": [userFromDB.role],
    },
  });

  return NextResponse.json(
    { message: "Role & name assigned successfully", role: userFromDB.role },
    { status: 200 }
  );
}
