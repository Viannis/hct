import Stats from "./components/Stats";
import ActiveCompletedCareTakers from "./components/ActiveCompletedCareTakers";

export default function ManagerDashboard() {
  // Render the content of the page based on the loading and error states

  return (
    <div>
      <Stats />
      <ActiveCompletedCareTakers />
    </div>
  );
}
