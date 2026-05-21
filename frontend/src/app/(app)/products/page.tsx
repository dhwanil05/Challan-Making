'use client';

import { useEffect, useState } from 'react';
import { Plus, Search } from 'lucide-react';
import { PageHeader } from '@/components/shared/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { api } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { toast } from 'sonner';

interface Product {
  id: string;
  fabricName: string;
  designNumber?: string;
  colour?: string;
  category?: string;
  rate: number;
  stockQuantity: number;
  minStock: number;
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    fabricName: '', designNumber: '', colour: '', category: '', rate: 0, stockQuantity: 0, minStock: 0,
  });

  const load = () => {
    api.get<{ data: Product[] }>(`/products?search=${encodeURIComponent(search)}&limit=50`)
      .then((r) => setProducts(r.data))
      .catch(() => toast.error('Failed to load'));
  };

  useEffect(() => { load(); }, [search]);

  const handleSave = async () => {
    try {
      await api.post('/products', form);
      toast.success('Product added');
      setShowForm(false);
      load();
    } catch {
      toast.error('Failed to save');
    }
  };

  return (
    <div>
      <PageHeader title="Products" description="Fabric catalogue and stock">
        <Button variant="accent" onClick={() => setShowForm(!showForm)}><Plus className="h-4 w-4 mr-1" /> Add Product</Button>
      </PageHeader>

      {showForm && (
        <Card className="mb-4">
          <CardContent className="grid gap-4 p-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-1.5"><Label>Fabric Name *</Label><Input value={form.fabricName} onChange={(e) => setForm({ ...form, fabricName: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>Design No</Label><Input value={form.designNumber} onChange={(e) => setForm({ ...form, designNumber: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>Colour</Label><Input value={form.colour} onChange={(e) => setForm({ ...form, colour: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>Category</Label><Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>Rate (₹/mtr)</Label><Input type="number" value={form.rate} onChange={(e) => setForm({ ...form, rate: +e.target.value })} /></div>
            <div className="space-y-1.5"><Label>Stock (mtr)</Label><Input type="number" value={form.stockQuantity} onChange={(e) => setForm({ ...form, stockQuantity: +e.target.value })} /></div>
            <div className="space-y-1.5"><Label>Min Stock</Label><Input type="number" value={form.minStock} onChange={(e) => setForm({ ...form, minStock: +e.target.value })} /></div>
            <div className="flex items-end"><Button onClick={handleSave}>Save</Button></div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-4">
          <Input placeholder="Search fabric..." className="mb-4 max-w-sm" value={search} onChange={(e) => setSearch(e.target.value)} />
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fabric</TableHead>
                <TableHead>Design</TableHead>
                <TableHead>Colour</TableHead>
                <TableHead>Rate</TableHead>
                <TableHead>Stock</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.fabricName}</TableCell>
                  <TableCell>{p.designNumber || '-'}</TableCell>
                  <TableCell>{p.colour || '-'}</TableCell>
                  <TableCell>{formatCurrency(p.rate)}/mtr</TableCell>
                  <TableCell>
                    <Badge variant={p.stockQuantity <= p.minStock ? 'warning' : 'success'}>
                      {p.stockQuantity} mtr
                    </Badge>
                  </TableCell>
                  <TableCell>{p.category || '-'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
