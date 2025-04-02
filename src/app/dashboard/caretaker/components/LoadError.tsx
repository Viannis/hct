import { useShifts } from "../context/ShiftsContext";
import { Spin } from "antd";

export default function LoadError({
  children,
}: {
  readonly children: React.ReactNode;
}) {
  const { error, loading, location } = useShifts();
  // Get the error, loading, and location states from the ShiftsContext
  if (loading.user || loading.location) {
    // If the user or location is loading
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
    // If the user or location has an error
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
    // If the location is not found
    return (
      // Return handling for when the location hasn't been set by the manager
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
  return children;
}
