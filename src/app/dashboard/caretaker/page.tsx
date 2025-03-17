"use client";

import { useEffect, useState } from "react";
import { Card, Row, Col, Typography } from "antd";
import { Line } from "react-chartjs-2";
import { useQuery } from "@apollo/client";
import { GET_HOURS_LAST_7_DAYS } from "@utils/queries";
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
import Shifts from "./components/Shifts";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

const { Title: TitleText } = Typography;

type Set = {
  date: string;
  hours: number;
};

export default function CareworkerDashboard() {
  const [showStats, setShowStats] = useState(false);
  const [totalHours, setTotalHours] = useState(0);
  const [avgHours, setAvgHours] = useState(0);
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
  const {
    data: hours7Days,
    loading: dataLoading,
    error: dataError,
  } = useQuery(GET_HOURS_LAST_7_DAYS);

  useEffect(() => {
    if (dataError) {
      console.error("Error fetching total hours:", dataError);
      setShowStats(false);
    }
    if (dataLoading) {
      setShowStats(true);
    }
    if (hours7Days) {
      console.log("Total hours", hours7Days.hoursLast7Days);
      let totalHours = 0;
      hours7Days.hoursLast7Days?.forEach((set: Set) => {
        totalHours += set.hours || 0;
      });
      console.log("Total hours", totalHours);
      console.log("Average hours", totalHours / 7);
      totalHours = Math.round(totalHours * 100) / 100;
      setTotalHours(totalHours);
      setAvgHours(totalHours / 7);
      const labels: string[] = [];
      const hours: number[] = [];
      hours7Days.hoursLast7Days?.forEach((set: Set) => {
        labels.push(set.date);
        hours.push(set.hours);
      });
      setChartData({
        labels,
        datasets: [
          {
            label: "Hours Worked",
            data: hours,
            borderColor: "#1890ff",
            tension: 0.1,
          },
        ],
      });
      setShowStats(true);
    }
  }, [dataError, hours7Days, dataLoading]);

  return (
    <div>
      {showStats ? (
        <Row gutter={[16, 16]}>
          <Col span={8}>
            <Card title="Average Hours Last Week">
              <TitleText level={2}>{avgHours}h</TitleText>
            </Card>
            <Card title="Total Hours Last Week" style={{ marginTop: 16 }}>
              <TitleText level={2}>{totalHours}h</TitleText>
            </Card>
          </Col>
          <Col span={16}>
            <Card title="Hours Worked Last 7 Days" style={{ height: "100%" }}>
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
      ) : null}
      <div
        style={{
          marginTop: 56,
          paddingTop: 36,
          borderTop: "1px solid #f0f0f0",
        }}
      >
        <Shifts />
      </div>
    </div>
  );
}
