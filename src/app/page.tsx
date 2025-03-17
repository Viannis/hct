"use client";
import { useUser } from "@auth0/nextjs-auth0/client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Layout, Menu, Button } from "antd";

const { Header, Content } = Layout;

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

  return (
    <Layout>
      <Header style={{ display: "flex", justifyContent: "space-between" }}>
        <div style={{ width: 100, height: 40, backgroundColor: "gray" }} />
        <Menu theme="dark" mode="horizontal" style={{ flex: 1 }}>
          <Menu.Item key="1">
            <Link href="/">Home</Link>
          </Menu.Item>
        </Menu>
        {!user ? (
          <Button type="primary">
            <Link href="/api/auth/login">Get Started</Link>
          </Button>
        ) : role ? (
          <Button type="primary">
            <Link href={`/dashboard/${role.toLowerCase()}`}>
              Go to Dashboard
            </Link>
          </Button>
        ) : accountSetupIncomplete ? (
          <Button type="primary">
            <Link href="/onboarding">Complete Account Setup</Link>
          </Button>
        ) : (
          <Button type="primary">
            <Link href="/get-started">Get Started</Link>
          </Button>
        )}
      </Header>
      <Content style={{ padding: "50px", textAlign: "center" }}>
        <div style={{ padding: 24, minHeight: 380 }}>
          <h1>Placeholder Title</h1>
          <Button type="primary" size="large">
            Get Started
          </Button>
        </div>
      </Content>
    </Layout>
  );
}
