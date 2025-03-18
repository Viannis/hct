"use client";
import { useUser } from "@auth0/nextjs-auth0/client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Layout, Menu, Button, notification } from "antd";
import axios from "axios";
import type { NotificationArgsProps } from "antd";

type NotificationPlacement = NotificationArgsProps["placement"];
type NotificationType = "success" | "info" | "warning" | "error";

const { Header } = Layout;

export default function Home() {
  console.log("Rendering Home page");
  const { user, isLoading } = useUser();
  const [buttonLoading, setButtonLoading] = useState(true);
  const [notificationConfig, setNotificationConfig] = useState<{
    message: string;
    description: string;
    placement: NotificationPlacement;
    type: NotificationType;
    autoCloseDuration: number;
  } | null>(null);
  const [api, contextHolder] = notification.useNotification();
  const [role, setRole] = useState<string | null>(null);
  const [accountSetupIncomplete, setAccountSetupIncomplete] = useState(false);

  const handleLogin = () => {
    window.location.href = "/api/auth/login";
  };

  useEffect(() => {
    if (notificationConfig) {
      const { message, description, placement, type, autoCloseDuration } =
        notificationConfig;
      api[type]({
        message,
        description,
        placement,
        duration: autoCloseDuration,
      });
      setNotificationConfig(null); // Reset notification config after showing the notification
    }
  }, [notificationConfig, api]);

  useEffect(() => {
    setButtonLoading(true);
    async function checkAccountSetupStatus() {
      if (user) {
        const roles: string[] = user[
          "https://localhost-murphy.com/roles"
        ] as string[];
        console.log("Roles found in user session:", roles);
        if (roles && roles.length > 0) {
          setButtonLoading(false);
          setRole(roles[0]);
        } else {
          try {
            const userRoleResponse = await axios.get(
              "/api/get-loggedin-user-role"
            );
            console.log("User role response:", userRoleResponse.data);
            if (!userRoleResponse.data) {
              setNotificationConfig({
                message: "Error",
                description: "Internal Server Error. Try again later.",
                placement: "topLeft",
                type: "error",
                autoCloseDuration: 3,
              });
              return;
            }
            if (userRoleResponse.data.role === null) {
              console.log("Checking if user role is null");
              setButtonLoading(false);
              setAccountSetupIncomplete(true);
              return;
            }
            console.log(
              "User role not found in DB",
              userRoleResponse.data.role
            );
            setButtonLoading(false);
            setAccountSetupIncomplete(false);
            setRole(userRoleResponse.data.role);
          } catch (error) {
            console.error("Error fetching user role:", error);
            setNotificationConfig({
              message: "Error",
              description: "Internal Server Error. Try again later.",
              placement: "topLeft",
              type: "error",
              autoCloseDuration: 3,
            });
            return;
          }
        }
      }
      setButtonLoading(false);
    }

    checkAccountSetupStatus();
  }, [isLoading, user]);

  const renderButton = () => {
    console.log("User:", user);
    console.log("Role:", role);
    console.log("Account setup incomplete:", accountSetupIncomplete);
    if (!buttonLoading) {
      if (!user) {
        return (
          <Button type="primary" onClick={handleLogin}>
            Get Started
          </Button>
        );
      }
      if (role) {
        return (
          <Button type="primary">
            <Link href={`/dashboard/${role.toLowerCase()}`}>
              Go to Dashboard
            </Link>
          </Button>
        );
      }
      if (accountSetupIncomplete) {
        return (
          <Button type="primary">
            <Link href="/onboarding">Complete Account Setup</Link>
          </Button>
        );
      }
      return (
        <Button type="primary">
          <Link href="/onboarding">Complete Account Setup</Link>
        </Button>
      );
    }
    return (
      <Button type="primary" loading>
        Loading
      </Button>
    );
  };

  return (
    <>
      {contextHolder}
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
    </>
  );
}
