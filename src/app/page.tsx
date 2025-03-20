"use client";
import { useUser } from "@auth0/nextjs-auth0/client";
import { useEffect, useState } from "react";
import hctlogo from "@/app/1hctlogo.png";
import Image from "next/image";
import Link from "next/link";
import { Layout, Button, notification, Spin } from "antd";
import type { NotificationArgsProps } from "antd";
import BackgroundWrapper from "./components/BackgroudWrapper";
import { useQuery } from "@apollo/client";
import { GET_ME } from "@utils/queries";
import { User } from "@prisma/client";
import { LoadingOutlined } from "@ant-design/icons";
import axios from "axios";
import { useRouter } from "next/navigation";
import OnboardingForm from "./components/OnboardingForm";
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
  const router = useRouter();
  const {
    user: sessionUser,
    isLoading: sessionUserLoading,
    error: sessionUserError,
  } = useUser();
  const {
    data: userData,
    loading: userLoading,
    error: userError,
  } = useQuery(GET_ME, {
    skip: !sessionUser,
  });
  const [pageLoading, setPageLoading] = useState(true);
  const [isOnboarding, setIsOnboarding] = useState(false);
  const [needsLogin, setNeedsLogin] = useState(true);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [notificationConfig, setNotificationConfig] = useState<{
    message: string;
    description: string;
    placement: NotificationPlacement;
    type: NotificationType;
    autoCloseDuration: number;
  } | null>(null);
  const [api, contextHolder] = notification.useNotification();

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
    console.log("UseEffect called");
    if (!sessionUserLoading) {
      console.log("User from session loading is complete");
      if (!sessionUser) {
        console.log("User from session is not found");
        setNeedsLogin(true);
        setPageLoading(false);
        return;
      } else {
        console.log("User from session is found");
        setNeedsLogin(false);
      }
      if (!userLoading) {
        console.log("User from db loading is complete");
        if (!userData.me) {
          console.log("User from db is not found");
          setNeedsOnboarding(true);
          setPageLoading(false);
        } else {
          console.log("User from db is found");
          setUser(userData.me);
          setPageLoading(false);
        }
        return;
      }
    }

    if (sessionUserError) {
      console.log("Session user error");
      setPageLoading(false);
      notification.error({
        message: "Oops!",
        description: "Something went wrong. Try again later.",
        placement: "bottomRight",
        duration: 3,
      });
      return;
    }

    if (userError) {
      console.log("There is an error getting the user from db");
      setPageLoading(false);
      notification.error({
        message: "Oops!",
        description: "Something went wrong. Try again later.",
        placement: "bottomRight",
        duration: 3,
      });
    }
  }, [
    sessionUserLoading,
    sessionUser,
    sessionUserError,
    userLoading,
    userData,
    userError,
  ]);

  const handleSubmit = async (values: { name: string; role: string }) => {
    setIsOnboarding(true);
    const { name, role } = values;

    try {
      const formData = new FormData();
      formData.append("roleName", role);
      formData.append("name", name);
      // Assign the role
      const assignRoleResponse = await axios.post("/api/assign-role-name", {
        // API endpoint to creating user record in the DB and assigning role in Auth0
        roleName: role,
        name: name,
      });

      if (assignRoleResponse.data) {
        if (assignRoleResponse.data.role) {
          router.push(
            `/dashboard/${assignRoleResponse.data.role.toLowerCase()}` // Navigate to the appropriate dashboard based on the assigned role
          );
          setIsOnboarding(false);
          return;
        } else {
          notification.error({
            message: "Oops!",
            description: "Something went wrong. Try again later.",
            placement: "bottomRight",
            duration: 3,
          });
          setIsOnboarding(false);
        }
      }
    } catch (error) {
      notification.error({
        message: "Oops!",
        description: "Something went wrong. Try again later.",
        placement: "bottomRight",
        duration: 3,
      });
      setIsOnboarding(false);
      console.error("Error assigning role", error);
    }
  };

  const renderButton = (buttonProps: ButtonProps) => {
    if (needsLogin) {
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
    } else if (needsOnboarding) {
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
    } else if (user) {
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
          <Link href={`/dashboard/${user.role.toLowerCase()}`}>
            Go to Dashboard
          </Link>
        </Button>
      );
    } else {
      return null;
    }
  };

  const renderMainContent = () => {
    if (needsOnboarding) {
      return (
        <OnboardingForm
          handleSubmit={handleSubmit}
          isOnboarding={isOnboarding}
        />
      );
    } else if (user) {
      return (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
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
            Welcome Back! <br />
            {user.name}
          </div>
          <Button
            style={{
              marginTop: "3em",
              paddingInline: "3em",
              paddingTop: "1.5em",
              paddingBottom: "1.5em",
              fontSize: "1.2em",
            }}
            shape="round"
            type="primary"
          >
            <Link href={`/dashboard/${user.role.toLowerCase()}`}>
              Go to Dashboard
            </Link>
          </Button>
        </div>
      );
    } else {
      return (
        <>
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
        </>
      );
    }
  };

  const renderContent = () => {
    if (pageLoading) {
      return (
        <div
          style={{
            height: "100vh",
            width: "100vw",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <Spin indicator={<LoadingOutlined style={{ fontSize: 48 }} spin />} />
        </div>
      );
    } else {
      return (
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
            {renderMainContent()}
          </div>
        </Layout>
      );
    }
  };

  // Renders the appropriate button based on the user's authentication and role status.

  return (
    <BackgroundWrapper>
      {contextHolder}
      {renderContent()}
    </BackgroundWrapper>
  );
}
