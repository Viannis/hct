import { NextRequest, NextResponse } from "next/server";
import { getSession, updateSession, Session } from "@auth0/nextjs-auth0";
import {
  getUserRolesFromAuth0,
  getUserFromDb,
  updateUserRoleInAuth0,
  getManagementAPIAccessToken,
} from "@api/services";
import { initializeApolloClient } from "@utils/apolloClient";
import { User } from "@prisma/client";

type UserRole = {
  id: string;
  name: string;
  description?: string;
};

async function fetchManagementAPIAccessToken(): Promise<string | null> {
  try {
    return await getManagementAPIAccessToken();
  } catch (error) {
    console.error("Error fetching management API access token:", error);
    return null;
  }
}

async function fetchUserRoles(
  userId: string,
  accessToken: string
): Promise<UserRole[] | null> {
  try {
    const { userRoles } = await getUserRolesFromAuth0({ userId, accessToken });
    if (!userRoles) {
      throw new Error("User roles are undefined");
    }
    return userRoles;
  } catch (error) {
    console.error("Error fetching user roles from Auth0:", error);
    return null;
  }
}

async function updateSessionWithRole(
  req: NextRequest,
  res: NextResponse,
  session: Session,
  role: string
) {
  try {
    await updateSession(req, res, {
      ...session,
      user: { ...session.user, role },
    });
  } catch (error) {
    console.error("Error updating session with role:", error);
  }
}

async function handleUserRoleUpdate(
  req: NextRequest,
  res: NextResponse,
  session: Session,
  userData: User,
  userRoles: UserRole[],
  managementAPIAccessToken: string
) {
  try {
    const roleToUpdate = userRoles.find(
      (role) => role.name.toLowerCase() === userData.role.toLowerCase()
    );
    if (roleToUpdate) {
      await updateUserRoleInAuth0({
        role: roleToUpdate,
        accessToken: managementAPIAccessToken,
        userId: session.user.sub,
      });
      await updateSessionWithRole(req, res, session, userData.role);
      return NextResponse.json({ role: userData.role }, { status: 200 });
    } else {
      console.error("Role to update not found");
      return NextResponse.json(
        { message: "Role to update not found" },
        { status: 404 }
      );
    }
  } catch (error) {
    console.error("Error updating user role in auth0:", error);
    return NextResponse.json({ role: userData.role }, { status: 200 });
  }
}

export async function GET(req: NextRequest) {
  const res = NextResponse.next();
  const session = await getSession(req, res);

  if (!session?.user) {
    return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
  }

  const idToken = session.idToken;

  if (!idToken) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const apolloClient = initializeApolloClient(idToken);

  const access_token = await fetchManagementAPIAccessToken();

  if (!access_token) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const { userFromDB, error } = await getUserFromDb({
    apolloClient: apolloClient,
    userAuth0Id: session.user.sub,
  });

  if (error) {
    console.error("Error fetching user from DB:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }

  if (!userFromDB) {
    return NextResponse.json({ userNotFound: true }, { status: 200 });
  }

  const userRoles = await fetchUserRoles(session.user.sub, access_token);

  if (!userRoles) {
    return NextResponse.json(
      { error: "Error fetching user roles" },
      { status: 500 }
    );
  }

  if (userFromDB.role.toLowerCase() === userRoles[0].name.toLowerCase()) {
    await updateSessionWithRole(req, res, session, userFromDB.role);
    return NextResponse.json({ role: userFromDB.role }, { status: 200 });
  } else {
    return await handleUserRoleUpdate(
      req,
      res,
      session,
      userFromDB,
      userRoles,
      access_token
    );
  }
}
