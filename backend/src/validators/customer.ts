import { z } from 'zod';

export const customerSchema = z.object({
  name: z.string().min(1),
  gstin: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  pincode: z.string().optional(),
  mobile: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  creditLimit: z.number().optional(),
  notes: z.string().optional(),
  isActive: z.boolean().optional(),
});
