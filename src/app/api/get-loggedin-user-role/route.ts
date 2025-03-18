import { NextRequest, NextResponse } from "next/server";
import { getSession, Session, updateSession } from "@auth0/nextjs-auth0";
import {
  getManagementAPIAccessToken,
  getUserRolesFromAuth0,
  getUserFromDb,
  updateUserRoleInAuth0,
  getAuthRoles,
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
      return null;
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

async function handleUserRoleUpdate({
  req,
  res,
  session,
  userData,
  userRoles,
  managementAPIAccessToken,
}: {
  req: NextRequest;
  res: NextResponse;
  session: Session;
  userData: User;
  userRoles: UserRole[];
  managementAPIAccessToken: string;
}) {
  try {
    const roleToUpdate = userRoles.find(
      (role: UserRole) =>
        role.name.toLowerCase() === userData.role.toLowerCase()
    );
    if (roleToUpdate) {
      await updateUserRoleInAuth0({
        role: roleToUpdate,
        accessToken: managementAPIAccessToken,
        userId: session.user.sub,
      });
      await updateSessionWithRole(req, res, session, userData.role);
      return { role: userData.role, status: 200 };
    } else {
      console.error("Role to update not found");
      return {
        message: "Role to update not found",
        status: 500,
      };
    }
  } catch (error) {
    console.error("Error updating user role in auth0:", error);
    return { message: "Error updating user role in Auth0", status: 500 };
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
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const apolloClient = initializeApolloClient(idToken);

  const managementAPIAccessToken = await fetchManagementAPIAccessToken();
  if (!managementAPIAccessToken) {
    return NextResponse.json(
      { message: "Error fetching management API access token" },
      { status: 500 }
    );
  }

  const { userFromDB: userData, error } = await getUserFromDb({
    apolloClient: apolloClient,
    userAuth0Id: session.user.sub,
  });

  console.log("User data from DB: in loggedin route", userData);
  console.log("Error from DB: in loggedin route", error);

  if (error) {
    console.error("Error fetching user from DB:", error);
    return NextResponse.json({ role: null }, { status: 200 });
  }

  if (!userData) {
    console.error("User not found in DB");
    return NextResponse.json({ role: null }, { status: 200 });
  }

  console.log("User data from DB: in loggedin route", userData);
  const { authRoles, error: authRoleError } = await getAuthRoles(
    managementAPIAccessToken
  );

  if (!authRoles || authRoleError) {
    console.error("Error fetching auth roles from Auth0:", error);
    return NextResponse.json(
      { message: "Error fetching auth roles" },
      { status: 500 }
    );
  }

  const userRoles = await fetchUserRoles(
    session.user.sub,
    managementAPIAccessToken
  );

  if (!userRoles) {
    const roleUpdateResponse = await handleUserRoleUpdate({
      req,
      res,
      session,
      userData,
      userRoles: authRoles,
      managementAPIAccessToken,
    });

    if (roleUpdateResponse.status === 200) {
      return NextResponse.json({ role: userData.role }, { status: 200 });
    }

    return NextResponse.json(
      { message: "Error updating user role" },
      { status: 500 }
    );
  }

  if (userRoles.length == 0) {
    const roleUpdateResponse = await handleUserRoleUpdate({
      req,
      res,
      session,
      userData,
      userRoles: authRoles,
      managementAPIAccessToken,
    });

    if (roleUpdateResponse.status === 200) {
      return NextResponse.json({ role: userData.role }, { status: 200 });
    }

    return NextResponse.json(
      { message: "Error updating user role" },
      { status: 500 }
    );
  }

  if (userData.role === userRoles[0].name) {
    await updateSessionWithRole(req, res, session, userData.role);
    return NextResponse.json({ role: userData.role }, { status: 200 });
  } else {
    const roleUpdateResponse = await handleUserRoleUpdate({
      req,
      res,
      session,
      userData,
      userRoles: authRoles,
      managementAPIAccessToken,
    });

    if (roleUpdateResponse.status === 200) {
      return NextResponse.json({ role: userData.role }, { status: 200 });
    }

    return NextResponse.json(
      { message: "Error updating user role" },
      { status: 500 }
    );
  }
}
