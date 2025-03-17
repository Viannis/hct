import { initAuth0 } from "@auth0/nextjs-auth0";

const auth0 = initAuth0({
  secret: process.env.AUTH0_SECRET,
  baseURL: process.env.AUTH0_BASE_URL,
  issuerBaseURL: process.env.AUTH0_ISSUER_BASE_URL,
  clientID: process.env.AUTH0_CLIENT_ID,
  clientSecret: process.env.AUTH0_CLIENT_SECRET,
  routes: {
    callback: "/api/auth/callback",
    postLogoutRedirect: "/",
  },
  authorizationParams: {
    scope: "openid profile email offline_access",
  },
  session: {
    rollingDuration: 60 * 60 * 8, // 8 hours
  },
});

export default auth0;
