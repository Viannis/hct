"use client";

import {
  HomeOutlined,
  TeamOutlined,
  SettingOutlined,
  LogoutOutlined,
  HistoryOutlined,
} from "@ant-design/icons";
import { usePathname } from "next/navigation";
import { Menu, Layout } from "antd";
import Link from "next/link";
import { useState } from "react";

const { Sider, Content } = Layout;

export default function DashboardLayout({
  children,
}: {
  readonly children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  const managerMenuItems = [
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
      label: <Link href="/api/auth/logout">Logout</Link>,
    },
  ];

  const careTakerMenuItems = [
    {
      key: "/dashboard/caretaker",
      icon: <HomeOutlined />,
      label: <Link href="/dashboard/caretaker">Home</Link>,
    },
    {
      key: "/dashboard/caretaker/shifts",
      icon: <HistoryOutlined />,
      label: <Link href="/dashboard/caretaker/shifts">Shifts</Link>,
    },
    {
      key: "/dashboard/caretaker/settings",
      icon: <SettingOutlined />,
      label: <Link href="/dashboard/caretaker/settings">Settings</Link>,
    },
    {
      key: "/api/auth/logout",
      icon: <LogoutOutlined />,
      label: <Link href="/api/auth/logout">Logout</Link>,
    },
  ];

  const routeCheckForKey = (): string[] => {
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
    <Layout style={{ minHeight: "100vh" }}>
      <Sider
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
      <Layout style={{ marginLeft: collapsed ? 79 : 200, background: "#fff" }}>
        <Content style={{ margin: "24px 16px", padding: 24 }}>
          {children}
        </Content>
      </Layout>
    </Layout>
  );
}
