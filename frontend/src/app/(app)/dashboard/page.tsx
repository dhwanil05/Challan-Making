'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  IndianRupee,
  Clock,
  FileText,
  TrendingUp,
  AlertTriangle,
  ArrowRight,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { StatCard } from '@/components/dashboard/stat-card';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';

interface DashboardData {
  totalSales: number;
  pendingPayments: number;
  dailyChallans: number;
  monthlyRevenue: number;
  recentChallans: {
    id: string;
    challanNumber: string;
    partyName: string;
    totalAmount: number;
    date: string;
    status: string;
  }[];
  topCustomers: { id: string; name: string; outstandingBalance: number }[];
  lowStockProducts: { id: string; fabricName: string; stockQuantity: number; minStock: number }[];
  monthlySales: { month: string; amount: number }[];
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<{ data: DashboardData }>('/dashboard')
      .then((res) => setData(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-300 border-t-slate-700" />
      </div>
    );
  }

  const d = data!;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">Overview of your textile business</p>
        </div>
        <Link href="/challans/new">
          <Button variant="accent">+ New Challan</Button>
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Total Sales" value={formatCurrency(d.totalSales)} icon={IndianRupee} />
        <StatCard title="Pending Payments" value={formatCurrency(d.pendingPayments)} icon={Clock} />
        <StatCard title="Today's Challans" value={String(d.dailyChallans)} icon={FileText} />
        <StatCard title="Monthly Revenue" value={formatCurrency(d.monthlyRevenue)} icon={TrendingUp} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Monthly Sales</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={d.monthlySales}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: number) => formatCurrency(v)} />
                <Bar dataKey="amount" fill="#334155" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Low Stock Alerts</CardTitle>
            <AlertTriangle className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent className="space-y-3">
            {d.lowStockProducts.length === 0 ? (
              <p className="text-sm text-muted-foreground">All stock levels OK</p>
            ) : (
              d.lowStockProducts.map((p) => (
                <div key={p.id} className="flex justify-between text-sm">
                  <span className="truncate font-medium">{p.fabricName}</span>
                  <Badge variant="warning">{p.stockQuantity} mtr</Badge>
                </div>
              ))
            )}
            <Link href="/inventory">
              <Button variant="ghost" size="sm" className="w-full">
                View Inventory <ArrowRight className="ml-1 h-3 w-3" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Recent Challans</CardTitle>
            <Link href="/challans">
              <Button variant="ghost" size="sm">View All</Button>
            </Link>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {d.recentChallans.map((c) => (
                <Link
                  key={c.id}
                  href={`/challans/${c.id}`}
                  className="flex items-center justify-between rounded-lg border p-3 transition-colors hover:bg-muted/50"
                >
                  <div>
                    <p className="font-medium">{c.challanNumber}</p>
                    <p className="text-sm text-muted-foreground">{c.partyName}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">{formatCurrency(c.totalAmount)}</p>
                    <p className="text-xs text-muted-foreground">{formatDate(c.date)}</p>
                  </div>
                </Link>
              ))}
              {!d.recentChallans.length && (
                <p className="text-center text-sm text-muted-foreground py-4">No challans yet</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Top Customers (Outstanding)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {d.topCustomers.map((c) => (
                <div key={c.id} className="flex justify-between rounded-lg border p-3">
                  <span className="font-medium">{c.name}</span>
                  <span className="font-semibold text-amber-600">{formatCurrency(c.outstandingBalance)}</span>
                </div>
              ))}
              {!d.topCustomers.length && (
                <p className="text-center text-sm text-muted-foreground py-4">No customers</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

