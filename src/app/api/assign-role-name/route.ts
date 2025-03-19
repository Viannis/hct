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

    if (!roleName || !name) { // Check if the role name and name are provided
      return new Response(
        JSON.stringify({ message: "Missing required fields" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    console.log("Role & name:", roleName, name);

    if (roleName !== "MANAGER" && roleName !== "CARETAKER") { // Check if the role name is valid
      console.log("Role mismatch");
      return NextResponse.json(
        { error: "Role name must be either 'MANAGER' or 'CARETAKER'" },
        { status: 400 }
      );
    }

    const session = await getSession(req, res); // Get the session

    if (!session?.user) { // Check if the session is found and the user is authenticated
      console.log("Session not found or User not authenticated");
      return NextResponse.json(
        { error: "User not authenticated" },
        { status: 401 }
      );
    }

    console.log("Session found:", session.user);

    const idToken = session.idToken; // Get the id token of the user from app session (Auth0)
    if (!idToken) { // Check if the id token is found
      console.error("Error fetching access token");
      return NextResponse.json(
        { error: "Error fetching access token" },
        { status: 500 }
      );
    }
    console.log("Id token found:", idToken);

    console.log("Initializing Apollo client");

    const apolloClient = initializeApolloClient(idToken); // Initialize the Apollo client

    const accessToken = await getManagementAPIAccessToken(); // Get the management API access token from Auth0

    if (!accessToken) { // Check if the access token is found
      console.error("Error fetching management API access token");
      return NextResponse.json(
        { error: "Error fetching management API access token" },
        { status: 500 }
      );
    }

    console.log("Management access token found", accessToken);

    console.log("Assigning role to user:", session.user.sub);

    const { userFromDB } = await createUserInDb({ // Create the user in the database
      input: {
        email: session.user.email,
        name: name,
        role: roleName,
        auth0Id: session.user.sub,
      },
      apolloClient: apolloClient,
    });

    if (!userFromDB) { // Check if the user is created in the database
      console.error("Error creating user in DB:");
      return NextResponse.json(
        { error: "Error creating user in DB" },
        { status: 500 }
      );
    }

    const domain = process.env.AUTH0_DOMAIN; // Get the Auth0 domain from the environment variables

    if (!domain) { // Check if the domain is found
      console.error("Missing Auth0 environment variables");
      return NextResponse.json(
        { error: "Missing Auth0 environment variables" },
        { status: 500 }
      );
    }

    const config = { 
      method: "get", // Get the roles from Auth0
      maxBodyLength: Infinity,
      url: `https://${domain}/api/v2/roles`,
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
    };

    const rolesResponse = await axios.request(config);

    if (!rolesResponse.data || !Array.isArray(rolesResponse.data)) { // Check if the roles are found and are an array
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

    const role = rolesResponse.data.find( // get the role id by comparing the current user's role name with that of all the roles fetched from Auth0
      (role) => role.name.toUpperCase() === userFromDB.role.toUpperCase()
    );

    if (!role) {
      console.error("Role not found in Auth0");
      return NextResponse.json(
        { error: "Role not found in Auth0" },
        { status: 404 }
      );
    }

    const hasUpdatedRoleInAuth0 = await updateUserRoleInAuth0({ // Update the user's role in Auth0
      role: role,
      accessToken: accessToken,
      userId: session.user.sub,
    });

    if (!hasUpdatedRoleInAuth0) { // Check if the user's role is updated in Auth0
      console.error("Error updating user role in Auth0");
      return NextResponse.json(
        { error: "Error updating user role in Auth0" },
        { status: 500 }
      );
    }

    await updateSession(req, res, { // Update the session
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
