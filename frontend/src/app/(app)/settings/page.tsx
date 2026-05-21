'use client';

import { useEffect, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { api, ApiError } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import { mapCompanyProfile, previewChallanNumber } from '@/lib/company';
import { toast } from 'sonner';

const TEXT_FIELDS = [
  ['name', 'Legal / company name'],
  ['tradeName', 'Trade / display name'],
  ['gstin', 'GSTIN'],
  ['address', 'Address'],
  ['city', 'City'],
  ['state', 'State'],
  ['phone', 'Phone'],
  ['email', 'Email'],
  ['challanPrefix', 'Challan prefix (e.g. KF)'],
  ['invoicePrefix', 'Invoice prefix'],
] as const;

type TaxPreset = '' | '0' | '5' | '12' | '18';

const TAX_PRESETS: { value: TaxPreset; label: string; cgst: number; sgst: number; igst: number }[] = [
  { value: '', label: 'Quick preset…', cgst: 0, sgst: 0, igst: 0 },
  { value: '0', label: '0% (no tax)', cgst: 0, sgst: 0, igst: 0 },
  { value: '5', label: '5% intra (2.5% CGST + 2.5% SGST) / 5% IGST', cgst: 2.5, sgst: 2.5, igst: 5 },
  { value: '12', label: '12% intra (6+6) / 12% IGST', cgst: 6, sgst: 6, igst: 12 },
  { value: '18', label: '18% intra (9+9) / 18% IGST', cgst: 9, sgst: 9, igst: 18 },
];

type CompanyForm = {
  name: string;
  tradeName: string;
  gstin: string;
  address: string;
  city: string;
  state: string;
  phone: string;
  email: string;
  challanPrefix: string;
  invoicePrefix: string;
  defaultCgst: number;
  defaultSgst: number;
  defaultIgst: number;
};

const emptyForm = (): CompanyForm => ({
  name: '',
  tradeName: '',
  gstin: '',
  address: '',
  city: '',
  state: '',
  phone: '',
  email: '',
  challanPrefix: '',
  invoicePrefix: '',
  defaultCgst: 0,
  defaultSgst: 0,
  defaultIgst: 0,
});

function normalizeCompany(d: Record<string, unknown>): CompanyForm {
  return {
    name: String(d.name ?? ''),
    tradeName: String(d.tradeName ?? ''),
    gstin: String(d.gstin ?? ''),
    address: String(d.address ?? ''),
    city: String(d.city ?? ''),
    state: String(d.state ?? ''),
    phone: String(d.phone ?? ''),
    email: String(d.email ?? ''),
    challanPrefix: String(d.challanPrefix ?? ''),
    invoicePrefix: String(d.invoicePrefix ?? ''),
    defaultCgst: Number(d.defaultCgst ?? 0),
    defaultSgst: Number(d.defaultSgst ?? 0),
    defaultIgst: Number(d.defaultIgst ?? 0),
  };
}

export default function SettingsPage() {
  const user = useAuthStore((s) => s.user);
  const updateCompany = useAuthStore((s) => s.updateCompany);
  const [company, setCompany] = useState<CompanyForm>(emptyForm);
  const [challanCounter, setChallanCounter] = useState(1);
  const [showResetPanel, setShowResetPanel] = useState(false);
  const [resetConfirmText, setResetConfirmText] = useState('');
  const [resettingChallan, setResettingChallan] = useState(false);
  const [notifications, setNotifications] = useState<Array<{ id: string; title: string; message: string; isRead: boolean }>>([]);

  const loadCompany = () =>
    api.get<{ data: Record<string, unknown> }>('/settings/company').then((r) => {
      setCompany(normalizeCompany(r.data));
      setChallanCounter(Number(r.data.challanCounter ?? 1));
    });

  useEffect(() => {
    loadCompany();
    api.get<{ data: typeof notifications }>('/settings/notifications').then((r) => setNotifications(r.data));
  }, []);

  const nextChallanPreview = previewChallanNumber(company.challanPrefix || 'KF', challanCounter);
  const resetPhraseOk = resetConfirmText === 'CONFIRM';

  const resetChallanCounter = async () => {
    if (!resetPhraseOk) {
      toast.error('Type CONFIRM in capital letters to reset');
      return;
    }
    setResettingChallan(true);
    try {
      const res = await api.post<{
        data: { challanCounter: number; nextChallanNumber: string; message: string };
      }>('/settings/company/reset-challan-counter', { confirm: 'CONFIRM' });
      setChallanCounter(res.data.challanCounter);
      setShowResetPanel(false);
      setResetConfirmText('');
      const fresh = await api.get<{ data: Record<string, unknown> }>('/settings/company');
      updateCompany(mapCompanyProfile(fresh.data));
      toast.success(res.data.message || `Next challan: ${res.data.nextChallanNumber}`);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Reset failed');
    } finally {
      setResettingChallan(false);
    }
  };

  const applyTaxPreset = (value: TaxPreset) => {
    if (!value) return;
    const p = TAX_PRESETS.find((x) => x.value === value);
    if (!p || !p.value) return;
    setCompany((c) => ({
      ...c,
      defaultCgst: p.cgst,
      defaultSgst: p.sgst,
      defaultIgst: p.igst,
    }));
  };

  const setTaxField = (key: 'defaultCgst' | 'defaultSgst' | 'defaultIgst', raw: string) => {
    const n = raw === '' ? 0 : Number.parseFloat(raw);
    setCompany((c) => ({ ...c, [key]: Number.isFinite(n) ? Math.min(100, Math.max(0, n)) : 0 }));
  };

  const saveCompany = async () => {
    try {
      const res = await api.put<{ data: Record<string, unknown> }>('/settings/company', company);
      const profile = mapCompanyProfile(res.data);
      updateCompany(profile);
      toast.success('Company updated — changes apply across challans, invoices & prints');
    } catch {
      toast.error('Failed to save');
    }
  };

  if (user?.role !== 'ADMIN') {
    return (
      <div>
        <PageHeader title="Settings" />
        <Card><CardContent className="p-6 text-muted-foreground">Contact admin to change company settings.</CardContent></Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Settings" description="Company profile — saved here updates sidebar, challans, invoices & prints" />
      <Card>
        <CardHeader><CardTitle className="text-base">Company Details</CardTitle></CardHeader>
        <CardContent className="grid gap-4 p-6 pt-0 sm:grid-cols-2">
          {TEXT_FIELDS.map(([field, label]) => (
            <div key={field} className="space-y-1.5">
              <Label htmlFor={field}>{label}</Label>
              <Input
                id={field}
                value={company[field]}
                onChange={(e) => setCompany({ ...company, [field]: e.target.value })}
              />
            </div>
          ))}

          <div className="sm:col-span-2 space-y-3 rounded-lg border bg-muted/30 p-4">
            <div>
              <p className="text-sm font-medium">Default tax rates (%)</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Intra-state challans use CGST + SGST (each applied on taxable value). Inter-state uses IGST. You can set all to 0 for tax-free defaults.
              </p>
            </div>
            <div className="space-y-1.5 max-w-xs">
              <Label htmlFor="taxPreset">Quick preset</Label>
              <select
                id="taxPreset"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                defaultValue=""
                onChange={(e) => {
                  applyTaxPreset(e.target.value as TaxPreset);
                  e.target.value = '';
                }}
              >
                {TAX_PRESETS.map((p) => (
                  <option key={p.value || 'blank'} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label htmlFor="defaultCgst">CGST %</Label>
                <Input
                  id="defaultCgst"
                  type="number"
                  min={0}
                  max={100}
                  step={0.25}
                  value={company.defaultCgst}
                  onChange={(e) => setTaxField('defaultCgst', e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="defaultSgst">SGST %</Label>
                <Input
                  id="defaultSgst"
                  type="number"
                  min={0}
                  max={100}
                  step={0.25}
                  value={company.defaultSgst}
                  onChange={(e) => setTaxField('defaultSgst', e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="defaultIgst">IGST % (inter-state)</Label>
                <Input
                  id="defaultIgst"
                  type="number"
                  min={0}
                  max={100}
                  step={0.25}
                  value={company.defaultIgst}
                  onChange={(e) => setTaxField('defaultIgst', e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="sm:col-span-2"><Button onClick={saveCompany}>Save Company</Button></div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Challan numbering</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 p-6 pt-0">
          <div className="rounded-lg border bg-muted/30 p-4 grid gap-3 sm:grid-cols-2">
            <div>
              <p className="text-xs text-muted-foreground">Current sequence</p>
              <p className="text-2xl font-bold font-mono tabular-nums">{challanCounter}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Next challan number</p>
              <p className="text-lg font-semibold">{nextChallanPreview}</p>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            Format: <span className="font-mono">{'{Prefix}/{YY}-{####}'}</span> — e.g.{' '}
            <span className="font-mono">KF/26-0005</span>. Set <strong>Challan prefix</strong> above (KF for Khushi Fashion).
            Used when you save, print, export, or duplicate a challan on any device.
            Existing challan numbers are <strong>not</strong> changed — only the next number issued.
          </p>

          {!showResetPanel ? (
            <Button
              variant="outline"
              className="border-amber-500/50 text-amber-800 dark:text-amber-200"
              onClick={() => {
                setShowResetPanel(true);
                setResetConfirmText('');
              }}
            >
              <AlertTriangle className="h-4 w-4 mr-2" />
              Reset sequence (start from 0001)
            </Button>
          ) : (
            <div className="rounded-lg border-2 border-destructive/40 bg-destructive/5 p-4 space-y-4">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-semibold text-destructive">Reset challan sequence</p>
                  <p className="text-muted-foreground mt-1">
                    The counter will go back to <strong>1</strong>. The next challan will be{' '}
                    <span className="font-mono font-semibold">
                      {previewChallanNumber(company.challanPrefix || 'KF', 1)}
                    </span>
                    . Old challans keep their existing numbers.
                  </p>
                </div>
              </div>
              <div className="space-y-1.5 max-w-xs">
                <Label htmlFor="resetConfirm">
                  Type <span className="font-mono font-bold">CONFIRM</span> to proceed
                </Label>
                <Input
                  id="resetConfirm"
                  value={resetConfirmText}
                  onChange={(e) => setResetConfirmText(e.target.value)}
                  placeholder="CONFIRM"
                  className="font-mono uppercase tracking-widest"
                  autoComplete="off"
                />
                {resetConfirmText.length > 0 && !resetPhraseOk && (
                  <p className="text-xs text-destructive">Must match CONFIRM exactly (capital letters).</p>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="destructive"
                  disabled={!resetPhraseOk || resettingChallan}
                  onClick={resetChallanCounter}
                >
                  {resettingChallan ? 'Resetting…' : 'Reset challan counter'}
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => {
                    setShowResetPanel(false);
                    setResetConfirmText('');
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Notifications</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {notifications.map((n) => (
            <div key={n.id} className={`rounded-lg border p-3 text-sm ${!n.isRead ? 'bg-blue-50 dark:bg-blue-950' : ''}`}>
              <p className="font-medium">{n.title}</p>
              <p className="text-muted-foreground">{n.message}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
