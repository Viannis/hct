"use client";

import { ShiftsProvider } from "./context/ShiftsContext";
import LoadError from "./components/LoadError";
import Stats from "./components/Stats";
import Shifts from "./components/Shifts";

export default function CareworkerDashboard() {
  return (
    <ShiftsProvider>
      {/* ShiftsProvider component for the shifts context */}
      <LoadError>
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
      </LoadError>
      {/* LoadError component for the error handling and page loading */}
    </ShiftsProvider>
  );
}
