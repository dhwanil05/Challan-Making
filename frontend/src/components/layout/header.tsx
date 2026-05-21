'use client';

import { useRouter } from 'next/navigation';
import { Moon, Sun, Search, LogOut, User, Bell, Plus } from 'lucide-react';
import { useTheme } from 'next-themes';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuthStore } from '@/stores/auth-store';
import { useUiStore } from '@/stores/ui-store';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import { api } from '@/lib/api';
import { toast } from 'sonner';

export function Header() {
  const { theme, setTheme } = useTheme();
  const { user, logout } = useAuthStore();
  const { sidebarOpen } = useUiStore();
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<{
    customers: { id: string; name: string }[];
    challans: { id: string; challanNumber: string }[];
  } | null>(null);

  const handleSearch = async (q: string) => {
    setSearch(q);
    if (q.length < 2) {
      setResults(null);
      return;
    }
    try {
      const res = await api.get<{ data: { customers: { id: string; name: string }[]; challans: { id: string; challanNumber: string }[] } }>(
        `/search?q=${encodeURIComponent(q)}`
      );
      setResults(res.data);
    } catch {
      setResults(null);
    }
  };

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  return (
    <header
      className={cn(
        'no-print sticky top-0 z-20 flex h-16 items-center gap-4 border-b bg-card/95 px-4 backdrop-blur transition-all',
        sidebarOpen ? 'lg:pl-64' : 'lg:pl-[68px]'
      )}
    >
      <div className="relative hidden flex-1 max-w-md md:block">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search customers, challans..."
          className="pl-9"
          value={search}
          onChange={(e) => handleSearch(e.target.value)}
        />
        {results && (
          <div className="absolute top-full mt-1 w-full rounded-lg border bg-card p-2 shadow-lg">
            {results.customers.map((c) => (
              <button
                key={c.id}
                className="block w-full rounded px-2 py-1.5 text-left text-sm hover:bg-muted"
                onClick={() => {
                  router.push(`/customers`);
                  setResults(null);
                }}
              >
                Customer: {c.name}
              </button>
            ))}
            {results.challans.map((c) => (
              <button
                key={c.id}
                className="block w-full rounded px-2 py-1.5 text-left text-sm hover:bg-muted"
                onClick={() => {
                  router.push(`/challans/${c.id}`);
                  setResults(null);
                }}
              >
                Challan: {c.challanNumber}
              </button>
            ))}
            {!results.customers.length && !results.challans.length && (
              <p className="px-2 py-1 text-sm text-muted-foreground">No results</p>
            )}
          </div>
        )}
      </div>

      <Link href="/challans/new" className="md:hidden">
        <Button size="sm" variant="accent">
          <Plus className="h-4 w-4" />
        </Button>
      </Link>

      <div className="ml-auto flex items-center gap-2">
        <Link href="/challans/new" className="hidden md:block">
          <Button size="sm" variant="accent">
            <Plus className="h-4 w-4 mr-1" /> New Challan
          </Button>
        </Link>
        <Button variant="ghost" size="icon" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
          <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
        </Button>
        <Button variant="ghost" size="icon" onClick={() => router.push('/settings')}>
          <Bell className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" onClick={() => router.push('/profile')}>
          <User className="h-4 w-4" />
        </Button>
        <div className="hidden text-right sm:block">
          <p className="text-sm font-medium">{user?.name}</p>
          <p className="text-xs text-muted-foreground">
            {user?.company?.tradeName || user?.company?.name || user?.role}
          </p>
        </div>
        <Button variant="ghost" size="icon" onClick={handleLogout} title="Logout">
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    </header>
  );
}
