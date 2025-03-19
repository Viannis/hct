import type { Metadata } from "next";
import { UserProvider } from "@auth0/nextjs-auth0/client";
import ApolloProviderWrapper from "@/components/ApolloProviderWrapper";
import "./globals.css";

// UserProvider from Auth0 is used for managing user authentication context.
// ApolloProviderWrapper is a custom component for providing Apollo Client context.

export const metadata: Metadata = {
  title: "Health Caretaker Management System",
  description: "Health Caretaker Management System",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {

  return (
    <html lang="en">
      <body>
        <ApolloProviderWrapper>
          <UserProvider>{children}</UserProvider>
        </ApolloProviderWrapper>
      </body>
    </html>
  );
}
