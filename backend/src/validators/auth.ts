import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email().transform((e) => e.trim().toLowerCase()),
  password: z.string().min(6),
});

export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(2),
  role: z.enum(['ADMIN', 'STAFF', 'ACCOUNTANT']).optional(),
  companyId: z.string().optional(),
});

/** Indian GSTIN: 15 chars — 2 state + 10 PAN-like + entity + Z + checksum */
const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/i;

const optionalPan = z
  .string()
  .optional()
  .transform((s) => (s ? s.replace(/\s/g, '').toUpperCase() : undefined))
  .refine((s) => !s || /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(s), 'Invalid PAN format');

export const signupSchema = z
  .object({
    ownerName: z.string().min(2, 'Enter your full name').max(120),
    ownerPhone: z
      .string()
      .min(10, 'Enter a valid mobile number')
      .max(20)
      .transform((s) => s.replace(/\D/g, ''))
      .refine((d) => d.length >= 10, 'Enter a valid mobile number'),

    email: z.string().email().transform((e) => e.trim().toLowerCase()),
    password: z.string().min(8, 'Password must be at least 8 characters').max(128),
    confirmPassword: z.string().min(1, 'Confirm your password'),

    businessName: z.string().min(2, 'Business / firm name is required').max(200),
    tradeName: z.string().max(200).optional(),
    gstin: z
      .string()
      .transform((s) => s.replace(/\s/g, '').toUpperCase())
      .refine((s) => s.length === 15, 'GSTIN must be 15 characters')
      .refine((s) => GSTIN_REGEX.test(s), 'Invalid GSTIN format'),
    pan: optionalPan,
    businessEmail: z.string().email('Enter a valid business email'),
    businessPhone: z
      .string()
      .min(10, 'Business phone is required')
      .max(20)
      .transform((s) => s.replace(/\D/g, ''))
      .refine((d) => d.length >= 10, 'Enter a valid business phone'),

    address: z.string().min(5, 'Street address is required').max(500),
    city: z.string().min(2, 'City is required').max(100),
    state: z.string().min(2, 'State is required').max(100),
    pincode: z
      .string()
      .transform((s) => s.replace(/\s/g, ''))
      .refine((s) => /^\d{6}$/.test(s), 'PIN code must be 6 digits'),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export type SignupInput = z.infer<typeof signupSchema>;
