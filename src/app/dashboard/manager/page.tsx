import Stats from "./components/Stats";
import ActiveCompletedCareTakers from "./components/ActiveCompletedCareTakers";
import { UserLocationProvider } from "./context/UserLocationContext";
import LoadError from "./components/LoadError";

export default function ManagerDashboard() {
  // Render the content of the page based on the loading and error states

  return (
    <UserLocationProvider>
      <LoadError>
        <Stats />
        <ActiveCompletedCareTakers />
      </LoadError>
    </UserLocationProvider>
  );
}
