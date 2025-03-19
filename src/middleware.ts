import { NextRequest, NextResponse } from "next/server";
import { getSession, updateSession } from "@auth0/nextjs-auth0/edge";
import { Session } from "@auth0/nextjs-auth0";
import axios from "axios";

export async function middleware(req: NextRequest) { // Middleware function to check if the user is authenticated and has the correct role
  const res = NextResponse.next(); // Next response
  console.log("Middleware called"); // Log the middleware called
  console.log("Request URL", req.nextUrl.pathname); // Log the request URL

  if ( // If the route is an auth route, onboarding route, home page route, or error pages route
    isAuthRoute(req) ||
    isOnboardingRoute(req) ||
    isHomePageRoute(req) ||
    isErrorPagesRoute(req)
  ) {
    console.log("Skipping middleware for route", req.nextUrl.pathname);
    return res;
  }

  if ( // If the route is a manager dashboard route or a caretaker dashboard route
    isManagerDashboardRoute(req) ||
    isCaretakerDashboardRoute(req)
  ) {
    console.log("A dashboard route"); // Log the dashboard route
    const session = await getSession(req, res); // Get the session

    if (!session?.user) {
      return redirectToLogin(req); // Redirect to login if the user is not authenticated
    }

    console.log("Session found in middleware", session.user); // Log the session

    const roles = await getUserRoles(session); // Get the roles

    if (!roles.length) {
      console.log("No roles found in middleware"); // Log the no roles found in middleware
      return await handleNoRoles(req, res, session); // Handle the no roles found in middleware
    }

    console.log("Roles found in middleware from session", roles); // Log the roles found in middleware from session

    if (roles[0] === "MANAGER" && isManagerDashboardRoute(req)) {
      console.log("Returning response for manager dashboard"); // Log the returning response for manager dashboard
      return res;
    } else if (roles[0] === "CARETAKER" && isCaretakerDashboardRoute(req)) {
      console.log("Returning response for caretaker dashboard"); // Log the returning response for caretaker dashboard
      return res;
    } else {
      console.log("Unauthorized roles found in middleware"); // Log the unauthorized roles found in middleware
      return NextResponse.redirect(new URL("/", req.nextUrl.origin)); // Redirect to the home page if the user has unauthorized roles
    }
  } else {
    console.log("Unauthorized route found in middleware"); // Log the unauthorized route found in middleware
    return NextResponse.redirect(new URL("/error/404", req.nextUrl.origin)); // Redirect to the error page if the route is unauthorized
  }
}

function isHomePageRoute(req: NextRequest): boolean {
  console.log("Checking if home page route"); // Log the checking if home page route
  return req.nextUrl.pathname === "/"; // Return true if the route is the home page
}

function isAuthRoute(req: NextRequest): boolean {
  console.log("Checking if auth route"); // Log the checking if auth route
  return req.nextUrl.pathname.startsWith("/api/auth"); // Return true if the route starts with /api/auth
}

function isOnboardingRoute(req: NextRequest): boolean {
  console.log("Checking if onboarding route"); // Log the checking if onboarding route
  return req.nextUrl.pathname.startsWith("/onboarding"); // Return true if the route starts with /onboarding
}

function isManagerDashboardRoute(req: NextRequest): boolean {
  console.log("Checking if manager dashboard route"); // Log the checking if manager dashboard route
  return req.nextUrl.pathname.startsWith("/dashboard/manager"); // Return true if the route starts with /dashboard/manager
}

function isCaretakerDashboardRoute(req: NextRequest): boolean {
  console.log("Checking if caretaker dashboard route"); // Log the checking if caretaker dashboard route
  return req.nextUrl.pathname.startsWith("/dashboard/caretaker"); // Return true if the route starts with /dashboard/caretaker
}

function isErrorPagesRoute(req: NextRequest): boolean {
  console.log("Checking if error pages route"); // Log the checking if error pages route
  return req.nextUrl.pathname.startsWith("/error"); // Return true if the route starts with /error
}

function redirectToLogin(req: NextRequest): NextResponse {
  console.log("No session found in middleware, redirecting to login"); // Log the no session found in middleware, redirecting to login
  const loginUrl = new URL("/api/auth/login/", req.nextUrl.origin); // Create the login URL
  return NextResponse.redirect(loginUrl); // Redirect to the login URL
}

async function getUserRoles(session: Session): Promise<string[]> {
  console.log("Getting roles from session"); // Log the getting roles from session
  return (await session.user["https://localhost-murphy.com/roles"]) || []; // Return the roles from the session
}

async function handleNoRoles(
  req: NextRequest,
  res: NextResponse,
  session: Session
): Promise<NextResponse> {
  console.log("No roles found in middleware"); // Log the no roles found in middleware
  const domain = process.env.AUTH0_DOMAIN; // Get the domain
  const clientId = process.env.AUTH0_CLIENT_ID; // Get the client ID
  const clientSecret = process.env.AUTH0_CLIENT_SECRET; // Get the client secret

  if (!domain || !clientId || !clientSecret) { // If the domain, client ID, or client secret is not found
     console.log(
      "Missing Auth0 environment variables, redirecting to onboarding",
      domain,
      clientId,
      clientSecret
    );
    const onboardingUrl = new URL("/error/500", req.nextUrl.origin); // Create the onboarding URL
    return NextResponse.redirect(onboardingUrl); // Redirect to the onboarding URL
  }

  console.log("Getting management API token"); // Log the getting management API token
  try {
    const tokenResponse = await axios.post(`https://${domain}/oauth/token`, { // Post request to get the management API token
      client_id: clientId, // Client ID
      client_secret: clientSecret, // Client secret
      audience: `https://${domain}/api/v2/`, // Audience
      grant_type: "client_credentials", // Grant type
    });

    const accessToken = tokenResponse.data.access_token; // Get the access token

    const rolesResponse = await axios.get( // Get the roles from the management API
      `https://${domain}/api/v2/users/${session.user.sub}/roles`, // URL
      {
        headers: {
          Authorization: `Bearer ${accessToken}`, // Authorization
        },
      }
    );

    const firstRole = rolesResponse.data[0]?.name; // Get the first role
    if (firstRole) {
      console.log("Role found:", firstRole); // Log the role found
      if (firstRole !== "MANAGER" && firstRole !== "CARETAKER") { // If the role is not a manager or a caretaker
        console.log("Unauthorized roles found for user in Auth0"); // Log the unauthorized roles found for user in Auth0
        return NextResponse.redirect(new URL("/error/401", req.nextUrl.origin)); // Redirect to the error page if the role is unauthorized
      }

      // Update session with roles
      await updateSession(req, res, {
        ...session,
        user: {
          ...session.user,
          "https://localhost-murphy.com/roles": [firstRole], // Update the session with the roles
        },
      });

      // Redirect based on role
      if (firstRole === "MANAGER" && isManagerDashboardRoute(req)) { // If the role is a manager and the route is a manager dashboard route
        return res; // Return the response
      }
      if (firstRole === "CARETAKER" && isCaretakerDashboardRoute(req)) { // If the role is a caretaker and the route is a caretaker dashboard route
        return res; // Return the response
      }
    } else {
      // Redirect to onboarding if no roles are found
      console.log(
        "No roles found for user in Auth0, redirecting to onboarding"
      ); // Log the no roles found for user in Auth0, redirecting to onboarding
      return NextResponse.redirect(new URL("/onboarding", req.nextUrl.origin)); // Redirect to the onboarding page
    }
  } catch (error) {
    console.error("Error fetching roles from Auth0:", error); // Log the error fetching roles from Auth0
    return NextResponse.redirect(new URL("/error/500", req.nextUrl.origin)); // Redirect to the error page if there is an error
  }

  return res;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|api/.*).*)",
  ], // Apply middleware to the root path
};
