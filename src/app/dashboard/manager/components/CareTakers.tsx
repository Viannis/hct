"use client";

import React, { useState, useEffect } from "react";
import { Table, Button, Flex, notification } from "antd";
import { useQuery } from "@apollo/client";
import { useUser } from "@auth0/nextjs-auth0/client";
import type { NotificationArgsProps } from "antd";
import { ArrowRightOutlined } from "@ant-design/icons";
import { GET_CARETAKERS } from "@utils/queries";
import moment from "moment";
import { useRouter, usePathname } from "next/navigation";

type NotificationPlacement = NotificationArgsProps["placement"];
type NotificationType = "success" | "info" | "warning" | "error";

type CareTaker = {
  id: string;
  name: string;
  email: string;
  lastClockedIn: string;
  lastClockedOut: string;
};

const CareTakers = () => {
  const { user } = useUser();
  const {
    data: careTakersData,
    loading: careTakersDataLoading,
    error: careTakersDataError,
  } = useQuery(GET_CARETAKERS, { skip: !user });
  const [data, setData] = useState<CareTaker[]>([]);

  const router = useRouter();
  const pathname = usePathname();

  const [notificationConfig, setNotificationConfig] = useState<{
    message: string;
    description: string;
    placement: NotificationPlacement;
    type: NotificationType;
    autoCloseDuration: number;
  } | null>(null);

  const [api, contextHolder] = notification.useNotification();
  const [isLoading, setIsLoading] = useState(true);

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
    if (!careTakersDataLoading && careTakersData) {
      setData(careTakersData.caretakers);
      console.log("careTakersData", careTakersData.caretakers);
      setIsLoading(false);
    }
    if (careTakersDataError) {
      console.error("Error fetching caretakers:", careTakersDataError);
    }
  }, [careTakersDataLoading, careTakersData, careTakersDataError]);

  if (careTakersDataLoading) {
    return <div>Loading...</div>;
  }

  if (careTakersDataError) {
    return <div>Error loading shifts: {careTakersDataError.message}</div>;
  }

  const handleRowClick = (caretaker: CareTaker) => {
    console.log("Row clicked", caretaker);
    router.push(`${pathname}/${caretaker.id}`);
    // redirect to caretaker page
  };

  const columns = [
    {
      title: "Name",
      dataIndex: "name",
      key: "name",
      render: (text: string) => text,
    },
    {
      title: "Email",
      dataIndex: "email",
      key: "email",
      render: (text: string) => text,
    },
    {
      title: "Last Clocked In",
      dataIndex: "lastClockedIn",
      key: "clockInTime",
      render: (text: string) => moment(text).format("HH:mm"),
    },
    {
      title: "Last Clocked Out",
      dataIndex: "lastClockedOut",
      key: "clockOutTime",
      render: (text: string) => (text ? moment(text).format("HH:mm") : "-"),
    },
    {
      title: "Action",
      key: "action",
      render: (_: unknown, record: CareTaker) => (
        <Button
          type="text"
          onClick={() => handleRowClick(record)}
          icon={<ArrowRightOutlined />}
        />
      ),
    },
  ];

  const renderContent = () => {
    if (isLoading) {
      return <div>Loading...</div>;
    } else {
      return (
        <>
          <Flex style={{ marginBottom: 16 }}>
            <h1>Caretakers</h1>
          </Flex>
          <Table columns={columns} dataSource={data} rowKey="id" />
        </>
      );
    }
  };

  return (
    <div>
      {contextHolder}
      {renderContent()}
    </div>
  );
};

export default CareTakers;
