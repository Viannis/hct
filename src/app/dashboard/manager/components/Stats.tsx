"use client";

import { useState, useEffect } from "react";
import { useQuery } from "@apollo/client";
import { GET_HOURS_PER_DATE_RANGE } from "@utils/queries";
import { useUserLocation } from "../context/UserLocationContext";
import { Card, Row, Col, Skeleton, Typography } from "antd";
import { Line } from "react-chartjs-2";

const { Title: TitleText } = Typography;

type DailyTotal = {
  date: string;
  hours: number;
};

type UserDailyHours = {
  userId: string;
  userName: string;
  dailyTotals: DailyTotal[];
};

export default function Stats() {
  const { user, shiftsData, loading, error } = useUserLocation();
  const [userLoading, setUserLoading] = useState(true);
  const [userError, setUserError] = useState(false);
  const [shiftsLoading, setShiftsLoading] = useState(true);
  const [shiftsError, setShiftsError] = useState(false);
  const startDate = new Date();
  startDate.setHours(0, 0, 0, 0);
  const endDate = new Date();
  endDate.setHours(23, 59, 59, 999);

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
    if (!hoursPerDateRangeLoading && hoursPerDateRangeData?.hoursPerDateRange) {
      const labels: string[] = [];
      const dataSets: {
        label: string;
        data: number[];
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
            tension: 0.1,
          });
        }
      );

      setChartData({
        labels,
        datasets: dataSets,
      });
    }
  }, [hoursPerDateRangeLoading, hoursPerDateRangeData]);

  if (userLoading || shiftsLoading || hoursPerDateRangeLoading) {
    return <Skeleton active paragraph={{ rows: 4 }} />;
  }

  if (userError || shiftsError || hoursPerDateRangeError) {
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
  );
}
