import { NextRequest, NextResponse } from "next/server";
import { getSession, updateSession } from "@auth0/nextjs-auth0/edge";
import { Session } from "@auth0/nextjs-auth0";
import axios from "axios";

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  console.log("Middleware called");
  console.log("Request URL", req.nextUrl.pathname);

  if (
    isAuthRoute(req) ||
    isOnboardingRoute(req) ||
    isHomePageRoute(req) ||
    isErrorPagesRoute(req)
  ) {
    console.log("Skipping middleware for route", req.nextUrl.pathname);
    return res;
  }

  if (isManagerDashboardRoute(req) || isCaretakerDashboardRoute(req)) {
    console.log("A dashboard route");
    const session = await getSession(req, res);

    if (!session?.user) {
      return redirectToLogin(req);
    }

    console.log("Session found in middleware", session.user);

    const roles = await getUserRoles(session);

    if (!roles.length) {
      console.log("No roles found in middleware");
      return await handleNoRoles(req, res, session);
    }

    console.log("Roles found in middleware from session", roles);

    if (roles[0] === "MANAGER" && isManagerDashboardRoute(req)) {
      console.log("Returning response for manager dashboard");
      return res;
    } else if (roles[0] === "CARETAKER" && isCaretakerDashboardRoute(req)) {
      console.log("Returning response for caretaker dashboard");
      return res;
    } else {
      console.log("Unauthorized roles found in middleware");
      return NextResponse.redirect(new URL("/", req.nextUrl.origin));
    }
  } else {
    return NextResponse.redirect(new URL("/error/404", req.nextUrl.origin));
  }
}

function isHomePageRoute(req: NextRequest): boolean {
  console.log("Checking if home page route");
  return req.nextUrl.pathname === "/";
}

function isAuthRoute(req: NextRequest): boolean {
  console.log("Checking if auth route");
  return req.nextUrl.pathname.startsWith("/api/auth");
}

function isOnboardingRoute(req: NextRequest): boolean {
  console.log("Checking if onboarding route");
  return req.nextUrl.pathname.startsWith("/onboarding");
}

function isManagerDashboardRoute(req: NextRequest): boolean {
  return req.nextUrl.pathname.startsWith("/dashboard/manager");
}

function isCaretakerDashboardRoute(req: NextRequest): boolean {
  return req.nextUrl.pathname.startsWith("/dashboard/caretaker");
}

function isErrorPagesRoute(req: NextRequest): boolean {
  console.log("Checking if error pages route");
  return req.nextUrl.pathname.startsWith("/error");
}

function redirectToLogin(req: NextRequest): NextResponse {
  console.log("No session found in middleware, redirecting to login");
  const loginUrl = new URL("/api/auth/login/", req.nextUrl.origin);
  return NextResponse.redirect(loginUrl);
}

async function getUserRoles(session: Session): Promise<string[]> {
  console.log("Getting roles from session");
  return (await session.user["https://localhost-murphy.com/roles"]) || [];
}

async function handleNoRoles(
  req: NextRequest,
  res: NextResponse,
  session: Session
): Promise<NextResponse> {
  console.log("No roles found in middleware");
  const domain = process.env.AUTH0_DOMAIN;
  const clientId = process.env.AUTH0_CLIENT_ID;
  const clientSecret = process.env.AUTH0_CLIENT_SECRET;

  if (!domain || !clientId || !clientSecret) {
    console.log(
      "Missing Auth0 environment variables, redirecting to onboarding",
      domain,
      clientId,
      clientSecret
    );
    const onboardingUrl = new URL("/error/500", req.nextUrl.origin);
    return NextResponse.redirect(onboardingUrl);
  }

  console.log("Getting management API token");
  try {
    const tokenResponse = await axios.post(`https://${domain}/oauth/token`, {
      client_id: clientId,
      client_secret: clientSecret,
      audience: `https://${domain}/api/v2/`,
      grant_type: "client_credentials",
    });

    const accessToken = tokenResponse.data.access_token;

    const rolesResponse = await axios.get(
      `https://${domain}/api/v2/users/${session.user.sub}/roles`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    const firstRole = rolesResponse.data[0]?.name;
    if (firstRole) {
      console.log("Role found:", firstRole);
      if (firstRole !== "MANAGER" && firstRole !== "CARETAKER") {
        console.log("Unauthorized roles found for user in Auth0");
        return NextResponse.redirect(new URL("/error/401", req.nextUrl.origin));
      }

      // Update session with roles
      await updateSession(req, res, {
        ...session,
        user: {
          ...session.user,
          "https://localhost-murphy.com/roles": [firstRole],
        },
      });

      // Redirect based on role
      if (firstRole === "MANAGER" && isManagerDashboardRoute(req)) {
        return res;
      }
      if (firstRole === "CARETAKER" && isCaretakerDashboardRoute(req)) {
        return res;
      }
    } else {
      // Redirect to onboarding if no roles are found
      console.log(
        "No roles found for user in Auth0, redirecting to onboarding"
      );
      return NextResponse.redirect(new URL("/onboarding", req.nextUrl.origin));
    }
  } catch (error) {
    console.error("Error fetching roles from Auth0:", error);
    return NextResponse.redirect(new URL("/error/500", req.nextUrl.origin));
  }

  return res;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|api/.*).*)",
  ], // Apply middleware to the root path
};
