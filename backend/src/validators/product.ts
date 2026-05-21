import { z } from 'zod';

export const productSchema = z.object({
  fabricName: z.string().min(1),
  designNumber: z.string().optional(),
  colour: z.string().optional(),
  category: z.string().optional(),
  rate: z.number().min(0),
  unit: z.string().optional(),
  stockQuantity: z.number().min(0).optional(),
  minStock: z.number().min(0).optional(),
  barcode: z.string().optional(),
  image: z.string().optional(),
  hsnCode: z.string().optional(),
  gstPercent: z.number().min(0).max(100).optional(),
  isActive: z.boolean().optional(),
});
