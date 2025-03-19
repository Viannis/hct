"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Input,
  Table,
  Button,
  Modal,
  Flex,
  notification,
  Skeleton,
  Select,
} from "antd";
import { Shift } from "@prisma/client";
import type { NotificationArgsProps } from "antd";
import { useShifts } from "../context/ShiftsContext"; // Import the useShifts hook
import moment from "moment";

type NotificationPlacement = NotificationArgsProps["placement"];
type NotificationType = "success" | "info" | "warning" | "error";

const { Option } = Select;

const placeholderShift: Shift = {
  id: "loading",
  clockIn: new Date(),
  clockOut: null,
  clockInNote: "Loading...",
  clockOutNote: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  userId: "loading",
};

const Shifts = () => {
  const {
    shifts,
    location,
    loading,
    handleClockIn,
    handleClockOut,
    error,
    handleDateRangeChange,
    setLoading,
  } = useShifts(); // Destructure context values
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [selectedShift, setSelectedShift] = useState<Shift | null>(null);
  const [notificationConfig, setNotificationConfig] = useState<{
    message: string;
    description: string;
    placement: NotificationPlacement;
    type: NotificationType;
    autoCloseDuration: number;
  } | null>(null);

  const [api, contextHolder] = notification.useNotification();
  const [canClockIn, setCanClockIn] = useState(false);
  const [needClockOut, setNeedClockOut] = useState(false);
  const [note, setNote] = useState("");
  const [isAddingShift, setIsAddingShift] = useState(false);
  const [dateRange, setDateRange] = useState("1 week"); // State for date range

  const previousDateRange = useRef(dateRange);

  useEffect(() => {
    if (!shifts[0]) {
      setCanClockIn(true);
      setNeedClockOut(false);
      return;
    }
    if (shifts[0].clockOut) {
      setCanClockIn(true);
      setNeedClockOut(false);
    } else {
      setCanClockIn(false);
      setNeedClockOut(true);
    }
  }, [shifts]);

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

  const handleDateRangeSelect = (value: string) => {
    setLoading((prev) => ({ ...prev, shiftsRefetching: true }));
    const endDate = new Date();
    const startDate = new Date();

    switch (value) {
      case "1 week":
        startDate.setDate(endDate.getDate() - 7);
        setDateRange("1 week");
        break;
      case "1 month":
        startDate.setMonth(endDate.getMonth() - 1);
        setDateRange("1 month");
        break;
      case "6 months":
        startDate.setMonth(endDate.getMonth() - 6);
        setDateRange("6 months");
        break;
    }

    handleDateRangeChange(startDate, endDate)
      .then(() => {
        setLoading((prev) => ({ ...prev, shiftsRefetching: false }));
        previousDateRange.current = value; // Update the ref on successful change
        setDateRange(value);
      })
      .catch((error) => {
        console.error("Error fetching shifts", error);
        setLoading((prev) => ({ ...prev, shiftsRefetching: false }));
        notification.error({
          message: "Error fetching shifts",
          description: error.message,
          placement: "topRight",
          duration: 0,
        });
        setDateRange(previousDateRange.current); // Revert to previous date range on error
      });
  };

  const isWithinRange = ({
    absLat,
    absLong,
    absRadius,
    userLat,
    userLong,
  }: {
    absLat: number;
    absLong: number;
    absRadius: number;
    userLat: number;
    userLong: number;
  }) => {
    const R = 6371; // Radius of the Earth in Kms.
    const toRad = (angle: number) => (angle * Math.PI) / 180;

    const dLat = toRad(userLat - absLat);
    const dLon = toRad(userLong - absLong);

    // Haversine formula
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(absLat)) *
        Math.cos(toRad(userLat)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c; // distance in Kms.

    console.log("Distance", distance);
    console.log("Radius", absRadius);

    return distance <= absRadius;
  };

  const handleGeolocationSuccess = async (position: GeolocationPosition) => {
    if (!location) {
      setNotificationConfig({
        message: "Location data is unavailable",
        description: "Please ensure location services are enabled.",
        placement: "topRight",
        type: "error",
        autoCloseDuration: 5,
      });
      setIsAddingShift(false);
      setLoading((prev) => ({ ...prev, clockInOut: false }));
      return;
    }

    const { latitude, longitude } = position.coords;
    const isUserInRange = isWithinRange({
      absLat: location.latitude,
      absLong: location.longitude,
      absRadius: location.radius,
      userLat: latitude,
      userLong: longitude,
    });

    if (isUserInRange) {
      console.log("User is in the location range");
      try {
        await handleClockIn(note);
        setNotificationConfig({
          message: "Success",
          description: "Clocked in successfully",
          placement: "topLeft",
          type: "success",
          autoCloseDuration: 3,
        });
        setNote("");
        setIsAddingShift(false);
        setLoading((prev) => ({ ...prev, clockInOut: false }));
        return;
      } catch (error) {
        console.log("Error clocking in:", error);
        setNotificationConfig({
          message: "Error",
          description: "Failed to clock in",
          placement: "topLeft",
          type: "error",
          autoCloseDuration: 5,
        });
        setIsAddingShift(false);
        setLoading((prev) => ({ ...prev, clockInOut: false }));
        return;
      } finally {
        setIsAddingShift(false);
        setLoading((prev) => ({ ...prev, clockInOut: false }));
      }
    } else {
      setNotificationConfig({
        message: "You are not in the location range",
        description: "Try moving to the location and try again",
        placement: "topLeft",
        type: "error",
        autoCloseDuration: 5,
      });
      setIsAddingShift(false);
      setLoading((prev) => ({ ...prev, clockInOut: false }));
    }
  };

  const handleGeolocationError = (error: GeolocationPositionError) => {
    setNotificationConfig({
      message: "Error getting your position",
      description:
        "Check if you have provided location permission or try using a different browser",
      placement: "topRight",
      type: "error",
      autoCloseDuration: 0,
    });
    console.error("Error getting position:", error);
    setIsAddingShift(false);
    setLoading((prev) => ({ ...prev, clockInOut: false }));
  };

  const clockIn = async () => {
    setLoading((prev) => ({ ...prev, clockInOut: true }));
    setIsAddingShift(true);
    if (location && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        handleGeolocationSuccess,
        handleGeolocationError
      );
    } else {
      setNotificationConfig({
        message: "Error getting your position",
        description: "Try using a different browser",
        placement: "topRight",
        type: "error",
        autoCloseDuration: 0,
      });
      setLoading((prev) => ({ ...prev, clockInOut: false }));
      setIsAddingShift(false);
    }
  };

  const clockOut = async () => {
    setLoading((prev) => ({ ...prev, clockInOut: true }));
    try {
      await handleClockOut(shifts[0]?.id, note);
      setNotificationConfig({
        message: "Success",
        description: "Clocked out successfully",
        placement: "topLeft",
        type: "success",
        autoCloseDuration: 3,
      });
      setNote("");
      setLoading((prev) => ({ ...prev, clockInOut: false }));
    } catch (error) {
      console.log("Error clocking out:", error);
      setNotificationConfig({
        message: "Error",
        description: "Failed to clock out",
        placement: "topLeft",
        type: "error",
        autoCloseDuration: 5,
      });
      setLoading((prev) => ({ ...prev, clockInOut: false }));
    }
  };

  const handleRowClick = (shift: Shift) => {
    setSelectedShift(shift);
    setIsModalVisible(true);
  };

  const handleModalClose = () => {
    setIsModalVisible(false);
    setSelectedShift(null);
  };

  const formatText = (text: string) => {
    if (!text) return "-";
    return text.length > 20 ? `${text.substring(0, 20)}...` : text;
  };

  const columns = [
    {
      title: "Date",
      dataIndex: "clockIn",
      key: "clockIn",
      render: (text: string) => moment(text).format("YYYY-MM-DD"),
    },
    {
      title: "Clock In Time",
      dataIndex: "clockIn",
      key: "clockInTime",
      render: (text: string) => moment(text).format("HH:mm"),
    },
    {
      title: "Clock In Note",
      dataIndex: "clockInNote",
      key: "clockInNote",
      render: (text: string) => formatText(text),
    },
    {
      title: "Clock Out Time",
      dataIndex: "clockOut",
      key: "clockOutTime",
      render: (text: string) => (text ? moment(text).format("HH:mm") : "-"),
    },
    {
      title: "Clock Out Note",
      dataIndex: "clockOutNote",
      key: "clockOutNote",
      render: (text: string) => formatText(text),
    },
    {
      title: "Action",
      key: "action",
      render: (_: unknown, record: Shift) => (
        <Button onClick={() => handleRowClick(record)}>+</Button>
      ),
    },
  ];

  const renderContent = () => {
    if (loading.shifts) {
      return <Skeleton active paragraph={{ rows: 4 }} />;
    } else if (error.shifts) {
      return <div>Error fetching shifts</div>;
    } else if (canClockIn || needClockOut) {
      return (
        <>
          <Flex
            justify="space-between"
            align="center"
            style={{ marginBottom: 16 }}
          >
            <h1>Shifts</h1>
            <Flex justify="flex-end" gap={12} align="center">
              <Select
                defaultValue={dateRange}
                style={{ width: 120, marginRight: 12 }}
                onChange={handleDateRangeSelect}
              >
                <Option value="1 week">1 Week</Option>
                <Option value="1 month">1 Month</Option>
                <Option value="6 months">6 Months</Option>
              </Select>
              <Input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Add a note (optional)"
                style={{ maxWidth: 300 }}
              />
              {shifts[0]?.clockOut ? (
                <Button
                  type="primary"
                  onClick={clockIn}
                  loading={loading.clockInOut}
                >
                  Clock In
                </Button>
              ) : (
                <Button
                  type="primary"
                  onClick={clockOut}
                  loading={loading.clockInOut}
                >
                  Clock Out
                </Button>
              )}
            </Flex>
          </Flex>
          <Table
            columns={columns}
            loading={loading.shiftsRefetching}
            dataSource={isAddingShift ? [placeholderShift, ...shifts] : shifts}
            rowKey="id"
            pagination={{ pageSize: 10 }}
          />
        </>
      );
    } else {
      return null;
    }
  };

  return (
    <div>
      {contextHolder}
      {renderContent()}
      <Modal
        title="Shift Details"
        open={isModalVisible}
        onCancel={handleModalClose}
        footer={null}
      >
        {selectedShift && (
          <div>
            <p>
              <strong>Date:</strong>{" "}
              {moment(selectedShift.clockIn).format("YYYY-MM-DD")}
            </p>
            <p>
              <strong>Clock In Time:</strong>{" "}
              {moment(selectedShift.clockIn).format("HH:mm")}
            </p>
            <p>
              <strong>Clock In Note:</strong> {selectedShift.clockInNote ?? "-"}
            </p>
            <p>
              <strong>Clock Out Time:</strong>{" "}
              {selectedShift.clockOut
                ? moment(selectedShift.clockOut).format("HH:mm")
                : "-"}
            </p>
            <p>
              <strong>Clock Out Note:</strong>{" "}
              {selectedShift.clockOutNote ?? "-"}
            </p>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default Shifts;
