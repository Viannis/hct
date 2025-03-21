"use client";

import { useState, useEffect } from "react";
import { useUserLocation } from "../context/UserLocationContext";
import { Card, Row, Col, Skeleton, Typography } from "antd";
import { Line } from "react-chartjs-2";
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
import { loadErrorMessages, loadDevMessages } from "@apollo/client/dev";

if (process.env.NODE_ENV === "development") {
  // Adds messages only in a dev environment
  loadDevMessages();
  loadErrorMessages();
}

const { Title: TitleText } = Typography;

export default function Stats() {
  const { user, shiftsData, loading, error, hoursPerDateRangeData } =
    useUserLocation();
  const [userLoading, setUserLoading] = useState(true);
  const [userError, setUserError] = useState(false);
  const [shiftsLoading, setShiftsLoading] = useState(true);
  const [shiftsError, setShiftsError] = useState(false);

  const [shiftsCompletedCount, setShiftsCompletedCount] = useState(0);
  const [activeShiftsCount, setActiveShiftsCount] = useState(0);
  const [chartData, setChartData] = useState({
    labels: ["", "", "", "", "", "", ""],
    datasets: [
      {
        label: "Hours Worked",
        data: [0, 0, 0, 0, 0, 0, 0],
        tension: 0.1,
      },
    ],
  });

  useEffect(() => {
    if (!loading.user && user) {
      setUserLoading(false);
    }
    if (error.user) {
      setUserError(true);
    }
    if (!loading.shifts && shiftsData?.allShifts) {
      const active = shiftsData.allShifts.filter((shift) => !shift.clockOut);
      const completed = shiftsData.allShifts.filter((shift) => shift.clockOut);
      setActiveShiftsCount(active.length);
      setShiftsCompletedCount(completed.length);
      setShiftsLoading(false);
      setShiftsError(false);
    }
    if (error.shifts) {
      setShiftsError(true);
    }
  }, [
    loading.shifts,
    shiftsData,
    user,
    error.shifts,
    error.user,
    loading.user,
  ]);

  useEffect(() => {
    console.log("hoursPerDateRangeData", hoursPerDateRangeData);
    if (
      !loading.hoursPerDateRange &&
      hoursPerDateRangeData?.hoursPerDateRange
    ) {
      const labels: string[] = [];
      const dataSets: {
        label: string;
        data: number[];
        tension: number;
      }[] = [];

      hoursPerDateRangeData.hoursPerDateRange.forEach((user) => {
        const userHours = user.dailyTotals.map((daily) => {
          if (!labels.includes(daily.date)) {
            labels.push(daily.date);
          }
          return daily.hours;
        });

        dataSets.push({
          label: user.userName,
          data: userHours,
          tension: 0.1,
        });
      });

      setChartData({
        labels,
        datasets: dataSets,
      });
    }
  }, [
    hoursPerDateRangeData,
    loading.hoursPerDateRange,
    error.hoursPerDateRange,
  ]);

  if (
    userLoading ||
    shiftsLoading ||
    loading.hoursPerDateRange ||
    loading.hoursPerDateRangeRefetch
  ) {
    return (
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={24} md={12} lg={8}>
          <Card title="Shifts Completed">
            <Skeleton.Input active />
          </Card>
          <Card title="Active Shifts" style={{ marginTop: 16 }}>
            <Skeleton.Input active />
          </Card>
        </Col>
        <Col xs={24} sm={24} md={12} lg={16}>
          <Card
            title="Hours Worked"
            style={{ height: "100%", width: "100%" }}
            styles={{
              body: { height: "60%", width: "100%" },
            }}
            loading={true}
          >
            <div style={{ height: "100%", width: "100%" }}></div>
          </Card>
        </Col>
      </Row>
    );
  }

  if (
    userError ||
    shiftsError ||
    error.hoursPerDateRange ||
    error.hoursPerDateRangeRefetch
  ) {
    return <div>Error loading stats</div>;
  }

  return (
    <Row gutter={[16, 16]}>
      <Col xs={24} sm={24} md={12} lg={8}>
        <Card title="Shifts Completed">
          <TitleText level={2}>{shiftsCompletedCount}h</TitleText>
        </Card>
        <Card title="Active Shifts" style={{ marginTop: 16 }}>
          <TitleText level={2}>{activeShiftsCount}</TitleText>
        </Card>
      </Col>
      <Col xs={24} sm={24} md={12} lg={16}>
        <Card title="Hours Worked" style={{ height: "100%" }}>
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
  );
}
