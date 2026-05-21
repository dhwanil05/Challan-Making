'use client';

import { useEffect, useState } from 'react';
import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { api } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';

export default function ReportsPage() {
  const [from, setFrom] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]);
  const [to, setTo] = useState(() => new Date().toISOString().split('T')[0]);
  const [sales, setSales] = useState<Record<string, number> | null>(null);
  const [gst, setGst] = useState<Record<string, number> | null>(null);

  const load = () => {
    api.get<{ data: { totalChallanAmount: number; totalInvoiceAmount: number; totalCollected: number; pending: number; challanCount: number } }>(
      `/reports/sales?from=${from}&to=${to}`
    ).then((r) => setSales(r.data as unknown as Record<string, number>));
    api.get<{ data: { summary: Record<string, number> } }>(`/reports/gst?from=${from}&to=${to}`)
      .then((r) => setGst(r.data.summary));
  };

  useEffect(() => { load(); }, [from, to]);

  return (
    <div className="space-y-6">
      <PageHeader title="Reports" description="Sales, GST, and business analytics" />
      <Card>
        <CardContent className="flex flex-wrap gap-4 p-4 items-end">
          <div className="space-y-1.5"><Label>From</Label><Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></div>
          <div className="space-y-1.5"><Label>To</Label><Input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></div>
          <Button onClick={load}>Apply</Button>
          <Button variant="outline" onClick={() => api.download(`/export/challans?from=${from}&to=${to}`, 'report.xlsx')}>Export Excel</Button>
        </CardContent>
      </Card>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {sales && (
          <>
            <ReportCard title="Challan Total" value={formatCurrency(sales.totalChallanAmount as number)} />
            <ReportCard title="Invoice Total" value={formatCurrency(sales.totalInvoiceAmount as number)} />
            <ReportCard title="Collected" value={formatCurrency(sales.totalCollected as number)} />
            <ReportCard title="Pending" value={formatCurrency(sales.pending as number)} />
          </>
        )}
      </div>
      {gst && (
        <Card>
          <CardHeader><CardTitle className="text-base">GST Summary</CardTitle></CardHeader>
          <CardContent className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
            <div><span className="text-muted-foreground">Taxable</span><p className="font-bold">{formatCurrency(gst.taxableAmount)}</p></div>
            <div><span className="text-muted-foreground">CGST</span><p className="font-bold">{formatCurrency(gst.cgst)}</p></div>
            <div><span className="text-muted-foreground">SGST</span><p className="font-bold">{formatCurrency(gst.sgst)}</p></div>
            <div><span className="text-muted-foreground">IGST</span><p className="font-bold">{formatCurrency(gst.igst)}</p></div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function ReportCard({ title, value }: { title: string; value: string }) {
  return (
    <Card><CardContent className="p-5"><p className="text-sm text-muted-foreground">{title}</p><p className="text-xl font-bold mt-1">{value}</p></CardContent></Card>
  );
}
