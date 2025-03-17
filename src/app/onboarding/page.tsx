"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button, Input, Select, Form, Layout, Typography, message } from "antd";
import axios from "axios";
import { gql, useMutation } from "@apollo/client";
import { useUser } from "@auth0/nextjs-auth0/client";

const { Content } = Layout;
const { Title } = Typography;

type Role = {
  id: string;
  name: string;
  description: string;
};

const CREATE_USER_MUTATION = gql`
  mutation CreateUser($input: CreateUserInput!) {
    createUser(input: $input) {
      email
      name
      role
      auth0Id
    }
  }
`;

const Onboarding = () => {
  console.log("Rendering Onboarding");
  const [roles, setRoles] = useState<Role[]>([]);
  const [pageLoading, setPageLoading] = useState(true);
  const router = useRouter();
  const [form] = Form.useForm();
  const [createUser] = useMutation(CREATE_USER_MUTATION);
  const user = useUser();

  useEffect(() => {
    const checkOnboardingStatus = async () => {
      try {
        const response = await axios.get("/api/onboarding-user-check");
        if (response.status === 200) {
          if (response.data.role) {
            router.push(`/dashboard/${response.data.role.toLowerCase()}`);
          } else {
            router.push("/error/500");
          }
        }
      } catch (error) {
        console.error("Error checking onboarding status:", error);

        if (axios.isAxiosError(error) && error.response) {
          if (error.response.status === 404) {
            // Handle 404 error
            console.error("User not found");
            setPageLoading(false);
          } else if (error.response.status === 500) {
            // Handle 500 error
            console.error("Internal Server Error");
            router.push("/error/500");
          } else {
            // Handle other errors
            router.push("/error/500");
          }
        } else {
          router.push("/error/500");
        }
      }
    };

    checkOnboardingStatus();

    console.log("Fetching roles");
    const fetchRoles = async () => {
      axios
        .get("/api/get-user-roles")
        .then((response) => {
          console.log("Roles:", response.data.roles);
          setRoles(response.data.roles);
        })
        .catch((error) => {
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

      if (
        assignRoleResponse.status === 200 ||
        assignRoleResponse.status === 202
      ) {
        console.log("Role assigned successfully");
        if (!user?.user?.sub) {
          console.error("User not authenticated");
          message.error("User not authenticated");
          return;
        }

        if (assignRoleResponse.status === 202) {
          if (assignRoleResponse.data.role) {
            try {
              const { data } = await createUser({
                variables: {
                  input: {
                    email: user.user.email, // Replace with actual email
                    name: name,
                    role: assignRoleResponse.data.role.toUpperCase(),
                    auth0Id: user.user.sub, // Replace with actual auth0Id
                  },
                },
              });

              const userRole = data.createUser.role;
              if (userRole === "MANAGER") {
                router.push("/manager-dashboard");
              } else if (userRole === "CARETAKER") {
                router.push("/caretaker-dashboard");
              }
              console.log("User created:", data.newUser);
            } catch (error) {
              if (error instanceof Error) {
                console.error("Error creating user:", error.message);
                message.error("Error creating user");

                if (
                  Array.isArray((error as any).graphQLErrors) &&
                  (error as any).graphQLErrors[0]?.extensions?.code ===
                    "ROLE_EXISTS"
                ) {
                  console.error(
                    "Role already exists:",
                    (error as any).graphQLErrors[0].message
                  );
                  message.error("Role already exists");
                }
              } else {
                console.error("Unexpected error:", error);
                message.error("Unexpected error occurred");
              }
            }
          }
        }

        try {
          const { data } = await createUser({
            variables: {
              input: {
                email: user.user.email, // Replace with actual email
                name: name,
                role: role.toUpperCase(),
                auth0Id: user.user.sub, // Replace with actual auth0Id
              },
            },
          });

          const userRole = data.createUser.role;
          if (userRole === "MANAGER") {
            router.push("/manager-dashboard");
          } else if (userRole === "CARETAKER") {
            router.push("/caretaker-dashboard");
          }
          console.log("User created:", data.newUser);
        } catch (error) {
          if (error instanceof Error) {
            console.error("Error creating user:", error.message);
            message.error("Error creating user");

            if (
              Array.isArray((error as any).graphQLErrors) &&
              (error as any).graphQLErrors[0]?.extensions?.code ===
                "ROLE_EXISTS"
            ) {
              console.error(
                "Role already exists:",
                (error as any).graphQLErrors[0].message
              );
              message.error("Role already exists");
            }
          } else {
            console.error("Unexpected error:", error);
            message.error("Unexpected error occurred");
          }
        }
        console.log("User created successfully");
        message.success("User created successfully");
      } else {
        console.error("Error assigning role:", assignRoleResponse.data.error);
        message.error("Error assigning role");
      }
    } catch (error) {
      console.error("Error in handleSubmit:", error);
      message.error("Error in handleSubmit");
    }
  };

  return (
    <div>
      {pageLoading ? (
        <div>Loading...</div>
      ) : (
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
      )}
    </div>
  );
};

export default Onboarding;
