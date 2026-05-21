'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  Package,
  Warehouse,
  FileText,
  Receipt,
  BarChart3,
  Settings,
  ChevronLeft,
  ChevronRight,
  Layers,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUiStore } from '@/stores/ui-store';
import { useAuthStore } from '@/stores/auth-store';
import { Button } from '@/components/ui/button';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/customers', label: 'Customers', icon: Users },
  { href: '/products', label: 'Products', icon: Package },
  { href: '/inventory', label: 'Inventory', icon: Warehouse },
  { href: '/challans', label: 'Challans', icon: FileText },
  { href: '/invoices', label: 'Invoices', icon: Receipt },
  { href: '/reports', label: 'Reports', icon: BarChart3 },
  { href: '/settings', label: 'Settings', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const { sidebarOpen, toggleSidebar } = useUiStore();
  const company = useAuthStore((s) => s.user?.company);
  const brandName = company?.tradeName || company?.name || 'U VITA ERP';
  const brandSub = company?.tradeName && company?.name && company.tradeName !== company.name
    ? company.name
    : 'Textile Management';

  return (
    <>
      <aside
        className={cn(
          'no-print fixed left-0 top-0 z-40 flex h-screen flex-col border-r bg-card transition-all duration-300',
          sidebarOpen ? 'w-64' : 'w-[68px]'
        )}
      >
        <div className="flex h-16 items-center gap-2 border-b px-4">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-700 text-white">
            <Layers className="h-5 w-5" />
          </div>
          {sidebarOpen && (
            <div className="min-w-0">
              <p className="truncate text-sm font-bold">{brandName}</p>
              <p className="truncate text-[10px] text-muted-foreground">{brandSub}</p>
            </div>
          )}
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto p-2">
          {navItems.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(href + '/');
            return (
              <Link
                key={href}
                href={href}
                title={label}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                  active
                    ? 'bg-slate-700 text-white'
                    : 'text-slate-600 hover:bg-muted dark:text-slate-300'
                )}
              >
                <Icon className="h-5 w-5 shrink-0" />
                {sidebarOpen && <span>{label}</span>}
              </Link>
            );
          })}
        </nav>

        <div className="border-t p-2">
          <Button variant="ghost" size="sm" className="w-full justify-center" onClick={toggleSidebar}>
            {sidebarOpen ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </Button>
        </div>
      </aside>

      {sidebarOpen && (
        <div className="fixed inset-0 z-30 bg-black/40 lg:hidden" onClick={toggleSidebar} />
      )}
    </>
  );
}
