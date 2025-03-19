"use client";

import { useEffect, useState } from "react";
import { Card, Row, Col, Typography, Skeleton } from "antd";
import { Line } from "react-chartjs-2";
import { useShifts } from "../context/ShiftsContext";
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

const { Title: TitleText } = Typography;

type HoursPerDay = {
  date: string;
  hours: number;
};

export default function Stats() {
  const { hoursLast7Days, loading } = useShifts();
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

  useEffect(() => {
    if (!loading.hoursLast7Days && hoursLast7Days) {
      let tempTotalHours = 0;
      let tempAvgHours = 0;
      hoursLast7Days.forEach((hoursPerDay: HoursPerDay) => {
        tempTotalHours += hoursPerDay.hours || 0;
      });
      tempTotalHours = Math.round(tempTotalHours * 100) / 100;
      tempAvgHours = Math.round((tempTotalHours / 7) * 100) / 100;
      setTotalHours(tempTotalHours);
      setAvgHours(tempAvgHours);
      const labels: string[] = [];
      const hours: number[] = [];
      hoursLast7Days.forEach((hoursPerDay: HoursPerDay) => {
        labels.push(hoursPerDay.date);
        hours.push(hoursPerDay.hours);
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
    }
  }, [hoursLast7Days, loading.hoursLast7Days]);

  const renderStats = () => {
    if (loading.hoursLast7Days) {
      return <Skeleton active />;
    }
    if (hoursLast7Days) {
      return (
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
      );
    }
    return null;
  };

  return renderStats();
}
