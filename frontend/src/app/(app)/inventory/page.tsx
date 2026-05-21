'use client';

import { useEffect, useState } from 'react';
import { PageHeader } from '@/components/shared/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { api } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { toast } from 'sonner';

export default function InventoryPage() {
  const [transactions, setTransactions] = useState<Array<{
    id: string; type: string; quantity: number; date: string; rollNo?: string;
    product: { fabricName: string };
  }>>([]);
  const [products, setProducts] = useState<Array<{ id: string; fabricName: string }>>([]);
  const [form, setForm] = useState<{ productId: string; type: 'STOCK_IN' | 'STOCK_OUT' | 'ADJUSTMENT'; quantity: number; rollNo: string }>({
    productId: '', type: 'STOCK_IN', quantity: 0, rollNo: '',
  });

  useEffect(() => {
    api.get<{ data: typeof transactions }>('/inventory?limit=30').then((r) => setTransactions(r.data));
    api.get<{ data: Array<{ id: string; fabricName: string }> }>('/products?limit=100').then((r) => setProducts(r.data));
  }, []);

  const handleStock = async () => {
    try {
      await api.post('/inventory', form);
      toast.success('Stock updated');
      const res = await api.get<{ data: typeof transactions }>('/inventory?limit=30');
      setTransactions(res.data);
    } catch {
      toast.error('Failed');
    }
  };

  return (
    <div>
      <PageHeader title="Inventory" description="Stock in/out and roll tracking" />
      <Card className="mb-4">
        <CardContent className="grid gap-4 p-4 sm:grid-cols-2 lg:grid-cols-5">
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Product</Label>
            <select className="flex h-10 w-full rounded-md border border-input bg-card px-3 text-sm" value={form.productId} onChange={(e) => setForm({ ...form, productId: e.target.value })}>
              <option value="">Select fabric</option>
              {products.map((p) => <option key={p.id} value={p.id}>{p.fabricName}</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label>Type</Label>
            <select className="flex h-10 w-full rounded-md border border-input bg-card px-3 text-sm" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as 'STOCK_IN' | 'STOCK_OUT' | 'ADJUSTMENT' })}>
              <option value="STOCK_IN">Stock In</option>
              <option value="STOCK_OUT">Stock Out</option>
              <option value="ADJUSTMENT">Adjustment</option>
            </select>
          </div>
          <div className="space-y-1.5"><Label>Meter</Label><Input type="number" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: +e.target.value })} /></div>
          <div className="space-y-1.5"><Label>Roll No</Label><Input value={form.rollNo} onChange={(e) => setForm({ ...form, rollNo: e.target.value })} /></div>
          <div className="flex items-end"><Button onClick={handleStock}>Update Stock</Button></div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Product</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Qty</TableHead>
                <TableHead>Roll</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.map((t) => (
                <TableRow key={t.id}>
                  <TableCell>{formatDate(t.date)}</TableCell>
                  <TableCell>{t.product.fabricName}</TableCell>
                  <TableCell><Badge variant={t.type === 'STOCK_IN' ? 'success' : 'warning'}>{t.type}</Badge></TableCell>
                  <TableCell>{t.quantity} mtr</TableCell>
                  <TableCell>{t.rollNo || '-'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

