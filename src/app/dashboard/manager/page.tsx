"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@apollo/client";
import { GET_LOCATION, GET_SHIFTS_TODAY } from "@utils/queries";
import { Card, Row, Col, Table, Alert, Button, Switch, Flex } from "antd";
import { ArrowRightOutlined } from "@ant-design/icons";
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

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

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

type ActiveShift = {
  id: string;
  userId: string;
  clockIn: Date;
  clockInNote: string;
  userName: string;
};

type CompletedShift = {
  id: string;
  userId: string;
  clockIn: Date;
  clockOut: Date;
  clockOutNote: string;
  userName: string;
};

export default function ManagerDashboard() {
  const { data, loading, error } = useQuery(GET_LOCATION);
  const {
    data: shiftsData,
    loading: shiftsLoading,
    error: shiftsError,
  } = useQuery(GET_SHIFTS_TODAY);
  const [activeShifts, setActiveShifts] = useState<ActiveShift[]>([]);
  const [tableIsActive, setTableIsActive] = useState(true);
  const [completedShifts, setCompletedShifts] = useState<CompletedShift[]>([]);
  const [shiftsCompletedCount, setShiftsCompletedCount] = useState(0);
  const [activeShiftsCount, setActiveShiftsCount] = useState(0);
  const [activeStaffCount, setActiveStaffCount] = useState(0);
  const [showLocationSetup, setShowLocationSetup] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (!loading && data?.location) {
      setShowLocationSetup(false);
    }
    if (error) {
      console.error("Error fetching location:", error);
    }
  }, [loading, data, error]);

  useEffect(() => {
    if (shiftsError) {
      console.error("Error fetching shifts:", shiftsError);
    }
    if (!shiftsLoading && shiftsData?.shiftsToday) {
      const active = shiftsData.shiftsToday.filter(
        (shift: Shift) => !shift.clockOut
      );
      const completed = shiftsData.shiftsToday.filter(
        (shift: Shift) => shift.clockOut
      );
      const activeShiftData: ActiveShift[] = active.map((shift: Shift) => ({
        id: shift.id,
        userId: shift.user.id,
        clockIn: shift.clockIn,
        clockInNote: shift.clockInNote,
        userName: shift.user.name,
      }));
      const completedShiftData: CompletedShift[] = completed.map(
        (shift: Shift) => ({
          id: shift.id,
          userId: shift.user.id,
          clockIn: shift.clockIn,
          clockOut: shift.clockOut,
          clockOutNote: shift.clockOutNote,
          userName: shift.user.name,
        })
      );
      setActiveShifts(activeShiftData);
      setCompletedShifts(completedShiftData);
      setActiveShiftsCount(active.length);
      setShiftsCompletedCount(completed.length);
      const activeStaff = new Set(active.map((shift: Shift) => shift.user.id));
      const completedStaff = new Set(
        completed.map((shift: Shift) => shift.user.id)
      );
      setActiveStaffCount(activeStaff.size);
      console.log("Shifts today:", shiftsData.shiftsToday);
      console.log("Active shifts:", activeShiftData);
      console.log("Completed shifts:", completedShiftData);
      console.log("Completed staff:", completedStaff);
      console.log("Active staff:", activeStaff);
    }
  }, [shiftsError, shiftsLoading, shiftsData]);

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
    },
    {
      title: "Clock Out Time",
      dataIndex: "clockOut",
      key: "clockOut",
    },
    {
      title: "Clock Out Note",
      dataIndex: "clockOutNote",
      key: "clockOutNote",
    },
    {
      title: "Action",
      key: "action",
      render: (_: unknown, record: CompletedShift) => (
        <Button
          type="text"
          onClick={() => handleRowClick(record)}
          icon={<ArrowRightOutlined />}
        />
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
    },
    {
      title: "Clock In Note",
      dataIndex: "ClockInNote",
      key: "clockInNote",
    },
    {
      title: "Action",
      key: "action",
      render: (_: unknown, record: ActiveShift) => (
        <Button
          type="text"
          onClick={() => handleRowClick(record)}
          icon={<ArrowRightOutlined />}
        />
      ),
    },
  ];

  const handleRowClick = (caretaker: ActiveShift | CompletedShift) => {
    console.log("Row clicked", caretaker);
    router.push(`/dashboard/manager/caretakers/${caretaker.userId}`);
    // redirect to caretaker page
  };

  return (
    <div>
      {showLocationSetup && (
        <Alert
          message="Location Setup Required"
          description="Please set up the location and perimeter for staff clock-in."
          type="warning"
          showIcon
          action={
            <Button
              type="primary"
              onClick={() =>
                router.push("/dashboard/manager/settings/location")
              }
            >
              Go to Location Settings
            </Button>
          }
          style={{ marginBottom: 24 }}
        />
      )}

      <Row gutter={[16, 16]}>
        <Col span={8}>
          <Card title="Shifts Completed">
            <h2>{shiftsCompletedCount}h</h2>
          </Card>
        </Col>
        <Col span={8}>
          <Card title="Active Shifts">
            <h2>{activeShiftsCount}</h2>
          </Card>
        </Col>
        <Col span={8}>
          <Card title="Active Caretakers">
            <h2>{activeStaffCount}h</h2>
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
        <Flex gap={12}>
          <h2>{tableIsActive ? "Active Shifts" : "Completed Shifts"}</h2>
          <Switch defaultChecked onChange={setTableIsActive} />
        </Flex>
        {tableIsActive ? (
          <Table
            columns={columnsActive}
            dataSource={activeShifts}
            rowKey={(record) => record.id}
            style={{ marginTop: 24 }}
          />
        ) : (
          <Table
            columns={columnsCompleted}
            dataSource={completedShifts}
            rowKey={(record) => record.id}
            style={{ marginTop: 24 }}
          />
        )}
      </div>
    </div>
  );
}
