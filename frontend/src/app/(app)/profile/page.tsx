'use client';

import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuthStore } from '@/stores/auth-store';

export default function ProfilePage() {
  const user = useAuthStore((s) => s.user);

  return (
    <div>
      <PageHeader title="Profile" />
      <Card className="max-w-md">
        <CardContent className="space-y-4 p-6">
          <div><p className="text-sm text-muted-foreground">Name</p><p className="font-semibold text-lg">{user?.name}</p></div>
          <div><p className="text-sm text-muted-foreground">Email</p><p>{user?.email}</p></div>
          <div><p className="text-sm text-muted-foreground">Role</p><Badge>{user?.role}</Badge></div>
          <div><p className="text-sm text-muted-foreground">Company</p><p className="font-semibold">{user?.company?.tradeName || user?.company?.name || '—'}</p></div>
          {user?.company?.gstin && (
            <div><p className="text-sm text-muted-foreground">GSTIN</p><p className="font-mono text-sm">{user.company.gstin}</p></div>
          )}
          {user?.company?.phone && (
            <div><p className="text-sm text-muted-foreground">Business phone</p><p>{user.company.phone}</p></div>
          )}
          <p className="text-xs text-muted-foreground pt-2 border-t">
            Update company details in Settings — they apply to challans, invoices, and prints.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
