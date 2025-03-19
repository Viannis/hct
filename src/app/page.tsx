"use client";
import { useUser } from "@auth0/nextjs-auth0/client";
import { useEffect, useState } from "react";
import hctlogo from "@/app/1hctlogo.png";
import Image from "next/image";
import Link from "next/link";
import { Layout, Button, notification } from "antd";
import axios from "axios";
import type { NotificationArgsProps } from "antd";

// This component handles the home page rendering, user authentication, and navigation based on user roles.

type NotificationPlacement = NotificationArgsProps["placement"];
type NotificationType = "success" | "info" | "warning" | "error";

const { Header } = Layout;

type ButtonProps = {
  paddingInline: number | string;
  paddingTop: number | string;
  paddingBottom: number | string;
  fontSize: string | number;
};

// The Header component from Ant Design is used to create a navigation bar at the top of the page.

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

  // This effect handles displaying notifications to the user based on the notification configuration state.

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

  // This effect checks the user's account setup status and role, setting the appropriate state for navigation.

  const renderButton = (buttonProps: ButtonProps) => {
    console.log("User:", user);
    console.log("Role:", role);
    console.log("Account setup incomplete:", accountSetupIncomplete);
    if (!buttonLoading) {
      if (!user) {
        return (
          <Button
            shape="round"
            style={{
              paddingInline: buttonProps.paddingInline,
              paddingTop: buttonProps.paddingTop,
              paddingBottom: buttonProps.paddingBottom,
              fontSize: buttonProps.fontSize,
            }}
            type="primary"
            onClick={handleLogin}
          >
            Get Started
          </Button>
        );
      }
      if (role) {
        return (
          <Button
            style={{
              paddingInline: buttonProps.paddingInline,
              paddingTop: buttonProps.paddingTop,
              paddingBottom: buttonProps.paddingBottom,
              fontSize: buttonProps.fontSize,
            }}
            shape="round"
            type="primary"
          >
            <Link href={`/dashboard/${role.toLowerCase()}`}>
              Go to Dashboard
            </Link>
          </Button>
        );
      }
      if (accountSetupIncomplete) {
        return (
          <Button
            shape="round"
            type="primary"
            style={{
              paddingInline: buttonProps.paddingInline,
              paddingTop: buttonProps.paddingTop,
              paddingBottom: buttonProps.paddingBottom,
              fontSize: buttonProps.fontSize,
            }}
          >
            <Link href="/onboarding">Complete Account Setup</Link>
          </Button>
        );
      }
      return (
        <Button
          shape="round"
          type="primary"
          style={{
            paddingInline: buttonProps.paddingInline,
            paddingTop: buttonProps.paddingTop,
            paddingBottom: buttonProps.paddingBottom,
            fontSize: buttonProps.fontSize,
          }}
        >
          <Link href="/onboarding">Complete Account Setup</Link>
        </Button>
      );
    }
    return (
      <Button
        style={{
          paddingInline: buttonProps.paddingInline,
          paddingTop: buttonProps.paddingTop,
          paddingBottom: buttonProps.paddingBottom,
          fontSize: buttonProps.fontSize,
        }}
        shape="round"
        type="primary"
        loading
      >
        Loading
      </Button>
    );
  };

  // Renders the appropriate button based on the user's authentication and role status.

  return (
    <div
      style={{ height: "100vh", width: "100vw", backgroundColor: "#ffffff" }}
    >
      <div
        style={{
          width: "256px",
          height: "256px",
          borderRadius: "100%",
          backgroundColor: "#37F5FF",
          filter: "blur(132px)",
          flexShrink: 0,
          position: "absolute",
          top: "34px",
          left: "-36px",
          zIndex: 0,
        }}
      ></div>
      <div
        style={{
          width: "256px",
          height: "256px",
          borderRadius: "100%",
          backgroundColor: "#71C9FE",
          filter: "blur(132px)",
          flexShrink: 0,
          position: "absolute",
          top: "96px",
          right: "-24px",
          zIndex: 0,
        }}
      ></div>
      <div
        style={{
          width: "256px",
          height: "256px",
          borderRadius: "100%",
          backgroundColor: "#A2B9FF",
          filter: "blur(132px)",
          flexShrink: 0,
          position: "absolute",
          top: "0px",
          right: "0px",
          zIndex: 0,
        }}
      ></div>
      {contextHolder}
      <Layout
        style={{
          height: "100vh",
          width: "100vw",
          backgroundColor: "transparent",
          zIndex: 2,
        }}
      >
        <Header
          style={{
            display: "flex",
            width: "100%",
            padding: "1.2em 6em",
            justifyContent: "space-between",
            alignItems: "center",
            backgroundColor: "rgba(255, 255, 255, 0.07)",
            borderBottom: "1px solid #f0f0f0",
            backdropFilter: "blur(2px)",
            height: "fit-content",
            zIndex: 1000,
          }}
          className="home-header"
        >
          <Image
            src={hctlogo}
            alt="1HCT Logo"
            style={{ width: "auto" }}
            height={36}
          />
          {renderButton({
            paddingInline: "2.4em",
            paddingTop: "1.5em",
            paddingBottom: "1.5em",
            fontSize: "1em",
          })}
        </Header>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            paddingTop: "8em",
            paddingLeft: "2em",
            paddingRight: "2em",
            height: "100%",
          }}
        >
          <div
            style={{
              padding: "0.6em 1.8em",
              backgroundColor: "rgba(255,255,255, 0.56)",
              border: "1px solid #f0f0f0",
              borderRadius: "70px",
              margin: "1em 1.8em",
              backdropFilter: "blur(2px)",
              textAlign: "center",
              color: "black",
              fontSize: "1.2em",
              width: "fit-content",
            }}
          >
            World&apos;s Most Adopted Platform by Healthcare Professionals
          </div>
          <div
            style={{
              color: "black",
              fontSize: "5em",
              fontWeight: 500,
              paddingTop: 20,
              letterSpacing: "-0.01em",
              textAlign: "center",
              lineHeight: "1.15em",
            }}
          >
            The Leading Platform For <br />
            Managing Careworkers
          </div>
          <div style={{ paddingTop: "6em" }}>
            {renderButton({
              paddingInline: "3em",
              paddingTop: "1.5em",
              paddingBottom: "1.5em",
              fontSize: "1.2em",
            })}
          </div>
          <div
            style={{
              height: 1,
              width: "85%",
              backgroundColor: "#EBF0F5",
              marginTop: "12em",
            }}
          ></div>
        </div>
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
    </div>
  );
}
