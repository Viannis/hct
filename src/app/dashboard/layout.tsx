"use client";

import {
  HomeOutlined,
  TeamOutlined,
  SettingOutlined,
  LogoutOutlined,
} from "@ant-design/icons";
import { usePathname, useRouter } from "next/navigation";
import { Menu, Layout, Button, notification } from "antd";
import Link from "next/link";
import { useState, useEffect } from "react";
import type { NotificationArgsProps } from "antd";
import { UserLocationProvider } from "./manager/context/UserLocationContext";
import LoadError from "./manager/components/LoadError";

type NotificationPlacement = NotificationArgsProps["placement"];
type NotificationType = "success" | "info" | "warning" | "error";

const { Sider, Content } = Layout;

export default function DashboardLayout({
  children,
}: {
  readonly children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [notificationConfig, setNotificationConfig] = useState<{
    message: string;
    description: string;
    placement: NotificationPlacement;
    type: NotificationType;
    autoCloseDuration: number;
  } | null>(null);
  const [api, contextHolder] = notification.useNotification();

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

  const handleLogout = async () => {
    // Logout the user via Auth0's logout endpoint
    router.push("/api/auth/logout");
  };

  const managerMenuItems = [
    // Manager menu items
    {
      key: "/dashboard/manager",
      icon: <HomeOutlined />,
      label: <Link href="/dashboard/manager">Home</Link>,
    },
    {
      key: "/dashboard/manager/caretakers",
      icon: <TeamOutlined />,
      label: <Link href="/dashboard/manager/caretakers">Caretakers</Link>,
    },
    {
      key: "/dashboard/manager/settings",
      icon: <SettingOutlined />,
      label: <Link href="/dashboard/manager/settings">Settings</Link>,
    },
    {
      key: "/api/auth/logout",
      icon: <LogoutOutlined />,
      label: (
        <Button type="text" style={{ padding: 0 }} onClick={handleLogout}>
          Logout
        </Button>
      ),
    },
  ];

  const careTakerMenuItems = [
    // Caretaker menu items
    {
      key: "/dashboard/caretaker",
      icon: <HomeOutlined />,
      label: <Link href="/dashboard/caretaker">Home</Link>,
    },
    {
      key: "/dashboard/caretaker/settings",
      icon: <SettingOutlined />,
      label: <Link href="/dashboard/caretaker/settings">Settings</Link>,
    },
    {
      key: "/api/auth/logout",
      icon: <LogoutOutlined />,
      label: (
        <Button type="text" style={{ padding: 0 }} onClick={handleLogout}>
          Logout
        </Button>
      ),
    },
  ];

  const routeCheckForKey = (): string[] => {
    // Check the route for the appropriate menu item and set the active key even if a subroute is open
    if (pathname.startsWith("/dashboard/manager")) {
      for (let index = managerMenuItems.length - 2; index >= 0; index--) {
        const element = managerMenuItems[index];
        if (pathname.startsWith(element.key)) {
          return [element.key];
        }
      }
    } else if (pathname.startsWith("/dashboard/caretaker")) {
      for (let index = careTakerMenuItems.length - 2; index >= 0; index--) {
        const element = careTakerMenuItems[index];
        if (pathname.startsWith(element.key)) {
          return [element.key];
        }
      }
    }
    return ["/"];
  };

  return (
    <>
      {contextHolder} {/* Context holder for notifications */}
      <Layout style={{ minHeight: "100vh" }}>
        <Sider // Sider component for the sidebar
          theme="light"
          breakpoint="lg"
          onBreakpoint={(broken) => {
            console.log(broken);
          }}
          collapsed={collapsed}
          onCollapse={(value) => setCollapsed(value)}
          style={{
            overflow: "auto",
            height: "100vh",
            position: "fixed",
            width: "20%",
            maxWidth: 256,
            left: 0,
            borderRight: "1px solid #f0f0f0",
          }}
        >
          <div
            style={{
              height: 32,
              margin: 16,
              background: "#1890ff",
              borderRadius: 4,
            }}
          />
          <Menu
            mode="inline"
            selectedKeys={routeCheckForKey()}
            items={
              pathname.startsWith("/dashboard/manager")
                ? managerMenuItems
                : careTakerMenuItems
            }
          />
        </Sider>
        <Layout // Layout component for the main content to be rendered based on the pathname
          style={{ marginLeft: collapsed ? 79 : 200, background: "#fff" }}
        >
          <Content style={{ margin: "24px 16px", padding: 24 }}>
            <UserLocationProvider>
              {" "}
              {/* UserLocationProvider component for the user location context */}
              <LoadError>{children}</LoadError>{" "}
              {/* LoadError component for the error handling and page loading */}
            </UserLocationProvider>
          </Content>
        </Layout>
      </Layout>
    </>
  );
}
