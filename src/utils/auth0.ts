import { initAuth0 } from "@auth0/nextjs-auth0";

const auth0 = initAuth0({ // Initialize the Auth0 client
  secret: process.env.AUTH0_SECRET, // Secret
  baseURL: process.env.AUTH0_BASE_URL, // Base URL
  issuerBaseURL: process.env.AUTH0_ISSUER_BASE_URL, // Issuer base URL
  clientID: process.env.AUTH0_CLIENT_ID, // Client ID
  clientSecret: process.env.AUTH0_CLIENT_SECRET, // Client secret
  routes: { 
    callback: "/api/auth/callback", // Callback route
    postLogoutRedirect: "/", // Post logout redirect route
  },
  authorizationParams: {
    scope: "openid profile email offline_access", // Authorization parameters for the Auth0 client
  },
  session: {
    rollingDuration: 60 * 60 * 8, // 8 hours
  },
});

export default auth0;
