import type { CompanyProfile } from '@/stores/auth-store';

/** e.g. KF/26-0005 */
export function previewChallanNumber(prefix: string, counter: number, date = new Date()): string {
  const yy = date.getFullYear().toString().slice(-2);
  const p = prefix.trim() || 'CH';
  return `${p}/${yy}-${String(counter).padStart(4, '0')}`;
}

export function mapCompanyProfile(d: Record<string, unknown>): CompanyProfile {
  return {
    id: String(d.id ?? ''),
    name: String(d.name ?? ''),
    tradeName: d.tradeName ? String(d.tradeName) : undefined,
    gstin: d.gstin ? String(d.gstin) : undefined,
    address: d.address ? String(d.address) : undefined,
    city: d.city ? String(d.city) : undefined,
    state: d.state ? String(d.state) : undefined,
    pincode: d.pincode ? String(d.pincode) : undefined,
    phone: d.phone ? String(d.phone) : undefined,
    email: d.email ? String(d.email) : undefined,
    challanPrefix: d.challanPrefix ? String(d.challanPrefix) : undefined,
    invoicePrefix: d.invoicePrefix ? String(d.invoicePrefix) : undefined,
    challanCounter: Number(d.challanCounter ?? 1),
    invoiceCounter: Number(d.invoiceCounter ?? 1),
    defaultCgst: Number(d.defaultCgst ?? 0),
    defaultSgst: Number(d.defaultSgst ?? 0),
    defaultIgst: Number(d.defaultIgst ?? 0),
  };
}
