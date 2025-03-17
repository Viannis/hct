import type { Metadata } from "next";
import { UserProvider } from "@auth0/nextjs-auth0/client";
import ApolloProviderWrapper from "@/components/ApolloProviderWrapper";
import "./globals.css";

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
