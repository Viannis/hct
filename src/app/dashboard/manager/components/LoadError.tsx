"use client";
import { useUserLocation } from "../context/UserLocationContext";
import { Button, Spin, Alert } from "antd";
import { useRouter } from "next/navigation";
export default function LoadError({
  children,
}: {
  readonly children: React.ReactNode;
}) {
  const router = useRouter();
  const { error, loading, location } = useUserLocation();

  if (loading.user || loading.location) {
    // Render the loading
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
    // Render the error
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
      <Alert // Alert for the location setup required
        message="Location Setup Required"
        description="Please set up the location and perimeter for staff clock-in."
        type="warning"
        showIcon
        action={
          <Button
            type="primary"
            onClick={() => router.push("/dashboard/manager/settings/location")}
          >
            Go to Location Settings
          </Button>
        }
        style={{ marginBottom: 24 }}
      />
    );
  }
  return children; // Return the children if the location is set, no more loading or error
}
