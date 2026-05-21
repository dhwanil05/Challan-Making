'use client';

import type { ComponentProps } from 'react';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Layers, Loader2, Building2, User as UserIcon, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { api, ApiError } from '@/lib/api';
import { useAuthStore, User } from '@/stores/auth-store';
import { toast } from 'sonner';

const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/i;

const optionalPan = z
  .string()
  .optional()
  .transform((s) => (s?.trim() ? s.replace(/\s/g, '').toUpperCase() : undefined))
  .refine((s) => !s || /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(s), 'Invalid PAN');

const signupFormSchema = z
  .object({
    ownerName: z.string().min(2, 'Required'),
    ownerPhone: z.string().min(10, 'Required'),
    email: z.string().email(),
    password: z.string().min(8, 'Min 8 characters'),
    confirmPassword: z.string().min(1, 'Confirm password'),
    businessName: z.string().min(2, 'Business name required'),
    tradeName: z.string().optional(),
    gstin: z
      .string()
      .transform((s) => s.replace(/\s/g, '').toUpperCase())
      .refine((s) => s.length === 15, '15 characters')
      .refine((s) => GSTIN_REGEX.test(s), 'Invalid GSTIN'),
    pan: optionalPan,
    businessEmail: z.string().email(),
    businessPhone: z.string().min(10, 'Required'),
    address: z.string().min(5, 'Full address required'),
    city: z.string().min(2, 'Required'),
    state: z.string().min(2, 'Required'),
    pincode: z
      .string()
      .transform((s) => s.replace(/\s/g, ''))
      .refine((s) => /^\d{6}$/.test(s), '6-digit PIN'),
  })
  .refine((d) => d.password === d.confirmPassword, { message: 'Passwords do not match', path: ['confirmPassword'] });

type SignupForm = z.infer<typeof signupFormSchema>;

export default function RegisterPage() {
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignupForm>({
    resolver: zodResolver(signupFormSchema),
    defaultValues: {
      ownerName: '',
      ownerPhone: '',
      email: '',
      password: '',
      confirmPassword: '',
      businessName: '',
      tradeName: '',
      gstin: '',
      pan: '',
      businessEmail: '',
      businessPhone: '',
      address: '',
      city: '',
      state: 'Gujarat',
      pincode: '',
    },
  });

  const onSubmit = async (data: SignupForm) => {
    setLoading(true);
    try {
      const payload = {
        ownerName: data.ownerName,
        ownerPhone: data.ownerPhone,
        email: data.email,
        password: data.password,
        confirmPassword: data.confirmPassword,
        businessName: data.businessName,
        tradeName: data.tradeName || undefined,
        gstin: data.gstin,
        pan: data.pan?.trim() || undefined,
        businessEmail: data.businessEmail,
        businessPhone: data.businessPhone,
        address: data.address,
        city: data.city,
        state: data.state,
        pincode: data.pincode,
      };
      const res = await api.post<{ token: string; user: User }>('/auth/signup', payload);
      setAuth(res.token, res.user);
      toast.success('Account created. Welcome to U VITA ERP!');
      router.push('/dashboard');
    } catch (e) {
      const msg =
        e instanceof ApiError
          ? e.message
          : e instanceof TypeError
            ? 'Cannot reach API. Ensure the server is running.'
            : 'Registration failed';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const field = (name: keyof SignupForm, label: string, props?: Partial<ComponentProps<typeof Input>>) => (
    <div className="space-y-1.5">
      <Label htmlFor={String(name)}>{label}</Label>
      <Input id={String(name)} {...register(name)} {...props} />
      {errors[name] && <p className="text-xs text-destructive">{(errors[name] as { message?: string })?.message}</p>}
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 to-slate-200 py-10 px-4 dark:from-slate-900 dark:to-slate-800">
      <Card className="mx-auto w-full max-w-2xl shadow-xl">
        <CardHeader className="text-center border-b bg-card">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-slate-700 text-white">
            <Layers className="h-6 w-6" />
          </div>
          <CardTitle className="text-2xl">Create your account</CardTitle>
          <CardDescription>
            Register your business on U VITA ERP. You will be the company admin. All fields marked below are required for GST-compliant challans and invoices.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
            <section className="space-y-4">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
                <UserIcon className="h-4 w-4" /> Your account
              </h3>
              <div className="grid gap-4 sm:grid-cols-2">
                {field('ownerName', 'Your full name *')}
                {field('ownerPhone', 'Your mobile *', { type: 'tel', placeholder: '10-digit mobile' })}
                {field('email', 'Login email *', { type: 'email', autoComplete: 'email' })}
                {field('password', 'Password * (min 8 characters)', { type: 'password', autoComplete: 'new-password' })}
                {field('confirmPassword', 'Confirm password *', { type: 'password', autoComplete: 'new-password' })}
              </div>
            </section>

            <section className="space-y-4">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
                <Building2 className="h-4 w-4" /> Business details
              </h3>
              <div className="grid gap-4 sm:grid-cols-2">
                {field('businessName', 'Legal / firm name * (as on GST)')}
                {field('tradeName', 'Trade / display name (optional)', { placeholder: 'Same as firm if blank' })}
                {field('gstin', 'GSTIN *', { placeholder: '15 characters', className: 'font-mono uppercase' })}
                {field('pan', 'PAN (optional)', { placeholder: 'AAAAA9999A', className: 'font-mono uppercase' })}
                {field('businessEmail', 'Business email *', { type: 'email' })}
                {field('businessPhone', 'Office / business phone *', { type: 'tel' })}
              </div>
            </section>

            <section className="space-y-4">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
                <MapPin className="h-4 w-4" /> Registered address
              </h3>
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="address">Complete address *</Label>
                  <Input id="address" {...register('address')} placeholder="Shop no., building, street, area" />
                  {errors.address && <p className="text-xs text-destructive">{errors.address.message}</p>}
                </div>
                <div className="grid gap-4 sm:grid-cols-3">
                  {field('city', 'City *')}
                  {field('state', 'State *')}
                  {field('pincode', 'PIN code *', { placeholder: '395002' })}
                </div>
              </div>
            </section>

            <p className="text-xs text-muted-foreground">
              By registering you confirm that the business details are accurate. GSTIN must match your registration. Each GSTIN can only be used once on this platform.
            </p>

            <Button type="submit" className="w-full" variant="accent" size="lg" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create account & sign in
            </Button>

            <p className="text-center text-sm text-muted-foreground">
              Already have an account?{' '}
              <Link href="/login" className="font-medium text-accent underline-offset-4 hover:underline">
                Sign in
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
