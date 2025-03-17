import { NextRequest, NextResponse } from "next/server";
import { getSession, Session, updateSession } from "@auth0/nextjs-auth0";
import {
  getManagementAPIAccessToken,
  getUserRolesFromAuth0,
  getUserFromDb,
  updateUserRoleInAuth0,
} from "@api/services";
import { User } from "@prisma/client";
import { initializeApolloClient } from "@utils/apolloClient";

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

  const managementAPIAccessToken = await fetchManagementAPIAccessToken();
  if (!managementAPIAccessToken) {
    return NextResponse.json(
      { message: "Error fetching management API access token" },
      { status: 500 }
    );
  }

  const userRoles = await fetchUserRoles(
    session.user.sub,
    managementAPIAccessToken
  );
  if (!userRoles) {
    return NextResponse.json(
      { message: "Error fetching user roles" },
      { status: 500 }
    );
  }

  console.log("User roles from Auth0:", userRoles);

  const { userFromDB: userData, error } = await getUserFromDb({
    apolloClient: apolloClient,
    userAuth0Id: session.user.sub,
  });

  if (error) {
    console.error("Error fetching user from DB:", error);
    return NextResponse.json(
      { message: "Error fetching user data" },
      { status: 500 }
    );
  }

  if (!userData) {
    console.error("User not found in DB");
    return NextResponse.json({ message: "User not found" }, { status: 404 });
  }

  if (userData) {
    console.log("User data from DB: in loggedin route", userData);
    if (userData.role.toLowerCase() === userRoles[0].name.toLowerCase()) {
      await updateSessionWithRole(req, res, session, userData.role);
      return NextResponse.json({ role: userData.role }, { status: 200 });
    } else {
      return await handleUserRoleUpdate(
        req,
        res,
        session,
        userData,
        userRoles,
        managementAPIAccessToken
      );
    }
  }
}
