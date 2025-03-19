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
  // Fetch the management API access token from Auth0
  try {
    return await getManagementAPIAccessToken(); // Get the management API access token from Auth0
  } catch (error) {
    console.error("Error fetching management API access token:", error);
    return null;
  }
}

async function fetchUserRoles(
  userId: string,
  accessToken: string
): Promise<UserRole[] | null> {
  // Fetch the user roles from Auth0
  try {
    const { userRoles } = await getUserRolesFromAuth0({ userId, accessToken }); // Get the user roles from Auth0
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
      // Update the session with the role
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
      // Check if the role to update is found
      await updateUserRoleInAuth0({
        // Update the user's role in Auth0
        role: roleToUpdate,
        accessToken: managementAPIAccessToken,
        userId: session.user.sub,
      });
      await updateSessionWithRole(req, res, session, userData.role); // Update the session with the role
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
  const session = await getSession(req, res); // Get the session

  if (!session) {
    // Check if the session is found
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 }); // Return unauthorized if the session is not found
  }

  const idToken = session.idToken; // Get the id token of the user from app session (Auth0)
  if (!idToken) {
    // Check if the id token is found
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 }); // Return unauthorized if the id token is not found
  }

  const apolloClient = initializeApolloClient(idToken); // Initialize the Apollo client

  const managementAPIAccessToken = await fetchManagementAPIAccessToken(); // Fetch the management API access token from Auth0
  if (!managementAPIAccessToken) {
    // Check if the management API access token is found
    return NextResponse.json(
      { message: "Error fetching management API access token" },
      { status: 500 }
    );
  }

  const { userFromDB: userData, error } = await getUserFromDb({
    // Get the user from the database
    apolloClient: apolloClient, // Apollo client
    userAuth0Id: session.user.sub, // User's Auth0 ID
  });

  console.log("User data from DB: in loggedin route", userData); // Log the user data from the database
  console.log("Error from DB: in loggedin route", error); // Log the error from the database

  if (error) {
    // Check if the error is found
    console.error("Error fetching user from DB:", error); // Log the error from the database
    return NextResponse.json({ role: null }, { status: 200 }); // Return the role as null
  }

  if (!userData) {
    // Check if the user is found in the database
    console.error("User not found in DB"); // Log the error from the database
    return NextResponse.json({ role: null }, { status: 200 }); // Return the role as null
  }

  console.log("User data from DB: in loggedin route", userData); // Log the user data from the database
  const { authRoles, error: authRoleError } = await getAuthRoles(
    // Get the auth roles from Auth0
    managementAPIAccessToken // Management API access token
  );

  if (!authRoles || authRoleError) {
    // Check if the auth roles are found
    console.error("Error fetching auth roles from Auth0:", error); // Log the error from the database
    return NextResponse.json(
      { message: "Error fetching auth roles" },
      { status: 500 }
    );
  }

  const userRoles = await fetchUserRoles(
    // Fetch the user roles from Auth0
    session.user.sub, // User's Auth0 ID
    managementAPIAccessToken // Management API access token
  );

  if (!userRoles) {
    // Check if the user roles are found
    const roleUpdateResponse = await handleUserRoleUpdate({
      // Update the user's role in Auth0
      req,
      res,
      session,
      userData,
      userRoles: authRoles,
      managementAPIAccessToken,
    });

    if (roleUpdateResponse.status === 200) {
      // Check if the user's role is updated
      return NextResponse.json({ role: userData.role }, { status: 200 }); // Return the role
    }

    return NextResponse.json(
      { message: "Error updating user role" },
      { status: 500 }
    );
  }

  if (userRoles.length == 0) {
    // Check if the user roles are found
    const roleUpdateResponse = await handleUserRoleUpdate({
      // Update the user's role in Auth0
      req,
      res,
      session,
      userData,
      userRoles: authRoles,
      managementAPIAccessToken,
    });

    if (roleUpdateResponse.status === 200) {
      // Check if the user's role is updated
      return NextResponse.json({ role: userData.role }, { status: 200 }); // Return the role
    }

    return NextResponse.json(
      { message: "Error updating user role" },
      { status: 500 }
    );
  }

  if (userData.role === userRoles[0].name) {
    // Check if the user's role is the same as the role in the database
    await updateSessionWithRole(req, res, session, userData.role); // Update the session with the role
    return NextResponse.json({ role: userData.role }, { status: 200 }); // Return the role
  } else {
    const roleUpdateResponse = await handleUserRoleUpdate({
      // Update the user's role in Auth0
      req,
      res,
      session,
      userData,
      userRoles: authRoles,
      managementAPIAccessToken,
    });

    if (roleUpdateResponse.status === 200) {
      // Check if the user's role is updated
      return NextResponse.json({ role: userData.role }, { status: 200 }); // Return the role
    }

    return NextResponse.json(
      { message: "Error updating user role" },
      { status: 500 }
    );
  }
}
