import { UserContext } from "@auth0/nextjs-auth0/client";

interface ExtendedUserContext extends UserContext {
  user?: {
    "https://localhost-murphy.com/roles"?: string[];
    [key: string]: any;
  };
}
