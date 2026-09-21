"use client";

import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function RoleRoute({ children, allowedRoles }: { children: React.ReactNode, allowedRoles: string[] }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user && !allowedRoles.includes(user.role)) {
      if (user.role === 'superadmin') {
        router.push('/superadmin/users');
      } else {
        router.push('/dashboard');
      }
    }
  }, [user, loading, router, allowedRoles]);

  if (loading || !user || !allowedRoles.includes(user.role)) {
    return <div className="flex h-screen w-full items-center justify-center bg-background"><div className="text-primary text-xl">Checking Access...</div></div>;
  }

  return <>{children}</>;
}
