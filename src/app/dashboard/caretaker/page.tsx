"use client";

import { ShiftsProvider } from "./context/ShiftsContext";
import LoadError from "./components/LoadError";

export default function CareworkerDashboard() {
  return (
    <ShiftsProvider>
      {/* ShiftsProvider component for the shifts context */}
      <LoadError />{" "}
      {/* LoadError component for the error handling and page loading */}
    </ShiftsProvider>
  );
}
