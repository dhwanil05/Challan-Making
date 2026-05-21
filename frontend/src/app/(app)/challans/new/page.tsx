'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Trash2, Save, Printer } from 'lucide-react';
import { PageHeader } from '@/components/shared/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { api, ApiError } from '@/lib/api';
import { calculateTotals, lineAmount } from '@/lib/calculations';
import { formatCurrency } from '@/lib/utils';
import { toast } from 'sonner';
import { useAuthStore } from '@/stores/auth-store';

interface Customer {
  id: string;
  name: string;
  address?: string;
  gstin?: string;
  mobile?: string;
  city?: string;
  state?: string;
}

interface LineItem {
  description: string;
  designNo: string;
  meter: number;
  rate: number;
}

const emptyLine = (): LineItem => ({ description: '', designNo: '', meter: 0, rate: 0 });

function parseNonNeg(raw: string, fallback = 0): number {
  if (raw === '' || raw === '.') return fallback;
  const n = Number.parseFloat(raw);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

export default function NewChallanPage() {
  const user = useAuthStore((s) => s.user);
  const router = useRouter();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [partyName, setPartyName] = useState('');
  const [partyAddress, setPartyAddress] = useState('');
  const [partyGstin, setPartyGstin] = useState('');
  const [partyMobile, setPartyMobile] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [transport, setTransport] = useState('');
  const [vehicleNo, setVehicleNo] = useState('');
  const [discount, setDiscount] = useState(0);
  const [isInterState, setIsInterState] = useState(false);
  const [items, setItems] = useState<LineItem[]>([emptyLine(), emptyLine(), emptyLine()]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get<{ data: Customer[] }>('/customers?limit=100').then((r) => setCustomers(r.data));
  }, []);

  const selectCustomer = (id: string) => {
    setCustomerId(id);
    const c = customers.find((x) => x.id === id);
    if (c) {
      setPartyName(c.name);
      setPartyAddress([c.address, c.city, c.state].filter(Boolean).join(', '));
      setPartyGstin(c.gstin || '');
      setPartyMobile(c.mobile || '');
    }
  };

  const updateItem = (idx: number, field: keyof LineItem, value: string | number) => {
    const next = [...items];
    next[idx] = { ...next[idx], [field]: value };
    setItems(next);
  };

  const cgst = user?.company?.defaultCgst ?? 2.5;
  const sgst = user?.company?.defaultSgst ?? 2.5;
  const igst = user?.company?.defaultIgst ?? 5;
  const defaultGstPercent = isInterState ? igst : cgst + sgst;
  const totals = calculateTotals(items.filter((i) => i.meter > 0), discount, isInterState, defaultGstPercent);

  const save = useCallback(async (status: 'DRAFT' | 'CONFIRMED') => {
    if (!partyName.trim()) {
      toast.error('Party name is required');
      return;
    }
    const validItems = items.filter((i) => i.description.trim() && i.meter > 0);
    if (!validItems.length) {
      toast.error('Add at least one line with description and meters');
      return;
    }
    const safeDiscount = Number.isFinite(discount) && discount >= 0 ? discount : 0;
    const payload = {
      customerId: customerId || undefined,
      partyName: partyName.trim(),
      partyAddress: partyAddress.trim() || undefined,
      partyGstin: partyGstin.trim() || undefined,
      partyMobile: partyMobile.trim() || undefined,
      transport: transport.trim() || undefined,
      vehicleNo: vehicleNo.trim() || undefined,
      discount: safeDiscount,
      isInterState,
      status,
      items: validItems.map(({ description, designNo, meter, rate }) => ({
        description: description.trim(),
        designNo: designNo.trim() || undefined,
        meter,
        rate,
      })),
    };
    setSaving(true);
    try {
      const res = await api.post<{ success: boolean; data: { id: string } }>('/challans', payload);
      toast.success(status === 'DRAFT' ? 'Draft saved' : 'Challan confirmed');
      router.push(`/challans/${res.data.id}`);
    } catch (e) {
      if (e instanceof ApiError) {
        const fieldMsg = e.errors
          ? Object.entries(e.errors)
              .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`)
              .join(' · ')
          : '';
        toast.error(fieldMsg ? `${e.message} (${fieldMsg})` : e.message);
      } else {
        toast.error('Failed to save challan');
      }
    } finally {
      setSaving(false);
    }
  }, [partyName, items, customerId, partyAddress, partyGstin, partyMobile, transport, vehicleNo, discount, isInterState, router]);

  return (
    <div className="space-y-4 pb-24 lg:pb-6">
      <PageHeader title="New Challan" description="Create delivery challan — mobile friendly" />

      <Card>
        <CardContent className="grid gap-4 p-4 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Select Customer</Label>
            <select className="flex h-10 w-full rounded-md border border-input bg-card px-3 text-sm" value={customerId} onChange={(e) => selectCustomer(e.target.value)}>
              <option value="">— New party —</option>
              {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="space-y-1.5"><Label>Party Name *</Label><Input value={partyName} onChange={(e) => setPartyName(e.target.value)} /></div>
          <div className="space-y-1.5"><Label>Mobile</Label><Input value={partyMobile} onChange={(e) => setPartyMobile(e.target.value)} /></div>
          <div className="space-y-1.5 sm:col-span-2"><Label>Address</Label><Input value={partyAddress} onChange={(e) => setPartyAddress(e.target.value)} /></div>
          <div className="space-y-1.5"><Label>GSTIN</Label><Input value={partyGstin} onChange={(e) => setPartyGstin(e.target.value)} /></div>
          <div className="space-y-1.5 flex items-center gap-2 pt-6">
            <input type="checkbox" id="inter" checked={isInterState} onChange={(e) => setIsInterState(e.target.checked)} />
            <Label htmlFor="inter">Inter-state (IGST)</Label>
          </div>
          <div className="space-y-1.5"><Label>Transport</Label><Input value={transport} onChange={(e) => setTransport(e.target.value)} /></div>
          <div className="space-y-1.5"><Label>Vehicle No</Label><Input value={vehicleNo} onChange={(e) => setVehicleNo(e.target.value)} /></div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-sm min-w-[640px]">
            <thead className="bg-muted">
              <tr>
                <th className="p-2 text-left w-8">#</th>
                <th className="p-2 text-left min-w-[140px]">Description</th>
                <th className="p-2 text-left w-28">Design No.</th>
                <th className="p-2 text-right w-20">Mtr</th>
                <th className="p-2 text-right w-24">Rate</th>
                <th className="p-2 text-right w-28">Amount</th>
                <th className="p-2 w-10"></th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, idx) => (
                <tr key={idx} className="border-t">
                  <td className="p-2">{idx + 1}</td>
                  <td className="p-1">
                    <Input
                      className="h-8 text-xs"
                      placeholder="Description"
                      value={item.description}
                      onChange={(e) => updateItem(idx, 'description', e.target.value)}
                    />
                  </td>
                  <td className="p-1">
                    <Input
                      className="h-8 text-xs"
                      placeholder="Optional"
                      value={item.designNo}
                      onChange={(e) => updateItem(idx, 'designNo', e.target.value)}
                    />
                  </td>
                  <td className="p-1">
                    <Input
                      className="h-8 text-xs text-right"
                      type="number"
                      min={0}
                      step={0.01}
                      value={item.meter || ''}
                      onChange={(e) => updateItem(idx, 'meter', parseNonNeg(e.target.value, 0))}
                    />
                  </td>
                  <td className="p-1">
                    <Input
                      className="h-8 text-xs text-right"
                      type="number"
                      min={0}
                      step={0.01}
                      value={item.rate || ''}
                      onChange={(e) => updateItem(idx, 'rate', parseNonNeg(e.target.value, 0))}
                    />
                  </td>
                  <td className="p-2 text-right font-medium">{formatCurrency(lineAmount(item.meter, item.rate))}</td>
                  <td className="p-1">
                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setItems(items.filter((_, i) => i !== idx))}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="p-3 border-t flex gap-2">
            <Button size="sm" variant="outline" onClick={() => setItems([...items, emptyLine()])}>
              <Plus className="h-4 w-4 mr-1" /> Add Row
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4 grid sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>Discount (₹)</Label>
            <Input
              type="number"
              min={0}
              step={0.01}
              value={discount || ''}
              onChange={(e) => setDiscount(parseNonNeg(e.target.value, 0))}
            />
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span>Subtotal</span><span>{formatCurrency(totals.subtotal)}</span></div>
            {!isInterState ? (
              <>
                <div className="flex justify-between"><span>CGST</span><span>{formatCurrency(totals.cgstAmount)}</span></div>
                <div className="flex justify-between"><span>SGST</span><span>{formatCurrency(totals.sgstAmount)}</span></div>
              </>
            ) : (
              <div className="flex justify-between"><span>IGST</span><span>{formatCurrency(totals.igstAmount)}</span></div>
            )}
            <div className="flex justify-between font-bold text-lg border-t pt-2"><span>Total</span><span>{formatCurrency(totals.totalAmount)}</span></div>
          </div>
        </CardContent>
      </Card>

      <div className="fixed bottom-0 left-0 right-0 lg:static flex gap-2 p-4 bg-card border-t lg:border-0 no-print">
        <Button variant="outline" className="flex-1" disabled={saving} onClick={() => save('DRAFT')}>
          <Save className="h-4 w-4 mr-1" /> Draft
        </Button>
        <Button variant="accent" className="flex-1" disabled={saving} onClick={() => save('CONFIRMED')}>
          <Printer className="h-4 w-4 mr-1" /> Save & Confirm
        </Button>
      </div>
    </div>
  );
}
