import { useShifts } from "../context/ShiftsContext";
import { Spin } from "antd";
import Shifts from "./Shifts";
import Stats from "./Stats";

export default function LoadError() {
  const { error, loading, location } = useShifts();
  if (loading.user || loading.location) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
        }}
      >
        <Spin />
        <div>Loading...</div>
      </div>
    );
  }
  if (error.user || error.location) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
        }}
      >
        <div>Error loading data</div>
        <div>{error.user}</div>
        <div>{error.location}</div>
      </div>
    );
  }
  if (!location) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
        }}
      >
        <div>
          Shifts can only be clocked in when your manager sets up the location.
        </div>
      </div>
    );
  }
  return (
    <>
      <Stats />
      <div
        style={{
          marginTop: 56,
          paddingTop: 36,
          borderTop: "1px solid #f0f0f0",
        }}
      >
        <Shifts />
      </div>
    </>
  );
}
