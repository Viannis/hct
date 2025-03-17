import { handleAuth, handleLogin, handleLogout } from "@auth0/nextjs-auth0";

export default handleAuth({
  // This login handler performs a full redirect to Auth0’s /authorize endpoint
  login: handleLogin({
    returnTo: process.env.AUTH0_BASE_URL, // After login, redirect back to your app
  }),
  logout: handleLogout({
    // Build a logout URL that logs out from Auth0 and then returns to your app
    returnTo: `${process.env.AUTH0_ISSUER_BASE_URL}/v2/logout?client_id=${process.env.AUTH0_CLIENT_ID}&returnTo=${process.env.AUTH0_BASE_URL}`,
  }),
});
