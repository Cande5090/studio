
"use client";

import type { ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { DashboardHeader } from '@/components/layout/DashboardHeader';
import { SidebarNav } from '@/components/layout/SidebarNav';
import { Logo } from '@/components/Logo';

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  if (loading || !user) {
    // This can be a more sophisticated loading skeleton matching the dashboard layout
    return (
      <div className="flex h-screen items-center justify-center">
        Cargando panel de control...
      </div>
    );
  }

  return (
    <div className="grid min-h-screen w-full md:grid-cols-[220px_1fr] lg:grid-cols-[280px_1fr]">
      <aside className="hidden border-r bg-sidebar md:block">
        <div className="flex h-full max-h-screen flex-col gap-2">
          <div className="flex h-16 items-center border-b px-4 lg:px-6">
            <Logo size="md" />
          </div>
          <div className="flex-1 py-2">
            <SidebarNav />
          </div>
        </div>
      </aside>
      <div className="flex flex-col">
        <DashboardHeader />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
