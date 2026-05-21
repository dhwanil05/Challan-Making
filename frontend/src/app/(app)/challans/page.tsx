'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus, Search, Download } from 'lucide-react';
import { PageHeader } from '@/components/shared/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { api } from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';

interface Challan {
  id: string;
  challanNumber: string;
  partyName: string;
  date: string;
  totalAmount: number;
  status: string;
}

export default function ChallansPage() {
  const [challans, setChallans] = useState<Challan[]>([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    api.get<{ data: Challan[] }>(`/challans?search=${encodeURIComponent(search)}&limit=50`)
      .then((r) => setChallans(r.data));
  }, [search]);

  return (
    <div>
      <PageHeader title="E-Challans" description="Delivery challans for fabric dispatch">
        <Button variant="outline" onClick={() => api.download('/export/challans', 'challans.xlsx')}>
          <Download className="h-4 w-4 mr-1" /> Export
        </Button>
        <Link href="/challans/new"><Button variant="accent"><Plus className="h-4 w-4 mr-1" /> New Challan</Button></Link>
      </PageHeader>
      <Card>
        <CardContent className="p-4">
          <Input placeholder="Search challan..." className="mb-4 max-w-sm" value={search} onChange={(e) => setSearch(e.target.value)} />
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Challan No</TableHead>
                <TableHead>Party</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {challans.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.challanNumber}</TableCell>
                  <TableCell>{c.partyName}</TableCell>
                  <TableCell>{formatDate(c.date)}</TableCell>
                  <TableCell className="text-right font-semibold">{formatCurrency(c.totalAmount)}</TableCell>
                  <TableCell>
                    <Badge variant={c.status === 'CONFIRMED' ? 'success' : c.status === 'DRAFT' ? 'secondary' : 'destructive'}>
                      {c.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Link href={`/challans/${c.id}`}><Button size="sm" variant="outline">View</Button></Link>
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
