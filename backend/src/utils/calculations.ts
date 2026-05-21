export interface LineItem {
  meter: number;
  rate: number;
  gstPercent?: number;
}

export interface TaxBreakdown {
  subtotal: number;
  discount: number;
  taxableAmount: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  totalAmount: number;
  roundOff: number;
}

export function calculateLineAmount(meter: number, rate: number): number {
  return Math.round(meter * rate * 100) / 100;
}

export function calculateChallanTotals(
  items: LineItem[],
  discount = 0,
  isInterState = false,
  defaultGst = 5
): TaxBreakdown {
  const subtotal = items.reduce(
    (sum, item) => sum + calculateLineAmount(item.meter, item.rate),
    0
  );
  const afterDiscount = Math.max(0, subtotal - discount);
  const taxableAmount = afterDiscount;

  let cgstAmount = 0;
  let sgstAmount = 0;
  let igstAmount = 0;

  if (isInterState) {
    const avgGst =
      items.length > 0
        ? items.reduce((s, i) => s + (i.gstPercent ?? defaultGst), 0) / items.length
        : defaultGst;
    igstAmount = Math.round((taxableAmount * avgGst) / 100 * 100) / 100;
  } else {
    const avgGst =
      items.length > 0
        ? items.reduce((s, i) => s + (i.gstPercent ?? defaultGst), 0) / items.length
        : defaultGst;
    const half = (avgGst / 2 / 100) * taxableAmount;
    cgstAmount = Math.round(half * 100) / 100;
    sgstAmount = Math.round(half * 100) / 100;
  }

  const totalBeforeRound =
    taxableAmount + cgstAmount + sgstAmount + igstAmount;
  const rounded = Math.round(totalBeforeRound);
  const roundOff = Math.round((rounded - totalBeforeRound) * 100) / 100;

  return {
    subtotal,
    discount,
    taxableAmount,
    cgstAmount,
    sgstAmount,
    igstAmount,
    totalAmount: rounded,
    roundOff,
  };
}

export async function generateChallanNumber(
  companyId: string,
  prefix: string,
  counter: number
): Promise<string> {
  const year = new Date().getFullYear().toString().slice(-2);
  const num = String(counter).padStart(4, '0');
  return `${prefix}/${year}-${num}`;
}

export async function generateInvoiceNumber(
  companyId: string,
  prefix: string,
  counter: number
): Promise<string> {
  const year = new Date().getFullYear().toString().slice(-2);
  const num = String(counter).padStart(4, '0');
  return `${prefix}/${year}-${num}`;
}
