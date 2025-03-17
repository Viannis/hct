"use client";

import React from "react";
import { Tabs } from "antd";
import { useRouter, usePathname } from "next/navigation";

interface SettingsLayoutProps {
  children: React.ReactNode;
}

const SettingsLayout: React.FC<SettingsLayoutProps> = ({ children }) => {
  const router = useRouter();
  const pathname = usePathname();

  const handleTabChange = (key: string) => {
    let path = "/dashboard/manager/settings";
    if (key !== "1") {
      path = `${path}/${key}`;
    }
    router.push(path);
  };

  const getActiveKey = () => {
    const pathKey = pathname.replace("/dashboard/manager/settings", "");
    if (pathKey === "" || pathKey === "/") {
      return "1";
    }
    return pathKey.replace("/", "");
  };

  const items = [
    { label: "My Info", key: "1" },
    { label: "Location", key: "location" },
    { label: "Credentials", key: "credentials" },
  ];

  return (
    <div>
      <div style={{ textAlign: "left", padding: "16px" }}>
        <h1>Settings</h1>
      </div>
      <Tabs
        activeKey={getActiveKey()}
        onChange={handleTabChange}
        items={items}
      />
      <div>{children}</div>
    </div>
  );
};

export default SettingsLayout;
