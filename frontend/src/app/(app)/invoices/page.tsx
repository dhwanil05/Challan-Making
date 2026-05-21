'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Printer } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { api } from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';
import { toast } from 'sonner';

interface Invoice {
  id: string;
  invoiceNumber: string;
  partyName: string;
  date: string;
  totalAmount: number;
  paidAmount: number;
  balanceAmount: number;
  status: string;
}

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [payModal, setPayModal] = useState<string | null>(null);
  const [payAmount, setPayAmount] = useState(0);

  const load = () => api.get<{ data: Invoice[] }>('/invoices?limit=50').then((r) => setInvoices(r.data));

  useEffect(() => { load(); }, []);

  const recordPayment = async (invoiceId: string) => {
    try {
      await api.post(`/invoices/${invoiceId}/payments`, { amount: payAmount, method: 'CASH' });
      toast.success('Payment recorded');
      setPayModal(null);
      load();
    } catch {
      toast.error('Failed');
    }
  };

  return (
    <div>
      <PageHeader title="Invoices" description="GST invoices and payment tracking" />
      {payModal && (
        <Card className="mb-4">
          <CardContent className="flex gap-4 p-4 items-end">
            <div className="space-y-1.5"><Label>Payment Amount</Label><Input type="number" value={payAmount} onChange={(e) => setPayAmount(+e.target.value)} /></div>
            <Button onClick={() => recordPayment(payModal)}>Record Payment</Button>
            <Button variant="ghost" onClick={() => setPayModal(null)}>Cancel</Button>
          </CardContent>
        </Card>
      )}
      <Card>
        <CardContent className="p-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice No</TableHead>
                <TableHead>Party</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-right">Balance</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoices.map((inv) => (
                <TableRow key={inv.id}>
                  <TableCell className="font-medium">{inv.invoiceNumber}</TableCell>
                  <TableCell>{inv.partyName}</TableCell>
                  <TableCell>{formatDate(inv.date)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(inv.totalAmount)}</TableCell>
                  <TableCell className="text-right text-amber-600">{formatCurrency(inv.balanceAmount)}</TableCell>
                  <TableCell><Badge variant={inv.status === 'PAID' ? 'success' : 'warning'}>{inv.status}</Badge></TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button size="sm" variant="outline" asChild>
                      <Link href={`/invoices/${inv.id}`}>
                        <Printer className="h-3.5 w-3.5 mr-1 inline" />
                        View / Print
                      </Link>
                    </Button>
                    {inv.balanceAmount > 0 && (
                      <Button size="sm" variant="outline" onClick={() => { setPayModal(inv.id); setPayAmount(inv.balanceAmount); }}>
                        Pay
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
