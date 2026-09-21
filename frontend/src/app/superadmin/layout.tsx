"use client";

import ProtectedRoute from "@/components/auth/ProtectedRoute";
import RoleRoute from "@/components/auth/RoleRoute";
import { DashboardLayout } from "@/components/layout/DashboardLayout";

export default function SuperadminRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute>
      <RoleRoute allowedRoles={['superadmin']}>
        <DashboardLayout>
          {children}
        </DashboardLayout>
      </RoleRoute>
    </ProtectedRoute>
  );
}
