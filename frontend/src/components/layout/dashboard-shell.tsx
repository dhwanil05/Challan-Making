'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Sidebar } from './sidebar';
import { Header } from './header';
import { useAuthStore } from '@/stores/auth-store';
import { useUiStore } from '@/stores/ui-store';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api';
import { mapCompanyProfile } from '@/lib/company';

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { token, setAuth, updateCompany } = useAuthStore();
  const { sidebarOpen } = useUiStore();

  useEffect(() => {
    if (!token) {
      router.replace('/login');
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const me = await api.get<{ user: Parameters<typeof setAuth>[1] }>('/auth/me');
        if (!cancelled) setAuth(token, me.user);
        const companyRes = await api.get<{ data: Record<string, unknown> }>('/settings/company');
        if (!cancelled) updateCompany(mapCompanyProfile(companyRes.data));
      } catch {
        if (!cancelled) router.replace('/login');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [token, router, setAuth, updateCompany]);

  if (!token) return null;

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <div className={cn('transition-all', sidebarOpen ? 'lg:pl-64' : 'lg:pl-[68px]')}>
        <Header />
        <main className="p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
