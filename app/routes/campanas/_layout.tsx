import { Outlet } from "react-router";

export default function CampanasLayout() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Outlet />
    </div>
  );
}
