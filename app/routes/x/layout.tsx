import { Outlet } from "react-router";

export default function XLayout() {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <main className="min-h-0 flex-1 overflow-hidden">
        <Outlet />
      </main>
    </div>
  );
}
