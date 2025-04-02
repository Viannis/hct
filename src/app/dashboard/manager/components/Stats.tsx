"use client";

import { useState, useEffect, useMemo } from "react";
import { useUserLocation } from "../context/UserLocationContext";
import { Card, Row, Col, Skeleton, Typography } from "antd";
import type { TableShift } from "./ActiveCompletedCareTakers";
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
import { GoogleMap, Marker, Circle } from "@react-google-maps/api";
import { loadErrorMessages, loadDevMessages } from "@apollo/client/dev";
import { useGoogleMaps } from "../context/GoogleMapsContext";

if (process.env.NODE_ENV === "development") {
  // Adds messages only in a dev environment
  loadDevMessages();
  loadErrorMessages();
}

const { Title: TitleText } = Typography;

export default function Stats() {
  const { user, shiftsData, loading, error, hoursPerDateRangeData, location } =
    useUserLocation();
  const [userLoading, setUserLoading] = useState(true);
  const [userError, setUserError] = useState(false);
  const [shiftsLoading, setShiftsLoading] = useState(true);
  const [shiftsError, setShiftsError] = useState(false);
  const { isLoaded } = useGoogleMaps();
  const [shiftsCompletedCount, setShiftsCompletedCount] = useState(0);
  const [activeShiftsCount, setActiveShiftsCount] = useState(0);
  const [completedShifts, setCompletedShifts] = useState<TableShift[]>([]);
  const [shiftsGroupedByUser, setShiftsGroupedByUser] = useState<
    Record<string, TableShift[]>
  >({});
  const [userColors, setUserColors] = useState<Record<string, string>>({});
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
      const completedShiftData: TableShift[] = completed.map((shift) => ({
        id: shift.id,
        userId: shift.user.id,
        clockIn: shift.clockIn,
        clockOut: shift.clockOut,
        clockInNote: shift.clockInNote,
        clockOutNote: shift.clockOutNote,
        latitude: shift.locationName?.split(",")[0],
        longitude: shift.locationName?.split(",")[1],
        userName: shift.user.name,
        uniqueId: `${shift.id}-${shift.clockIn}`, // Generate uniqueId once
      }));
      const groupedShifts: Record<string, TableShift[]> = {};
      const colors: Record<string, string> = {};

      completedShiftData.forEach((shift) => {
        if (!groupedShifts[shift.userId]) {
          groupedShifts[shift.userId] = [];
          // Generate a random color for this user
          colors[shift.userId] = generateRandomColor();
        }
        groupedShifts[shift.userId].push(shift);
      });

      setShiftsGroupedByUser(groupedShifts);
      setUserColors(colors);
      setCompletedShifts(completedShiftData);
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

      console.log("dataSets", dataSets);
      console.log("labels", labels);

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

  const generateRandomColor = () => {
    const letters = "0123456789ABCDEF";
    let color = "#";
    for (let i = 0; i < 6; i++) {
      color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
  };

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

  console.log(completedShifts, isLoaded, location);

  return (
    <>
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
          <Card
            title="Hours Worked"
            style={{ height: "100%" }}
            styles={{
              body: {
                height: "80%",
                width: "100%",
              },
            }}
          >
            <Line
              data={chartData}
              options={{
                maintainAspectRatio: false,
                scales: {
                  y: { grid: { display: false } },
                  x: { grid: { display: false } },
                },
                responsive: true,
                aspectRatio: 1,
              }}
            />
          </Card>
        </Col>
      </Row>
      {isLoaded && !!location && completedShifts.length > 0 && (
        <Card title="Completed Shifts Map" style={{ marginTop: 16 }}>
          <GoogleMap
            center={{
              lat: parseFloat(location.latitude.toString()),
              lng: parseFloat(location.longitude.toString()),
            }}
            zoom={15}
            options={{
              mapTypeControl: false,
              streetViewControl: false,
              fullscreenControl: false,
            }}
            mapContainerStyle={{
              width: "100%",
              height: "400px",
              borderRadius: "6px",
            }}
          >
            <Circle
              center={{
                lat: parseFloat(location.latitude.toString()),
                lng: parseFloat(location.longitude.toString()),
              }}
              radius={location.radius * 1000} // Small radius for the dot
              options={{
                fillColor: "#1677ff",
                fillOpacity: 0.03,
                strokeColor: "#1677ff",
                strokeOpacity: 0.5,
                strokeWeight: 1,
              }}
            />

            <Marker
              position={{
                lat: parseFloat(location.latitude.toString()),
                lng: parseFloat(location.longitude.toString()),
              }}
              icon={{
                url: "http://maps.google.com/mapfiles/ms/icons/blue-dot.png",
                scaledSize: new google.maps.Size(50, 50),
              }}
            />
            {Object.keys(shiftsGroupedByUser).map((userId) =>
              shiftsGroupedByUser[userId].map((shift) => {
                return shift.latitude && shift.longitude ? (
                  <Marker
                    key={shift.uniqueId}
                    position={{
                      lat: parseFloat(shift.latitude),
                      lng: parseFloat(shift.longitude),
                    }}
                    icon={{
                      url:
                        "data:image/svg+xml;charset=UTF-8," +
                        encodeURIComponent(`
              <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 10 10">
                <circle cx="5" cy="5" r="5" fill="${userColors[userId]}" />
              </svg>
            `),
                      scaledSize: new google.maps.Size(15, 15),
                    }}
                    title={`${shift.userName}'s Clock In Location`}
                  />
                ) : null;
              })
            )}
          </GoogleMap>
        </Card>
      )}
    </>
  );
}
