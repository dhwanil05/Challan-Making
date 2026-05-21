export interface ChallanLineItem {
  meter: number;
  rate: number;
  gstPercent?: number;
}

export function lineAmount(meter: number, rate: number) {
  return Math.round(meter * rate * 100) / 100;
}

export function calculateTotals(
  items: ChallanLineItem[],
  discount = 0,
  isInterState = false,
  defaultGst = 5
) {
  const subtotal = items.reduce((s, i) => s + lineAmount(i.meter, i.rate), 0);
  const taxableAmount = Math.max(0, subtotal - discount);
  const avgGst =
    items.length > 0
      ? items.reduce((s, i) => s + (i.gstPercent ?? defaultGst), 0) / items.length
      : defaultGst;

  let cgstAmount = 0;
  let sgstAmount = 0;
  let igstAmount = 0;

  if (isInterState) {
    igstAmount = Math.round((taxableAmount * avgGst) / 100 * 100) / 100;
  } else {
    const half = (avgGst / 2 / 100) * taxableAmount;
    cgstAmount = Math.round(half * 100) / 100;
    sgstAmount = Math.round(half * 100) / 100;
  }

  const totalBeforeRound = taxableAmount + cgstAmount + sgstAmount + igstAmount;
  const totalAmount = Math.round(totalBeforeRound);
  const roundOff = Math.round((totalAmount - totalBeforeRound) * 100) / 100;

  return { subtotal, discount, taxableAmount, cgstAmount, sgstAmount, igstAmount, totalAmount, roundOff };
}
