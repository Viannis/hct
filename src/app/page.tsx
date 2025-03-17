"use client";
import { useUser } from "@auth0/nextjs-auth0/client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Layout, Menu, Button } from "antd";

const { Header } = Layout;

export default function Home() {
  console.log("Rendering Home page");
  const { user, isLoading } = useUser();

  useEffect(() => {
    if (!isLoading && !user) {
      console.log("No user session found");
    }
  }, [isLoading, user]);

  const [role, setRole] = useState<string | null>(null);
  const [accountSetupIncomplete, setAccountSetupIncomplete] = useState(false);

  useEffect(() => {
    if (user) {
      const roles: string[] = user[
        "https://localhost-murphy.com/roles"
      ] as string[];
      if (roles && roles.length > 0) {
        setRole(roles[0]);
      } else {
        fetch("/api/get-loggedin-user-role")
          .then((res) => res.json())
          .then((data) => {
            if (data.role) {
              setRole(data.role);
            } else if (data.accountsetupincomplete) {
              setAccountSetupIncomplete(true);
            }
          })
          .catch((err) => {
            console.error("Error fetching user role:", err);
          });
      }
    }
  }, [user]);

  const renderButton = () => {
    if (!user || !role) {
      return (
        <Button type="primary">
          <Link href="/api/auth/login">Get Started</Link>
        </Button>
      );
    } else if (role) {
      return (
        <Button type="primary">
          <Link href={`/dashboard/${role.toLowerCase()}`}>Go to Dashboard</Link>
        </Button>
      );
    } else if (accountSetupIncomplete) {
      return (
        <Button type="primary">
          <Link href="/onboarding">Complete Account Setup</Link>
        </Button>
      );
    }
  };

  return (
    <Layout
      style={{
        height: "100vh",
        width: "100vw",
        backgroundColor: "#202020",
      }}
    >
      <Header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          backgroundColor: "transparent",
          paddingTop: 24,
          paddingLeft: 96,
          paddingRight: 96,
          paddingBottom: 24,
        }}
      >
        <Menu
          mode="horizontal"
          style={{ flex: 1, backgroundColor: "transparent" }}
        >
          <Menu.Item key="1" style={{ color: "white" }}>
            <Link href="/">Home</Link>
          </Menu.Item>
        </Menu>
        {renderButton()}
      </Header>
      {user && (
        <div
          style={{
            color: "white",
            width: "100%",
            height: "100%",
            marginTop: 128,
            justifyContent: "center",
            display: "flex",
          }}
        >
          <h1>Welcome, {user.name}!</h1>
        </div>
      )}
    </Layout>
  );
}
