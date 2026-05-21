'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Printer, Copy, FileText, MessageCircle, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChallanPrint, ChallanPrintData } from '@/components/challan/challan-print';
import { api, ApiError } from '@/lib/api';
import { printWithFilename, applyPrintDocumentTitle } from '@/lib/print-document';
import { toast } from 'sonner';

export default function ChallanDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const printRef = useRef<HTMLDivElement>(null);
  const [data, setData] = useState<ChallanPrintData | null>(null);
  const [thermal, setThermal] = useState(false);

  useEffect(() => {
    api.get<{ data: Record<string, unknown> }>(`/challans/${id}`).then((res) => {
      const c = res.data as {
        challanNumber: string; date: string; partyName: string; partyAddress?: string;
        partyGstin?: string; partyMobile?: string; transport?: string; vehicleNo?: string;
        subtotal: number; discount: number; cgstAmount: number; sgstAmount: number;
        igstAmount: number; totalAmount: number; isInterState?: boolean; status: string;
        company: ChallanPrintData['company'];
        items: ChallanPrintData['challan']['items'];
      };
      setData({
        company: c.company,
        challan: {
          challanNumber: c.challanNumber,
          date: c.date,
          partyName: c.partyName,
          partyAddress: c.partyAddress,
          partyGstin: c.partyGstin,
          partyMobile: c.partyMobile,
          transport: c.transport,
          vehicleNo: c.vehicleNo,
          subtotal: c.subtotal,
          discount: c.discount,
          cgstAmount: c.cgstAmount,
          sgstAmount: c.sgstAmount,
          igstAmount: c.igstAmount,
          totalAmount: c.totalAmount,
          isInterState: c.isInterState,
          items: c.items,
        },
      });
    });
  }, [id]);

  useEffect(() => {
    return applyPrintDocumentTitle(data?.challan.challanNumber);
  }, [data?.challan.challanNumber]);

  const handlePrint = () => {
    if (!data) return;
    printWithFilename(data.challan.challanNumber);
  };

  const handleDuplicate = async () => {
    try {
      const res = await api.post<{ data: { id: string } }>(`/challans/${id}/duplicate`);
      toast.success('Challan duplicated');
      router.push(`/challans/${res.data.id}`);
    } catch {
      toast.error('Failed to duplicate');
    }
  };

  const handleConvertInvoice = async () => {
    try {
      const res = await api.post<{ data: { id: string } }>(`/invoices/from-challan/${id}`);
      toast.success('Invoice created');
      router.push(`/invoices/${res.data.id}`);
    } catch (e: unknown) {
      const msg = e instanceof ApiError ? e.message : 'Could not create invoice';
      toast.error(msg);
    }
  };

  const handleWhatsApp = () => {
    if (!data) return;
    const text = encodeURIComponent(
      `Delivery Challan ${data.challan.challanNumber}\nParty: ${data.challan.partyName}\nAmount: ₹${data.challan.totalAmount}\nDate: ${new Date(data.challan.date).toLocaleDateString('en-IN')}`
    );
    const phone = data.challan.partyMobile?.replace(/\D/g, '') || '';
    window.open(`https://wa.me/${phone ? '91' + phone.slice(-10) : ''}?text=${text}`, '_blank');
  };

  if (!data) {
    return <div className="flex h-64 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-300 border-t-slate-700" /></div>;
  }

  return (
    <div>
      <div className="no-print mb-4 flex flex-wrap items-center gap-2">
        <Link href="/challans"><Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4 mr-1" /> Back</Button></Link>
        <Badge>{(data.challan as { status?: string }).status || 'DRAFT'}</Badge>
        <div className="ml-auto flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => setThermal(!thermal)}>
            {thermal ? 'A4' : 'Thermal'}
          </Button>
          <Button variant="outline" size="sm" onClick={handleDuplicate}><Copy className="h-4 w-4 mr-1" /> Duplicate</Button>
          <Button variant="outline" size="sm" onClick={handleConvertInvoice}><FileText className="h-4 w-4 mr-1" /> To Invoice</Button>
          <Button variant="outline" size="sm" onClick={handleWhatsApp}><MessageCircle className="h-4 w-4 mr-1" /> WhatsApp</Button>
          <Button variant="accent" size="sm" onClick={handlePrint}><Printer className="h-4 w-4 mr-1" /> Print</Button>
        </div>
      </div>

      <div ref={printRef} className="bg-white rounded-lg border shadow-sm p-4">
        <ChallanPrint {...data} thermal={thermal} />
      </div>
    </div>
  );
}

