// src/app/api/assign-role/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getSession, updateSession } from "@auth0/nextjs-auth0";
import axios from "axios";

export async function POST(req: NextRequest) {
  console.log("Assigning role to user");
  const res = NextResponse.next();
  const { roleName, name } = await req.json();
  console.log("Role & name:", roleName, name);
  const session = await getSession(req, res);

  if (!session?.user) {
    console.log("Session not found or User not authenticated");
    return NextResponse.json(
      { error: "User not authenticated" },
      { status: 401 }
    );
  }

  console.log("Assigning role to user:", session.user.sub);

  const userId = session.user.sub;
  const domain = process.env.AUTH0_DOMAIN;
  const clientId = process.env.AUTH0_CLIENT_ID;
  const clientSecret = process.env.AUTH0_CLIENT_SECRET;

  if (!domain || !clientId || !clientSecret) {
    console.error("Missing Auth0 environment variables");
    return NextResponse.json(
      { error: "Missing Auth0 environment variables" },
      { status: 500 }
    );
  }

  try {
    const tokenResponse = await axios.post(`https://${domain}/oauth/token`, {
      client_id: clientId,
      client_secret: clientSecret,
      audience: `https://${domain}/api/v2/`,
      grant_type: "client_credentials",
    });

    const accessToken = tokenResponse.data.access_token;

    const rolesResponse = await axios.get(`https://${domain}/api/v2/roles`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    const role = rolesResponse.data.find(
      (r: { name: string }) => r.name === roleName
    );
    if (!role) {
      return NextResponse.json(
        {
          error: "Role from the client didn't match the roles from Auth0",
        },
        { status: 500 }
      );
    }

    try {
      console.log("Checking existing roles for user");
      // Check if roles already exist for the user in Auth0
      const existingRolesResponse = await axios.get(
        `https://${domain}/api/v2/users/${userId}/roles`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      const existingRole = existingRolesResponse.data[0]?.name;
      console.log("Existing roles for user:", existingRole);
      if (existingRole) {
        console.log("Role already exists for user:", existingRole);
        return NextResponse.json({ role: existingRole }, { status: 202 });
      }
    } catch (error) {
      console.error("Error checking existing roles:", error);
      return NextResponse.json(
        { error: "Error checking existing roles" },
        { status: 500 }
      );
    }

    const assignRoleResponse = await axios.post(
      `https://${domain}/api/v2/users/${userId}/roles`,
      { roles: [role.id] },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    console.log("Role assigned successfully", assignRoleResponse.status);

    // const data = JSON.stringify({
    //   name: name,
    // });

    // const config = {
    //   method: "patch",
    //   maxBodyLength: Infinity,
    //   url: `https://${domain}/api/v2/users/${userId}`,
    //   headers: {
    //     Authorization: `Bearer ${accessToken}`,
    //     "Content-Type": "application/json",
    //     Accept: "application/json",
    //   },
    //   data: data,
    // };

    // console.log("Updating user name:", data);

    // const updateUserNameResponse = await axios(config);

    // console.log("Update user name response:", updateUserNameResponse.status);

    // if (updateUserNameResponse.status !== 200) {
    //   console.error("Error updating user name:", updateUserNameResponse);
    //   return NextResponse.json(
    //     { error: "Error updating user name" },
    //     { status: 500 }
    //   );
    // }

    await updateSession(req, res, {
      ...session,
      user: {
        ...session.user,
        "https://localhost-murphy.com/roles": [roleName],
      },
    });

    console.log("Role & name assigned successfully");

    return NextResponse.json(
      { message: "Role & name assigned successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error in role assignment process:", error);
    return NextResponse.json(
      { error: "Error in role assignment process" },
      { status: 500 }
    );
  }
}
