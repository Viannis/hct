"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Button,
  Input,
  Select,
  Form,
  Layout,
  Typography,
  Spin,
  notification,
} from "antd";
import axios from "axios";
import { useUser } from "@auth0/nextjs-auth0/client";
import type { NotificationArgsProps } from "antd";

type NotificationPlacement = NotificationArgsProps["placement"];
type NotificationType = "success" | "info" | "warning" | "error";

const { Content } = Layout;
const { Title } = Typography;

type Role = {
  id: string;
  name: string;
  description: string;
};

const Onboarding = () => {
  console.log("Rendering Onboarding");
  const [roles, setRoles] = useState<Role[]>([]);
  const [pageLoading, setPageLoading] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [accountSetupIncomplete, setAccountSetupIncomplete] = useState(false);
  const { user, isLoading, error } = useUser();
  // useUser hook from Auth0 is used to manage user authentication state.

  const router = useRouter();
  const [form] = Form.useForm();
  const [notificationConfig, setNotificationConfig] = useState<{
    message: string;
    description: string;
    placement: NotificationPlacement;
    type: NotificationType;
    autoCloseDuration: number;
  } | null>(null);
  const [api, contextHolder] = notification.useNotification();
  // Ant Design's notification API for displaying notifications.

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
    setPageLoading(true);
    async function checkAccountSetupStatus() {
      if (user) {
        const roles: string[] = user[
          "https://localhost-murphy.com/roles" // Session namespace url for roles (Auth0)
        ] as string[];
        console.log("Roles found in user session:", roles);
        if (roles && roles.length > 0) {
          setPageLoading(false);
          setRole(roles[0]);
        } else {
          try {
            const userRoleResponse = await axios.get(
              "/api/get-loggedin-user-role" // API endpoint to get the user's role to check if they are onboarded already and ended up here by mistake
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
              setPageLoading(false);
              setAccountSetupIncomplete(true);
              return;
            }
            console.log(
              "User role not found in DB",
              userRoleResponse.data.role
            );
            setPageLoading(false);
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
      if (error) {
        setPageError("Error fetching user session. Try logging in again.");
      }
      setPageLoading(false);
    }

    checkAccountSetupStatus();
  }, [isLoading, user, error]);
  // This effect checks the user's account setup status and role, setting the appropriate state for navigation.

  useEffect(() => {
    const fetchRoles = async () => {
      axios
        .get("/api/get-user-roles") // API endpoint to get all available roles from Auth0 for type safety roles dropdown during onboarding
        .then((response) => {
          console.log("Roles:", response.data.roles);
          setRoles(response.data.roles);
        })
        .catch((error) => {
          setPageError("Error fetching roles. Try later.");
          console.error("Error fetching roles:", error);
        });
    };

    fetchRoles();
  }, []);
  // This effect fetches available roles from the server and updates the roles state.

  const handleSubmit = async (values: { name: string; role: string }) => {
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
        } else {
          setPageError("Error assigning role");
        }
      }
    } catch (error) {
      setPageError("Error assigning role. Try later.");
      console.error("Error assigning role", error);
    }
  };
  // Handles form submission, assigning a role to the user and navigating to the appropriate dashboard.

  const renderContent = () => {
    if (pageLoading) {
      return (
        <div
          style={{
            width: "100vw",
            height: "100vh",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <Spin />
        </div>
      );
    }
    if (pageError) {
      return <div>{pageError}</div>;
    }
    if (role) {
      // If the user is already onboarded, navigate to the appropriate dashboard
      return (
        <Layout style={{ minHeight: "100vh", padding: "50px" }}>
          <Content
            style={{ maxWidth: "600px", margin: "auto", textAlign: "center" }}
          >
            <Title level={2}>Welcome back!</Title>
            <h2>You are already onboarded.</h2>
            <Button
              type="primary"
              onClick={() => router.push(`/dashboard/${role.toLowerCase()}`)} // Navigate to the appropriate dashboard based on the assigned role
              size="large"
              style={{ marginTop: 20 }}
            >
              Go to dashboard
            </Button>
          </Content>
        </Layout>
      );
    }
    if (accountSetupIncomplete) {
      // If the user is not onboarded, show the onboarding form
      return (
        <Layout style={{ minHeight: "100vh", padding: "50px" }}>
          <Content style={{ maxWidth: "600px", margin: "auto" }}>
            <Title level={2}>Onboarding</Title>
            <Form form={form} layout="vertical" onFinish={handleSubmit}>
              <Form.Item
                label="Name"
                name="name"
                rules={[{ required: true, message: "Input required" }]}
              >
                <Input placeholder="Name" />
              </Form.Item>
              <Form.Item
                label="Role"
                name="role"
                rules={[{ required: true, message: "Input required" }]}
              >
                <Select placeholder="Select Role">
                  {roles.map((role) => (
                    <Select.Option key={role.id} value={role.name}>
                      {role.name}
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>
              <Form.Item>
                <Button type="primary" htmlType="submit">
                  Submit
                </Button>
              </Form.Item>
            </Form>
          </Content>
        </Layout>
      );
    }
    return (
      // If there is an error, show the error message
      <Layout style={{ minHeight: "100vh", padding: "50px" }}>
        <Content
          style={{ maxWidth: "600px", margin: "auto", textAlign: "center" }}
        >
          <Title level={2}>Oops Some Error Occured!</Title>
          <h2>Try again later.</h2>
        </Content>
      </Layout>
    );
  };
  // Renders the appropriate content based on the page's loading state, error state, and user role.

  return (
    <>
      {contextHolder}
      {renderContent()}
    </>
  );
};

export default Onboarding;
