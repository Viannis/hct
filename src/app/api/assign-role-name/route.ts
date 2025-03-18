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

export async function POST(req: NextRequest) {
  console.log("Assigning role to user");

  try {
    console.log("Request body:", req.body);
    // Parse JSON request body
    const body = await req.json();
    const res = NextResponse.next();

    const { roleName, name } = body; // Extract data

    if (!roleName || !name) {
      return new Response(
        JSON.stringify({ message: "Missing required fields" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    console.log("Role & name:", roleName, name);

    if (roleName !== "MANAGER" && roleName !== "CARETAKER") {
      console.log("Role mismatch");
      return NextResponse.json(
        { error: "Role name must be either 'MANAGER' or 'CARETAKER'" },
        { status: 400 }
      );
    }

    const session = await getSession(req, res);

    if (!session?.user) {
      console.log("Session not found or User not authenticated");
      return NextResponse.json(
        { error: "User not authenticated" },
        { status: 401 }
      );
    }

    console.log("Session found:", session.user);

    const idToken = session.idToken;
    if (!idToken) {
      console.error("Error fetching access token");
      return NextResponse.json(
        { error: "Error fetching access token" },
        { status: 500 }
      );
    }
    console.log("Id token found:", idToken);

    console.log("Initializing Apollo client");

    const apolloClient = initializeApolloClient(idToken);

    const accessToken = await getManagementAPIAccessToken();

    if (!accessToken) {
      console.error("Error fetching management API access token");
      return NextResponse.json(
        { error: "Error fetching management API access token" },
        { status: 500 }
      );
    }

    console.log("Management access token found", accessToken);

    console.log("Assigning role to user:", session.user.sub);

    const { userFromDB } = await createUserInDb({
      input: {
        email: session.user.email,
        name: name,
        role: roleName,
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
  } catch (error) {
    console.log("Error assigning role to user:", error);
    return new Response(JSON.stringify({ message: "Internal Server Error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
