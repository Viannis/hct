"use client";

import { useState, useEffect, useRef } from "react";
import {
  Table,
  Button,
  Flex,
  notification,
  Select,
  Row,
  Col,
  Modal,
  Switch,
} from "antd";
import { useUserLocation } from "../context/UserLocationContext";
import type { NotificationArgsProps } from "antd";

export type TableShift = {
  id: string;
  uniqueId: string;
  userId: string;
  clockIn: Date;
  clockOut: Date | null;
  clockInNote: string;
  clockOutNote: string;
  userName: string;
};
import moment from "moment";
import jsPDF from "jspdf";
import { Parser } from "json2csv";
import PDFPreviewExport from "./PDFPreviewExport";
import { autoTable } from "jspdf-autotable";

const { Option } = Select;
type NotificationPlacement = NotificationArgsProps["placement"];
type NotificationType = "success" | "info" | "warning" | "error";

export default function ActiveCompletedCareTakers() {
  const { shiftsData, loading, error, handleDateRangeChange } =
    useUserLocation();
  const [activeShifts, setActiveShifts] = useState<TableShift[]>([]);
  const [shiftsRefetching, setShiftsRefetching] = useState(false);
  const [shiftsLoading, setShiftsLoading] = useState(true);
  const [shiftsError, setShiftsError] = useState(false);
  const [tableIsActive, setTableIsActive] = useState(true);
  const [completedShifts, setCompletedShifts] = useState<TableShift[]>([]);
  const [dateRange, setDateRange] = useState("Today"); // State for date range
  const previousDateRange = useRef(dateRange);
  const [previewData, setPreviewData] = useState<TableShift[]>([]);
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [notificationConfig, setNotificationConfig] = useState<{
    message: string;
    description: string;
    placement: NotificationPlacement;
    type: NotificationType;
    autoCloseDuration: number;
  } | null>(null);

  const [api, contextHolder] = notification.useNotification(); // Notification API Ant Design

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
    if (!loading.shifts && shiftsData?.allShifts) {
      console.log("Shifts today:", shiftsData.allShifts);
      const active = shiftsData.allShifts.filter(
        // Filter the shifts to get the active shifts
        (shift) => !shift.clockOut
      );
      const completed = shiftsData.allShifts.filter(
        // Filter the shifts to get the completed shifts
        (shift) => shift.clockOut
      );
      const activeShiftData: TableShift[] = active.map((shift) => ({
        id: shift.id,
        userId: shift.user.id,
        clockIn: shift.clockIn,
        clockOut: shift.clockOut,
        clockInNote: shift.clockInNote,
        clockOutNote: shift.clockOutNote,
        userName: shift.user.name,
        uniqueId: `${shift.id}-${shift.clockIn}`, // Generate uniqueId once to avoid duplicate keys when eport preview table is rendered in a modal over the same the table rendered in the page
      }));
      const completedShiftData: TableShift[] = completed.map((shift) => ({
        id: shift.id,
        userId: shift.user.id,
        clockIn: shift.clockIn,
        clockOut: shift.clockOut,
        clockInNote: shift.clockInNote,
        clockOutNote: shift.clockOutNote,
        userName: shift.user.name,
        uniqueId: `${shift.id}-${shift.clockIn}`, // Generate uniqueId once
      }));
      setActiveShifts(activeShiftData);
      setCompletedShifts(completedShiftData);
      setShiftsLoading(false);
    }
    if (error.shifts) {
      console.error("Error fetching shifts:", error.shifts);
      setShiftsError(true);
    }
  }, [error.shifts, loading.shifts, shiftsData]);

  useEffect(() => {
    if (shiftsError) {
      setNotificationConfig({
        message: "Error fetching shifts",
        description: "Please try again later",
        placement: "topRight",
        type: "error",
        autoCloseDuration: 5,
      });
    }
  }, [shiftsError]);

  const handleDateRangeSelect = (value: string) => {
    // Handle the date range select
    setShiftsRefetching(true);
    const endDate = new Date();
    const startDate = new Date();
    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(23, 59, 59, 999);

    switch (value) {
      case "Today":
        setDateRange("Today");
        break;
      case "1 week":
        startDate.setDate(endDate.getDate() - 7);
        setDateRange("1 week");
        break;
      case "1 month":
        startDate.setMonth(endDate.getMonth() - 1);
        setDateRange("1 month");
        break;
      case "3 months":
        startDate.setMonth(endDate.getMonth() - 3);
        setDateRange("3 months");
        break;
    }

    handleDateRangeChange(startDate, endDate)
      .then(() => {
        setShiftsRefetching(false);
        previousDateRange.current = value;
        setDateRange(value);
      })
      .catch((error) => {
        console.error("Error fetching shifts", error);
        setShiftsRefetching(false);
        setDateRange(previousDateRange.current);
      });
  };

  const formatText = (text: string) => {
    // Format the text to be displayed in the table
    if (!text) return "-";
    return text.length > 20 ? `${text.substring(0, 20)}...` : text;
  };

  const columnsCompleted = [
    // Columns for the completed shifts table
    {
      title: "Name",
      dataIndex: "userName",
      key: "name",
    },
    {
      title: "Clock In Time",
      dataIndex: "clockIn",
      key: "clockIn",
      render: (text: string) => moment(text).format("YYYY-MM-DD (HH:mm)"),
    },
    {
      title: "Clock Out Time",
      dataIndex: "clockOut",
      key: "clockOut",
      render: (text: string) => moment(text).format("YYYY-MM-DD (HH:mm)"),
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
      render: (_: unknown, record: TableShift) => (
        <Button onClick={() => handleModalOpen(record)}>+</Button>
      ),
    },
  ];

  const columnsActive = [
    // Columns for the active shifts table
    {
      title: "Name",
      dataIndex: "userName",
      key: "name",
    },
    {
      title: "Clock In Time",
      dataIndex: "clockIn",
      key: "clockIn",
      render: (text: string) => moment(text).format("YYYY-MM-DD (HH:mm)"),
    },
    {
      title: "Clock In Note",
      dataIndex: "clockInNote",
      key: "clockInNote",
      render: (text: string) => formatText(text),
    },
    {
      title: "Action",
      key: "action",
      render: (_: unknown, record: TableShift) => (
        <Button onClick={() => handleModalOpen(record)}>+</Button>
      ),
    },
  ];

  const [modalOpen, setModalOpen] = useState(false);
  const [selectedShift, setSelectedShift] = useState<TableShift | null>(null);

  const handleModalOpen = (shift: TableShift) => {
    // Open the modal to view the shift details
    setSelectedShift(shift);
    setModalOpen(true);
  };

  const handleModalClose = () => {
    // Close the modal
    setSelectedShift(null);
    setModalOpen(false);
  };

  const handleExportPreview = () => {
    // Handle for passing the currently selected filtered data for export preview
    const data = tableIsActive ? activeShifts : completedShifts;
    setPreviewData(data);
    setPreviewModalOpen(true);
  };

  const handlePreviewModalClose = () => {
    // Handle for closing the export preview modal
    setPreviewData([]);
    setPreviewModalOpen(false);
  };

  const confirmExport = (format: string) => {
    if (previewData.length === 0) {
      console.log("No data to export");
      setNotificationConfig({
        message: "No data to export",
        description: "Please select a date range and try again",
        placement: "topRight",
        type: "error",
        autoCloseDuration: 5,
      });
      return;
    }
    // Handle for exporting the data as PDF or CSV
    try {
      if (format === "PDF") {
        const doc = new jsPDF();

        autoTable(doc, {
          head: [["Name", "Clock In Time", "Clock Out Time", "Clock Out Note"]],
          body: previewData.map((shift) => [
            shift.userName,
            moment(shift.clockIn).format("YYYY-MM-DD HH:mm"),
            shift.clockOut
              ? moment(shift.clockOut).format("YYYY-MM-DD HH:mm")
              : "",
            shift.clockOutNote,
          ]),
        });

        doc.save("shifts.pdf");
      } else if (format === "CSV") {
        // Export the data as CSV
        const parser = new Parser();
        const csv = parser.parse(previewData);
        const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", "shifts.csv");
        link.style.visibility = "hidden";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
      setNotificationConfig({
        message: "Export Successful",
        description: `Shifts exported as ${format}`,
        placement: "topRight",
        type: "success",
        autoCloseDuration: 5,
      });
    } catch (error) {
      console.error("Error exporting shifts", error);
      setNotificationConfig({
        message: "Export Failed",
        description: `Failed to export shifts as ${format}`,
        placement: "topRight",
        type: "error",
        autoCloseDuration: 5,
      });
    } finally {
      setPreviewModalOpen(false);
    }
  };

  return (
    <>
      {contextHolder}
      <div
        style={{
          marginTop: 48,
          paddingTop: 24,
          borderTop: "1px solid #f0f0f0",
        }}
      >
        <Row gutter={[16, 16]} justify="space-between" align="top">
          <Col xs={24} sm={12}>
            <Flex gap={12}>
              <h2>{tableIsActive ? "Active Shifts" : "Completed Shifts"}</h2>
              <Switch defaultChecked onChange={setTableIsActive} />{" "}
              {/* Switch for toggling between active and completed shifts */}
            </Flex>
          </Col>
          <Col xs={24} sm={12}>
            <Row justify="end" gutter={[12, 12]} align="top">
              <Col>
                <Select // Select for the date range for the table
                  defaultValue={dateRange}
                  style={{ width: 120, marginRight: 12 }}
                  onChange={handleDateRangeSelect}
                >
                  <Option value="Today">Today</Option>
                  <Option value="1 week">1 Week</Option>
                  <Option value="1 month">1 Month</Option>
                  <Option value="3 months">3 Months</Option>
                </Select>
              </Col>
              <Col>
                <Button type="primary" onClick={() => handleExportPreview()}>
                  Export
                </Button>
              </Col>
            </Row>
          </Col>
        </Row>
        {tableIsActive ? ( // Render the active shifts table
          <Table
            columns={columnsActive}
            dataSource={activeShifts}
            loading={shiftsRefetching || shiftsLoading}
            rowKey={(record) => record.id}
            style={{ marginTop: 24 }}
            scroll={{ x: "max-content" }}
          />
        ) : (
          // Render the completed shifts table
          <Table
            columns={columnsCompleted}
            dataSource={completedShifts}
            loading={shiftsRefetching || shiftsLoading}
            rowKey={(record) => record.id}
            style={{ marginTop: 24 }}
            scroll={{ x: "max-content" }}
          />
        )}
      </div>
      <Modal // Modal for viewing the shift details
        open={modalOpen}
        onCancel={handleModalClose}
        footer={null}
        width={600}
      >
        {selectedShift && (
          <div>
            <p>
              <strong>Name:</strong> {selectedShift.userName}
            </p>
            <p>
              <strong>Clock In Time:</strong>{" "}
              {moment(selectedShift.clockIn).format("YYYY-MM-DD HH:mm")}
            </p>
            <p>
              <strong>Clock In Note:</strong> {selectedShift.clockInNote ?? "-"}
            </p>
            <p>
              <strong>Clock Out Time:</strong>{" "}
              {selectedShift.clockOut
                ? moment(selectedShift.clockOut).format("YYYY-MM-DD HH:mm")
                : "-"}
            </p>
            <p>
              <strong>Clock Out Note:</strong>{" "}
              {selectedShift.clockOutNote ?? "-"}
            </p>
          </div>
        )}
      </Modal>
      <Modal // Modal for previewing the export
        open={previewModalOpen}
        onCancel={handlePreviewModalClose}
        footer={null}
        width={800}
      >
        <h2>Preview of Page 1</h2>
        <PDFPreviewExport data={previewData} confirmExport={confirmExport} />
      </Modal>
    </>
  );
}
