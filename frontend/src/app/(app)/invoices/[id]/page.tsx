'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, Printer, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { InvoicePrint, type InvoicePrintProps } from '@/components/invoice/invoice-print';
import type { ChallanPrintData } from '@/components/challan/challan-print';
import { api } from '@/lib/api';
import { printWithFilename, applyPrintDocumentTitle } from '@/lib/print-document';
import { formatCurrency, formatDate } from '@/lib/utils';

export default function InvoiceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [printData, setPrintData] = useState<InvoicePrintProps | null>(null);
  const [meta, setMeta] = useState<{
    invoiceNumber: string;
    status: string;
    totalAmount: number;
    date: string;
    balanceAmount?: number;
  } | null>(null);

  useEffect(() => {
    api
      .get<{ data: Record<string, unknown> }>(`/invoices/${id}`)
      .then((res) => {
        const inv = res.data;
        const challan = inv.challan as Record<string, unknown> | null | undefined;
        setMeta({
          invoiceNumber: String(inv.invoiceNumber),
          status: String(inv.status),
          totalAmount: Number(inv.totalAmount),
          date: String(inv.date),
          balanceAmount: Number(inv.balanceAmount ?? 0),
        });
        if (!challan || typeof challan !== 'object') {
          setPrintData(null);
          return;
        }
        const c = challan as {
          challanNumber: string;
          date: string;
          partyName: string;
          partyAddress?: string;
          partyGstin?: string;
          partyMobile?: string;
          transport?: string;
          vehicleNo?: string;
          subtotal: number;
          discount: number;
          cgstAmount: number;
          sgstAmount: number;
          igstAmount: number;
          totalAmount: number;
          isInterState?: boolean;
          items: ChallanPrintData['challan']['items'];
        };
        const company = inv.company as ChallanPrintData['company'];
        setPrintData({
          company,
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
            items: (c.items || []).map((item) => ({
              ...item,
              amount: item.amount ?? item.meter * item.rate,
            })),
          },
          invoice: {
            invoiceNumber: String(inv.invoiceNumber),
            date: String(inv.date),
            dueDate: inv.dueDate ? String(inv.dueDate) : null,
            status: String(inv.status),
            paidAmount: Number(inv.paidAmount ?? 0),
            balanceAmount: Number(inv.balanceAmount ?? 0),
          },
        });
      })
      .catch(() => {
        setPrintData(null);
        setMeta(null);
      });
  }, [id]);

  const saveAsName =
    printData?.challan.challanNumber ?? printData?.invoice?.invoiceNumber ?? meta?.invoiceNumber;

  useEffect(() => {
    return applyPrintDocumentTitle(saveAsName);
  }, [saveAsName]);

  const handlePrint = () => {
    if (!saveAsName) return;
    printWithFilename(saveAsName);
  };

  return (
    <div className="min-h-[calc(100vh-4rem)]">
      <div className="no-print sticky top-16 z-10 -mx-4 mb-6 border-b bg-background/95 px-4 py-3 backdrop-blur sm:mx-0 sm:rounded-lg sm:border sm:px-4">
        <div className="flex flex-wrap items-center gap-3">
          <Link href="/invoices">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-1" /> Invoices
            </Button>
          </Link>
          {meta && (
            <>
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <span className="font-semibold">{meta.invoiceNumber}</span>
                <Badge variant={meta.status === 'PAID' ? 'success' : 'warning'}>{meta.status}</Badge>
              </div>
              <span className="text-sm text-muted-foreground">
                {formatDate(meta.date)} · {formatCurrency(meta.totalAmount)}
                {(meta.balanceAmount ?? 0) > 0 && (
                  <> · Due {formatCurrency(meta.balanceAmount!)}</>
                )}
              </span>
            </>
          )}
          <div className="ml-auto flex gap-2">
            <Button variant="accent" size="sm" onClick={handlePrint} disabled={!printData}>
              <Printer className="h-4 w-4 mr-1" /> Print A4
            </Button>
          </div>
        </div>
      </div>

      {!printData && meta && (
        <div className="rounded-lg border bg-muted/30 p-8 text-center text-muted-foreground">
          <p>This invoice has no linked challan line items.</p>
          <p className="mt-2 font-medium text-foreground">
            {formatDate(meta.date)} — {formatCurrency(meta.totalAmount)}
          </p>
        </div>
      )}

      {printData && (
        <div className="invoice-preview-stage py-6 px-2 sm:px-4">
          <InvoicePrint {...printData} />
        </div>
      )}
    </div>
  );
}
