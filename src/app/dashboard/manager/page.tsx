"use client";

import { useState, useEffect, useRef } from "react";
import { useUserLocation } from "./context/UserLocationContext";
import {
  Table,
  Switch,
  Flex,
  Modal,
  Button,
  Skeleton,
  Row,
  Col,
  Select,
  notification,
} from "antd";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  Colors,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import moment from "moment";
import jsPDF from "jspdf";
import { Parser } from "json2csv";
import ButtonGroup from "antd/es/button/button-group";
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Colors,
  Tooltip,
  Legend
);
import Stats from "./components/Stats";

type TableShift = {
  id: string;
  uniqueId: string;
  userId: string;
  clockIn: Date;
  clockOut: Date | null;
  clockInNote: string;
  clockOutNote: string;
  userName: string;
};

const { Option } = Select;

export default function ManagerDashboard() {
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
      setShiftsLoading(false);
      setActiveShifts(activeShiftData);
      setCompletedShifts(completedShiftData);
    }
    if (error.shifts) {
      console.error("Error fetching shifts:", error.shifts);
      setShiftsError(true);
    }
  }, [error.shifts, loading.shifts, shiftsData]);

  const handleDateRangeSelect = (value: string) => {
    // Handle the date range select
    setShiftsRefetching(true);
    const endDate = new Date();
    const startDate = new Date();

    switch (value) {
      case "Today":
        startDate.setDate(endDate.getDate() - 7);
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
    // Handle for exporting the data as PDF or CSV
    try {
      if (format === "PDF") {
        const doc = new jsPDF();
        const pageSize = 5; // Number of rows per page
        let y = 10;

        previewData.forEach((shift, index) => {
          if (index > 0 && index % pageSize === 0) {
            // Add a new page if the number of rows is greater than the page size
            doc.addPage();
            y = 10;
          }
          doc.text(`Name: ${shift.userName}`, 10, y); // Add the name of the shift to the PDF
          doc.text(
            `Clock In: ${moment(shift.clockIn).format("YYYY-MM-DD HH:mm")}`,
            10,
            y + 10
          );
          if (shift.clockOut) {
            doc.text(
              `Clock Out: ${moment(shift.clockOut).format("YYYY-MM-DD HH:mm")}`,
              10,
              y + 20
            );
          }
          y += 30;
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
      notification.success({
        message: "Export Successful",
        description: `Shifts exported as ${format}`,
        placement: "topRight",
      });
    } catch (error) {
      console.error("Error exporting shifts", error);
      notification.error({
        message: "Export Failed",
        description: `Failed to export shifts as ${format}`,
        placement: "topRight",
      });
    } finally {
      setPreviewModalOpen(false);
    }
  };

  const renderPDFPreview = (data: TableShift[]) => {
    // Render the PDF preview
    const maxRows = 10; // Maximum number of rows to display
    const displayData = data.length > maxRows ? data.slice(0, maxRows) : data;

    // Add a placeholder row if there are more than 10 rows
    if (data.length > maxRows) {
      displayData.push({
        id: "placeholder",
        userId: "",
        clockIn: new Date(),
        clockOut: null,
        clockInNote: "",
        clockOutNote: "",
        userName: "...", // Placeholder for the dummy row
        uniqueId: "",
      });
    }

    const columns = [
      // Columns for the PDF preview
      { title: "Name", dataIndex: "userName", key: "name" },
      {
        title: "Clock In",
        dataIndex: "clockIn",
        key: "clockIn",
        render: (text: string) => moment(text).format("YYYY-MM-DD HH:mm"),
      },
      {
        title: "Clock Out",
        dataIndex: "clockOut",
        key: "clockOut",
        render: (text: string) =>
          text ? moment(text).format("YYYY-MM-DD HH:mm") : "-",
      },
      { title: "Clock In Note", dataIndex: "clockInNote", key: "clockInNote" },
      {
        title: "Clock Out Note",
        dataIndex: "clockOutNote",
        key: "clockOutNote",
      },
    ];

    return (
      // Render the PDF preview
      <div>
        <Flex justify="space-between" align="center" style={{ marginTop: 24 }}>
          <ButtonGroup>
            <Button onClick={() => confirmExport("PDF")}>Export PDF</Button>
            <Button onClick={() => confirmExport("CSV")}>Export CSV</Button>
          </ButtonGroup>
        </Flex>
        <Table
          style={{ marginTop: 24, marginBottom: 24 }}
          columns={columns}
          dataSource={displayData}
          pagination={false}
          rowKey={(record) =>
            record.id === "placeholder"
              ? "placeholder"
              : `${record.id}-${record.clockIn}`
          } // Ensure unique key
        />
      </div>
    );
  };

  const renderContent = () => {
    // Render the content of the page based on the loading and error states
    if (shiftsLoading) {
      return <Skeleton active paragraph={{ rows: 4 }} />;
    } else if (shiftsError) {
      return <div>Error fetching shifts</div>;
    } else if (shiftsData?.allShifts) {
      return (
        <div>
          <Stats />
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
                  <h2>
                    {tableIsActive ? "Active Shifts" : "Completed Shifts"}
                  </h2>
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
                    <Button
                      type="primary"
                      onClick={() => handleExportPreview()}
                    >
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
                loading={shiftsRefetching}
                rowKey={(record) => record.id}
                style={{ marginTop: 24 }}
                scroll={{ x: "max-content" }}
              />
            ) : (
              // Render the completed shifts table
              <Table
                columns={columnsCompleted}
                dataSource={completedShifts}
                loading={shiftsRefetching}
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
                  <strong>Clock In Note:</strong>{" "}
                  {selectedShift.clockInNote ?? "-"}
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
            {renderPDFPreview(previewData)}
          </Modal>
        </div>
      );
    }
  };

  return renderContent();
}
