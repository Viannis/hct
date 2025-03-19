"use client";

import { useState, useEffect, useRef } from "react";
import { useQuery } from "@apollo/client";
import { GET_ALL_SHIFTS, GET_HOURS_PER_DATE_RANGE } from "@utils/queries";
import { useUserLocation } from "./context/UserLocationContext";
import {
  Card,
  Row,
  Col,
  Table,
  Switch,
  Flex,
  Modal,
  Typography,
  Button,
  Skeleton,
  Select,
  notification,
} from "antd";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { Line } from "react-chartjs-2";
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
  Tooltip,
  Legend
);

type DailyTotal = {
  date: string;
  hours: number;
};

type UserDailyHours = {
  userId: string;
  userName: string;
  dailyTotals: DailyTotal[];
};

const { Title: TitleText } = Typography;
type Shift = {
  id: string;
  user: {
    id: string;
    name: string;
  };
  clockIn: Date;
  clockOut: Date;
  clockInNote: string;
  clockOutNote: string;
};

type TableShift = {
  id: string;
  userId: string;
  clockIn: Date;
  clockOut: Date | null;
  clockInNote: string;
  clockOutNote: string;
  userName: string;
};

const { Option } = Select;

export default function ManagerDashboard() {
  const { user } = useUserLocation();
  const startDate = new Date();
  startDate.setHours(0, 0, 0, 0);
  const endDate = new Date();
  endDate.setHours(23, 59, 59, 999);
  const {
    data: shiftsData,
    loading: shiftsLoading,
    error: shiftsError,
    refetch: refetchAllShifts,
  } = useQuery(GET_ALL_SHIFTS, {
    skip: !user,
  });
  const {
    data: hoursPerDateRangeData,
    loading: hoursPerDateRangeLoading,
    error: hoursPerDateRangeError,
  } = useQuery(GET_HOURS_PER_DATE_RANGE, {
    variables: {
      dateRange: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      },
    },
    skip: !user,
  });
  const [activeShifts, setActiveShifts] = useState<TableShift[]>([]);
  const [shiftsRefetching, setShiftsRefetching] = useState(false);
  const [tableIsActive, setTableIsActive] = useState(true);
  const [completedShifts, setCompletedShifts] = useState<TableShift[]>([]);
  const [shiftsCompletedCount, setShiftsCompletedCount] = useState(0);
  const [activeShiftsCount, setActiveShiftsCount] = useState(0);
  const [dateRange, setDateRange] = useState("Today"); // State for date range
  const previousDateRange = useRef(dateRange);
  const [chartData, setChartData] = useState({
    labels: ["", "", "", "", "", "", ""],
    datasets: [
      {
        label: "Hours Worked",
        data: [0, 0, 0, 0, 0, 0, 0],
        borderColor: "#1890ff",
        tension: 0.1,
      },
    ],
  });

  const [previewData, setPreviewData] = useState<TableShift[]>([]);
  const [previewModalOpen, setPreviewModalOpen] = useState(false);

  useEffect(() => {
    if (shiftsError) {
      console.error("Error fetching shifts:", shiftsError);
    }
    if (!shiftsLoading && shiftsData?.allShifts) {
      console.log("Shifts today:", shiftsData.allShifts);
      const active = shiftsData.allShifts.filter(
        (shift: Shift) => !shift.clockOut
      );
      const completed = shiftsData.allShifts.filter(
        (shift: Shift) => shift.clockOut
      );
      const activeShiftData: TableShift[] = active.map((shift: Shift) => ({
        id: shift.id,
        userId: shift.user.id,
        clockIn: shift.clockIn,
        clockInNote: shift.clockInNote,
        userName: shift.user.name,
        uniqueId: `${shift.id}-${shift.clockIn}`, // Generate uniqueId once
      }));
      const completedShiftData: TableShift[] = completed.map(
        (shift: Shift) => ({
          id: shift.id,
          userId: shift.user.id,
          clockIn: shift.clockIn,
          clockOut: shift.clockOut,
          clockOutNote: shift.clockOutNote,
          userName: shift.user.name,
          uniqueId: `${shift.id}-${shift.clockIn}`, // Generate uniqueId once
        })
      );
      setActiveShifts(activeShiftData);
      setCompletedShifts(completedShiftData);
      setActiveShiftsCount(active.length);
      setShiftsCompletedCount(completed.length);
    }
  }, [shiftsError, shiftsLoading, shiftsData, user]);

  useEffect(() => {
    if (hoursPerDateRangeError) {
      console.error(
        "Error fetching hours per date range:",
        hoursPerDateRangeError
      );
    }
    if (!hoursPerDateRangeLoading && hoursPerDateRangeData?.hoursPerDateRange) {
      console.log("Hours per date range:", hoursPerDateRangeData);

      const labels: string[] = [];
      const dataSets: {
        label: string;
        data: number[];
        borderColor: string;
        tension: number;
      }[] = [];

      hoursPerDateRangeData.hoursPerDateRange.forEach(
        (user: UserDailyHours) => {
          const userHours = user.dailyTotals.map((daily: DailyTotal) => {
            if (!labels.includes(daily.date)) {
              labels.push(daily.date);
            }
            return daily.hours;
          });

          dataSets.push({
            label: user.userName,
            data: userHours,
            borderColor: "#1890ff",
            tension: 0.1,
          });
        }
      );

      setChartData({
        labels,
        datasets: dataSets,
      });
    }
  }, [
    hoursPerDateRangeError,
    hoursPerDateRangeLoading,
    hoursPerDateRangeData,
    user,
  ]);

  const handleDateRangeSelect = (value: string) => {
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

    refetchAllShifts({
      variables: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      },
    })
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
    if (!text) return "-";
    return text.length > 20 ? `${text.substring(0, 20)}...` : text;
  };

  const columnsCompleted = [
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
    setSelectedShift(shift);
    setModalOpen(true);
  };

  const handleModalClose = () => {
    setSelectedShift(null);
    setModalOpen(false);
  };

  const handleExportPreview = () => {
    const data = tableIsActive ? activeShifts : completedShifts;
    setPreviewData(data);
    setPreviewModalOpen(true);
  };

  const handlePreviewModalClose = () => {
    setPreviewData([]);
    setPreviewModalOpen(false);
  };

  const confirmExport = (format: string) => {
    try {
      if (format === "PDF") {
        const doc = new jsPDF();
        const pageSize = 5; // Number of rows per page
        let y = 10;

        previewData.forEach((shift, index) => {
          if (index > 0 && index % pageSize === 0) {
            doc.addPage();
            y = 10;
          }
          doc.text(`Name: ${shift.userName}`, 10, y);
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
      });
    }

    const columns = [
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
    if (shiftsLoading) {
      return <Skeleton active paragraph={{ rows: 4 }} />;
    } else if (shiftsError) {
      return <div>Error fetching shifts</div>;
    } else if (shiftsData?.allShifts) {
      return (
        <div>
          <Row gutter={[16, 16]}>
            <Col span={8}>
              <Card title="Shifts Completed">
                <TitleText level={2}>{shiftsCompletedCount}h</TitleText>
              </Card>
              <Card title="Active Shifts" style={{ marginTop: 16 }}>
                <TitleText level={2}>{activeShiftsCount}</TitleText>
              </Card>
            </Col>
            <Col span={16}>
              <Card title="Hours Worked Today" style={{ height: "100%" }}>
                <Line
                  data={chartData}
                  options={{
                    maintainAspectRatio: false,
                    scales: {
                      y: { grid: { display: false } },
                      x: { grid: { display: false } },
                    },
                    responsive: true,
                  }}
                />
              </Card>
            </Col>
          </Row>
          <div
            style={{
              marginTop: 48,
              paddingTop: 24,
              borderTop: "1px solid #f0f0f0",
            }}
          >
            <Flex justify="space-between" align="center">
              <Flex gap={12}>
                <h2>{tableIsActive ? "Active Shifts" : "Completed Shifts"}</h2>
                <Switch defaultChecked onChange={setTableIsActive} />
              </Flex>
              <Flex>
                <Select
                  defaultValue={dateRange}
                  style={{ width: 120, marginRight: 12 }}
                  onChange={handleDateRangeSelect}
                >
                  <Option value="Today">Today</Option>
                  <Option value="1 week">1 Week</Option>
                  <Option value="1 month">1 Month</Option>
                  <Option value="3 months">3 Months</Option>
                </Select>

                <Button type="primary" onClick={() => handleExportPreview()}>
                  Export
                </Button>
              </Flex>
            </Flex>
            {tableIsActive ? (
              <Table
                columns={columnsActive}
                dataSource={activeShifts}
                loading={shiftsRefetching}
                rowKey={(record) => record.id}
                style={{ marginTop: 24 }}
              />
            ) : (
              <Table
                columns={columnsCompleted}
                dataSource={completedShifts}
                loading={shiftsRefetching}
                rowKey={(record) => record.id}
                style={{ marginTop: 24 }}
              />
            )}
          </div>
          <Modal
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
          <Modal
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
