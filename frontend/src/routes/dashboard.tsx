import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { useAuthStore } from "@/lib/auth-store";

export const Route = createFileRoute("/dashboard")({
  beforeLoad: () => {
    const { user } = useAuthStore.getState();

    if (!user) {
      throw redirect({
        to: "/",
      });
    }
  },

  component: () => (
    <DashboardShell>
      <Outlet />
    </DashboardShell>
  ),
});