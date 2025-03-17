"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button, Input, Select, Form, Layout, Typography, Spin } from "antd";
import axios from "axios";
import { User } from "@prisma/client";
import { useUser } from "@auth0/nextjs-auth0/client";

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
  const { user, isLoading, error } = useUser();
  const [userInDb, setUserInDb] = useState<User | null>(null);
  const router = useRouter();
  const [form] = Form.useForm();

  useEffect(() => {
    const checkUserInDb = async () => {
      setPageLoading(true);
      if (user && !isLoading && !error) {
        try {
          const response = await axios.get("/api/is-user-in-db");
          if (response.data.userInDb) {
            setUserInDb(response.data.userInDb);
            setPageLoading(false);
          } else {
            setPageLoading(false);
          }
        } catch (error) {
          setPageError("Error verifying user. Try later.");
          console.error("Error checking user in DB:", error);
        }
      }
      if (error) {
        setPageError("Error fetching user session. Try logging in again.");
      }
    };

    checkUserInDb();
  }, [user, isLoading, error]);

  useEffect(() => {
    const fetchRoles = async () => {
      axios
        .get("/api/get-user-roles")
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

  const handleSubmit = async (values: { name: string; role: string }) => {
    const { name, role } = values;

    try {
      // Assign the role
      const assignRoleResponse = await axios.post("/api/assign-role-name", {
        roleName: role,
        name: name,
      });

      if (assignRoleResponse.data) {
        if (assignRoleResponse.data.role) {
          router.push(
            `/dashboard/${assignRoleResponse.data.role.toLowerCase()}`
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
    } else if (pageError) {
      return <div>{pageError}</div>;
    } else if (userInDb) {
      return (
        <Layout style={{ minHeight: "100vh", padding: "50px" }}>
          <Content
            style={{ maxWidth: "600px", margin: "auto", textAlign: "center" }}
          >
            <Title level={2}>Welcome back, {userInDb.name}!</Title>
            <h2>You are already onboarded.</h2>
            <Button
              type="primary"
              onClick={() =>
                router.push(`/dashboard/${userInDb.role.toLowerCase()}`)
              }
              size="large"
              style={{ marginTop: 20 }}
            >
              Go to dashboard
            </Button>
          </Content>
        </Layout>
      );
    } else {
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
  };

  return renderContent();
};

export default Onboarding;
