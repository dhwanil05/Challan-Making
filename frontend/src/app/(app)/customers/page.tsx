'use client';

import { useEffect, useState } from 'react';
import { Plus, Search, Download, Upload, Pencil, Trash2, X, RotateCcw } from 'lucide-react';
import * as XLSX from 'xlsx';
import { PageHeader } from '@/components/shared/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { api, ApiError } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { toast } from 'sonner';

interface Customer {
  id: string;
  name: string;
  gstin?: string;
  mobile?: string;
  email?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  outstandingBalance: number;
  isActive: boolean;
}

type CustomerForm = {
  name: string;
  gstin: string;
  mobile: string;
  email: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
};

const emptyForm = (): CustomerForm => ({
  name: '',
  gstin: '',
  mobile: '',
  email: '',
  address: '',
  city: '',
  state: '',
  pincode: '',
});

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState('');
  const [showInactive, setShowInactive] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<CustomerForm>(emptyForm());
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    const params = new URLSearchParams({ search, limit: '100' });
    if (showInactive) params.set('includeInactive', 'true');
    api
      .get<{ data: Customer[] }>(`/customers?${params}`)
      .then((r) => setCustomers(r.data))
      .catch(() => toast.error('Failed to load'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, [search, showInactive]);

  const openAdd = () => {
    setEditingId(null);
    setForm(emptyForm());
    setShowForm(true);
  };

  const openEdit = (c: Customer) => {
    setEditingId(c.id);
    setForm({
      name: c.name,
      gstin: c.gstin || '',
      mobile: c.mobile || '',
      email: c.email || '',
      address: c.address || '',
      city: c.city || '',
      state: c.state || '',
      pincode: c.pincode || '',
    });
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingId(null);
    setForm(emptyForm());
  };

  const payloadFromForm = () => ({
    name: form.name.trim(),
    gstin: form.gstin.trim() || undefined,
    mobile: form.mobile.trim() || undefined,
    email: form.email.trim() || undefined,
    address: form.address.trim() || undefined,
    city: form.city.trim() || undefined,
    state: form.state.trim() || undefined,
    pincode: form.pincode.trim() || undefined,
  });

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error('Name is required');
      return;
    }
    setSaving(true);
    try {
      if (editingId) {
        await api.put(`/customers/${editingId}`, payloadFromForm());
        toast.success('Customer updated');
      } else {
        await api.post('/customers', payloadFromForm());
        toast.success('Customer added');
      }
      closeForm();
      load();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (c: Customer) => {
    if (
      !window.confirm(
        `Remove "${c.name}"?\n\nThey will be marked inactive and hidden from new challans. You can restore them later.`
      )
    ) {
      return;
    }
    try {
      await api.delete(`/customers/${c.id}`);
      toast.success('Customer removed');
      load();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Failed to remove');
    }
  };

  const handleRestore = async (c: Customer) => {
    try {
      await api.put(`/customers/${c.id}`, { isActive: true });
      toast.success('Customer restored');
      load();
    } catch {
      toast.error('Failed to restore');
    }
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const wb = XLSX.read(ev.target?.result, { type: 'binary' });
      const rows = XLSX.utils.sheet_to_json<Record<string, string>>(wb.Sheets[wb.SheetNames[0]]);
      try {
        await api.post('/export/import/customers', { rows });
        toast.success(`Imported ${rows.length} customers`);
        load();
      } catch {
        toast.error('Import failed');
      }
    };
    reader.readAsBinaryString(file);
    e.target.value = '';
  };

  return (
    <div>
      <PageHeader title="Customers" description="Manage party accounts and ledgers">
        <Button variant="outline" onClick={() => api.download('/export/customers', 'customers.xlsx')}>
          <Download className="h-4 w-4 mr-1" /> Export
        </Button>
        <label>
          <Button variant="outline" asChild>
            <span>
              <Upload className="h-4 w-4 mr-1" /> Import
            </span>
          </Button>
          <input type="file" accept=".xlsx,.xls" className="hidden" onChange={handleImport} />
        </label>
        <Button variant="accent" onClick={() => (showForm && !editingId ? closeForm() : openAdd())}>
          <Plus className="h-4 w-4 mr-1" /> Add Customer
        </Button>
      </PageHeader>

      {showForm && (
        <Card className="mb-4">
          <CardHeader className="flex flex-row items-center justify-between py-4">
            <CardTitle className="text-base">{editingId ? 'Edit Customer' : 'New Customer'}</CardTitle>
            <Button variant="ghost" size="icon" onClick={closeForm} aria-label="Close">
              <X className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent className="grid gap-4 p-4 pt-0 sm:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-1.5">
              <Label>Name *</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>GSTIN</Label>
              <Input value={form.gstin} onChange={(e) => setForm({ ...form, gstin: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Mobile</Label>
              <Input value={form.mobile} onChange={(e) => setForm({ ...form, mobile: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Address</Label>
              <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>City</Label>
              <Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>State</Label>
              <Input value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>PIN Code</Label>
              <Input value={form.pincode} onChange={(e) => setForm({ ...form, pincode: e.target.value })} />
            </div>
            <div className="flex items-end gap-2 sm:col-span-2 lg:col-span-3">
              <Button onClick={handleSave} disabled={saving}>
                {editingId ? 'Update Customer' : 'Save Customer'}
              </Button>
              <Button variant="outline" onClick={closeForm}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-4">
          <div className="mb-4 flex flex-wrap items-center gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search name, mobile, GSTIN..."
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
              <input
                type="checkbox"
                checked={showInactive}
                onChange={(e) => setShowInactive(e.target.checked)}
              />
              Show inactive
            </label>
          </div>
          {loading ? (
            <p className="py-8 text-center text-muted-foreground">Loading...</p>
          ) : customers.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">No customers found.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Mobile</TableHead>
                  <TableHead>City</TableHead>
                  <TableHead>GSTIN</TableHead>
                  <TableHead className="text-right">Outstanding</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right w-[140px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {customers.map((c) => (
                  <TableRow key={c.id} className={!c.isActive ? 'opacity-60' : undefined}>
                    <TableCell className="font-medium">{c.name}</TableCell>
                    <TableCell>{c.mobile || '—'}</TableCell>
                    <TableCell>{c.city || '—'}</TableCell>
                    <TableCell className="text-xs">{c.gstin || '—'}</TableCell>
                    <TableCell className="text-right font-semibold">
                      {formatCurrency(c.outstandingBalance)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={c.isActive ? 'success' : 'secondary'}>
                        {c.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8"
                          title="Edit"
                          onClick={() => openEdit(c)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        {c.isActive ? (
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            title="Remove"
                            onClick={() => handleDelete(c)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        ) : (
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8"
                            title="Restore"
                            onClick={() => handleRestore(c)}
                          >
                            <RotateCcw className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
