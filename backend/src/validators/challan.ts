import { z } from 'zod';

/** JSON can send numbers as strings; empty / null / NaN must not fail validation. */
function nonNegNumber(defaultWhenEmpty = 0) {
  return z.preprocess((val) => {
    if (val === undefined || val === null || val === '') return defaultWhenEmpty;
    const n = typeof val === 'number' ? val : Number(val);
    if (!Number.isFinite(n)) return defaultWhenEmpty;
    return Math.max(0, n);
  }, z.number().min(0));
}

const optTrimmed = (max: number) =>
  z.preprocess((v) => {
    if (v === undefined || v === null || v === '') return undefined;
    const s = String(v).trim().slice(0, max);
    return s.length ? s : undefined;
  }, z.string().max(max).optional());

export const challanItemSchema = z.object({
  productId: z.string().optional(),
  description: z.string().min(1),
  designNo: optTrimmed(200),
  colour: optTrimmed(200),
  meter: nonNegNumber(0),
  pieces: z.number().int().optional(),
  rate: nonNegNumber(0),
  hsnCode: z.string().optional(),
  gstPercent: z.number().optional(),
  sortOrder: z.number().optional(),
});

/** For PATCH: leave undefined; for POST body omitting discount, preprocess still yields 0 when we use .default — use explicit default on route instead. */
const discountField = z.preprocess((val) => {
  if (val === undefined) return undefined;
  if (val === null || val === '' || (typeof val === 'number' && Number.isNaN(val))) return 0;
  const n = typeof val === 'number' ? val : Number(val);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, n);
}, z.number().min(0).optional());

export const challanSchema = z.object({
  customerId: z.string().optional(),
  date: z.string().optional(),
  partyName: z.string().min(1),
  partyAddress: z.string().optional(),
  partyGstin: z.string().optional(),
  partyMobile: z.string().optional(),
  status: z.enum(['DRAFT', 'CONFIRMED', 'CANCELLED']).optional(),
  discount: discountField,
  notes: z.string().optional(),
  transport: z.string().optional(),
  vehicleNo: z.string().optional(),
  isInterState: z.boolean().optional(),
  items: z.array(challanItemSchema).min(1),
});
