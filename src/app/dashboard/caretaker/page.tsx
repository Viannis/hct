"use client";

import { ShiftsProvider } from "./context/ShiftsContext";
import LoadError from "./components/LoadError";

export default function CareworkerDashboard() {
  return (
    <ShiftsProvider>
      <LoadError />
    </ShiftsProvider>
  );
}
