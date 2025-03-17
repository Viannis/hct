"use client";

import React, { useState, useEffect } from "react";
import { Input, Table, Button, Modal, Flex, notification } from "antd";
import { useQuery, useMutation } from "@apollo/client";
import { useUser } from "@auth0/nextjs-auth0/client";
import { Shift } from "@prisma/client";
import type { NotificationArgsProps } from "antd";
import { GET_SHIFTS, GET_LOCATION } from "@utils/queries";
import { CLOCK_OUT, CLOCK_IN } from "@utils/mutations";
import moment from "moment";
import axios from "axios";

type NotificationPlacement = NotificationArgsProps["placement"];
type NotificationType = "success" | "info" | "warning" | "error";

const Shifts = () => {
  const {
    data: locationData,
    loading: fetchingLocation,
    error: errorFetchingLocation,
  } = useQuery(GET_LOCATION);
  const { user, isLoading: userLoading, error: userError } = useUser();
  const {
    data: shiftsData,
    loading: shiftsDataLoading,
    error: shiftsDataError,
  } = useQuery(GET_SHIFTS, {
    variables: { userId: user?.sub },
    skip: !user, // Skip the query if user is not available
  });
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
  const [hasLocationSet, setHasLocationSet] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [canClockIn, setCanClockIn] = useState(false);
  const [needClockOut, setNeedClockOut] = useState(false);
  const [currentShift, setCurrentShift] = useState<Shift | null>(null);
  const [note, setNote] = useState("");
  const [isClockInOutLoading, setIsClockInOutLoading] = useState(false);

  const [clockInMutation] = useMutation(CLOCK_IN, {
    update(cache, { data: { clockIn } }) {
      const { shifts } = cache.readQuery({
        query: GET_SHIFTS,
        variables: { userId: user?.sub },
      }) as { shifts: Shift[] };

      cache.writeQuery({
        query: GET_SHIFTS,
        variables: { userId: user?.sub },
        data: { shifts: [clockIn, ...shifts] },
      });
    },
  });

  const [clockOutMutation] = useMutation(CLOCK_OUT, {
    update(cache, { data: { clockOut } }) {
      const { shifts } = cache.readQuery({
        query: GET_SHIFTS,
        variables: { userId: user?.sub },
      }) as { shifts: Shift[] };

      cache.writeQuery({
        query: GET_SHIFTS,
        variables: { userId: user?.sub },
        data: {
          shifts: shifts.map((shift) =>
            shift.id === clockOut.id ? clockOut : shift
          ),
        },
      });
    },
  });

  useEffect(() => {
    const fetchLocationStatus = async () => {
      try {
        const response = await axios.get("/api/has-location-set");
        const data = response.data;
        console.log(data);

        if (data.hasLocationSet) {
          setHasLocationSet(true);
        } else {
          setHasLocationSet(false);
        }
      } catch (error) {
        console.error("Error fetching location status:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchLocationStatus();
  }, []);

  useEffect(() => {
    console.log("Shifts data:", shiftsData);
    setCurrentShift(shiftsData?.shifts[0] ?? null);
    if (!shiftsData?.shifts[0]) {
      setCanClockIn(true);
      setNeedClockOut(false);
      return;
    }
    if (shiftsData?.shifts[0].clockOut) {
      setCanClockIn(true);
      setNeedClockOut(false);
    } else {
      setCanClockIn(false);
      setNeedClockOut(true);
    }
  }, [shiftsData]);

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

  if (fetchingLocation || userLoading || shiftsDataLoading) {
    return <div>Loading...</div>;
  }

  if (errorFetchingLocation) {
    return <div>Error loading location: {errorFetchingLocation.message}</div>;
  }

  if (userError) {
    return <div>Error loading user: {userError.message}</div>;
  }

  if (shiftsDataError) {
    return <div>Error loading shifts: {shiftsDataError.message}</div>;
  }

  if (!locationData?.location) {
    return (
      <div>
        Shifts can only be clocked in after your manager sets up a location
      </div>
    );
  }

  const handleClockIn = async () => {
    setIsClockInOutLoading(true);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          try {
            const config = {
              params: {
                latitude,
                longitude,
              },
            };
            const isUserInRangeResponse = await axios.get(
              "/api/verify-location-range",
              config
            );
            const isUserInRange = isUserInRangeResponse.data.isUserInRange;
            if (isUserInRange) {
              console.log("User is in the location range");
              try {
                await clockInMutation({
                  variables: {
                    input: {
                      note: note,
                    },
                  },
                });

                setNotificationConfig({
                  message: "Success",
                  description: "Clocked in successfully",
                  placement: "topLeft",
                  type: "success",
                  autoCloseDuration: 3,
                });
                setIsClockInOutLoading(false);
                setNote("");
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
              }
              setIsClockInOutLoading(false);
              return;
            }
            setNotificationConfig({
              message: "Your are not in the location range",
              description: "Try moving to the location and try again",
              placement: "topLeft",
              type: "error",
              autoCloseDuration: 5,
            });
            console.log(isUserInRangeResponse.data);
            setIsClockInOutLoading(false);
            return;
          } catch (error) {
            console.log("Error verifying location", error);
            setIsClockInOutLoading(false);
            return;
          }
        },
        (error) => {
          if (error.code === error.PERMISSION_DENIED) {
            navigator.geolocation.getCurrentPosition(
              async (position) => {
                const { latitude, longitude } = position.coords;
                try {
                  const config = {
                    params: {
                      latitude,
                      longitude,
                    },
                  };
                  const isUserInRangeResponse = await axios.get(
                    "/api/verify-location-range",
                    config
                  );
                  const isUserInRange =
                    isUserInRangeResponse.data.isUserInRange;
                  if (isUserInRange) {
                    console.log("User is in the location range");
                    try {
                      await clockInMutation({
                        variables: {
                          input: {
                            note: note,
                          },
                        },
                      });

                      setNotificationConfig({
                        message: "Success",
                        description: "Clocked in successfully",
                        placement: "topLeft",
                        type: "success",
                        autoCloseDuration: 3,
                      });
                      setIsClockInOutLoading(false);
                      setNote("");
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
                    }
                    setIsClockInOutLoading(false);
                    return;
                  }
                  setNotificationConfig({
                    message: "Your are not in the location range",
                    description: "Try moving to the location and try again",
                    placement: "topLeft",
                    type: "error",
                    autoCloseDuration: 5,
                  });
                  console.log(isUserInRangeResponse.data);
                  setIsClockInOutLoading(false);
                  return;
                } catch (error) {
                  console.log("Error verifying location", error);
                  setIsClockInOutLoading(false);
                  return;
                }
              },
              (error) => {
                setNotificationConfig({
                  message: "Error getting position",
                  description:
                    "Try different browser or check location settings",
                  placement: "topLeft",
                  type: "error",
                  autoCloseDuration: 0,
                });
                console.error(
                  "Error getting position after requesting permission:",
                  error
                );
                setIsClockInOutLoading(false);
              }
            );
          } else {
            setNotificationConfig({
              message: "Error getting your position",
              description:
                "Check if you have provided location permission or try using a different browser",
              placement: "topRight",
              type: "error",
              autoCloseDuration: 0,
            });
            console.error("Error getting position:", error);
            setIsClockInOutLoading(false);
          }
        }
      );
    } else {
      setNotificationConfig({
        message: "Error getting your position",
        description: "Try using a different browser",
        placement: "topRight",
        type: "error",
        autoCloseDuration: 0,
      });
      setIsClockInOutLoading(false);
    }
  };

  const handleClockOut = async () => {
    setIsClockInOutLoading(true);
    console.log("Current shift:", currentShift?.id);
    if (!currentShift?.id) {
      setNotificationConfig({
        message: "Error",
        description: "No shift found to clock out",
        placement: "topRight",
        type: "error",
        autoCloseDuration: 0,
      });
      setNote("");
      setIsClockInOutLoading(false);
      return;
    }

    try {
      await clockOutMutation({
        variables: {
          input: {
            id: currentShift.id,
            note: note,
          },
        },
      });

      setNotificationConfig({
        message: "Success",
        description: "Clocked out successfully",
        placement: "topRight",
        type: "success",
        autoCloseDuration: 3,
      });
      setIsClockInOutLoading(false);
      setNote("");
      return;
    } catch (error) {
      console.log("Error clocking out:", error);
      setNotificationConfig({
        message: "Error",
        description: "Failed to clock out",
        placement: "topRight",
        type: "error",
        autoCloseDuration: 0,
      });
      setIsClockInOutLoading(false);
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
    if (isLoading) {
      return <div>Loading...</div>;
    } else if (!hasLocationSet) {
      return (
        <div>Can&apos;t clock in until your manager sets up a location.</div>
      );
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
              <Input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Add a note (optional)"
                style={{ maxWidth: 300 }}
              />
              {canClockIn ? (
                <Button
                  type="primary"
                  onClick={handleClockIn}
                  loading={isClockInOutLoading}
                >
                  Clock In
                </Button>
              ) : (
                <Button
                  type="primary"
                  onClick={handleClockOut}
                  loading={isClockInOutLoading}
                >
                  Clock Out
                </Button>
              )}
            </Flex>
          </Flex>
          <Table
            columns={columns}
            dataSource={shiftsData?.shifts}
            rowKey="id"
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
