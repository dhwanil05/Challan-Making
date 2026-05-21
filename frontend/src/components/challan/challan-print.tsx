'use client';

import { formatCurrency, formatDate, formatNumber } from '@/lib/utils';

export interface ChallanPrintLine {
  description: string;
  designNo?: string | null;
  meter: number;
  rate: number;
  amount?: number;
}

export interface ChallanPrintData {
  company: {
    name: string;
    tradeName?: string;
    gstin?: string;
    address?: string;
    city?: string;
    state?: string;
    phone?: string;
  };
  challan: {
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
    items: ChallanPrintLine[];
  };
  /** When set, header shows tax invoice + invoice number (challan lines still shown, incl. design no.). */
  invoice?: {
    invoiceNumber: string;
    date: string;
    dueDate?: string | null;
    status?: string;
    paidAmount?: number;
    balanceAmount?: number;
  };
  thermal?: boolean;
}

export function ChallanPrint({ company, challan, invoice, thermal }: ChallanPrintData & { thermal?: boolean }) {
  const rows = challan.items.length
    ? challan.items.map((i) => ({
        description: i.description,
        designNo: i.designNo,
        meter: i.meter,
        rate: i.rate,
        amount: i.amount ?? i.meter * i.rate,
      }))
    : [{ description: '', designNo: '', meter: 0, rate: 0, amount: 0 }];
  const emptyRows = Math.max(0, 8 - rows.length);

  const isInvoice = Boolean(invoice);
  const docTitle = isInvoice ? 'TAX INVOICE' : 'DELIVERY CHALLAN';
  const refLabel = isInvoice ? 'Inv. No' : 'Ch. No';
  const refNumber = isInvoice ? invoice!.invoiceNumber : challan.challanNumber;
  const docDate = isInvoice ? invoice!.date : challan.date;

  return (
    <div className={`challan-print print-area bg-white text-black p-2 ${thermal ? 'thermal-print' : 'max-w-[210mm] mx-auto'}`}>
      <table style={{ border: 'none', marginBottom: 4 }}>
        <tbody>
          <tr>
            <td style={{ border: 'none', width: '60%', verticalAlign: 'top' }}>
              <div style={{ fontSize: thermal ? 14 : 18, fontWeight: 'bold', letterSpacing: 1 }}>
                {company.tradeName || company.name}
              </div>
              <div style={{ fontSize: 10, marginTop: 2 }}>
                {company.address}
                {company.city && `, ${company.city}`}
                {company.state && ` - ${company.state}`}
              </div>
              {company.phone && <div style={{ fontSize: 10 }}>Mo: {company.phone}</div>}
            </td>
            <td style={{ border: 'none', textAlign: 'right', verticalAlign: 'top' }}>
              <div style={{ fontSize: 12, fontWeight: 'bold' }}>{docTitle}</div>
              {company.gstin && <div style={{ fontSize: 10 }}>GSTIN: {company.gstin}</div>}
            </td>
          </tr>
        </tbody>
      </table>

      <table style={{ marginBottom: 4 }}>
        <tbody>
          <tr>
            <td colSpan={2} style={{ fontWeight: 'bold' }}>
              M/s. {challan.partyName}
            </td>
            <td className="text-right" style={{ width: 140 }}>
              <strong>{refLabel}:</strong> {refNumber}
            </td>
          </tr>
          {isInvoice && (
            <tr>
              <td colSpan={2} style={{ fontSize: 10 }}>
                <strong>Challan ref:</strong> {challan.challanNumber}
              </td>
              <td className="text-right" style={{ fontSize: 10 }}>
                {invoice!.dueDate && (
                  <>
                    <strong>Due:</strong> {formatDate(invoice!.dueDate)}
                  </>
                )}
              </td>
            </tr>
          )}
          <tr>
            <td colSpan={2} style={{ fontSize: 10 }}>
              {challan.partyAddress || ''}
              {challan.partyMobile && ` | ${challan.partyMobile}`}
            </td>
            <td className="text-right">
              <strong>Date:</strong> {formatDate(docDate)}
            </td>
          </tr>
          {challan.partyGstin && (
            <tr>
              <td colSpan={3} style={{ fontSize: 10 }}>
                GSTIN: {challan.partyGstin}
              </td>
            </tr>
          )}
        </tbody>
      </table>

      <table>
        <thead>
          <tr style={{ background: '#f5f5f5' }}>
            <th style={{ width: 24 }} className="text-center">Sr</th>
            <th>Description</th>
            <th style={{ width: 72 }} className="text-left">
              Design No.
            </th>
            <th style={{ width: 55 }} className="text-right">Mtr</th>
            <th style={{ width: 55 }} className="text-right">Rate</th>
            <th style={{ width: 65 }} className="text-right">Amount</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((item, i) => (
            <tr key={i}>
              <td className="text-center">{i + 1}</td>
              <td>{item.description}</td>
              <td style={{ fontSize: 10 }}>{item.designNo || '—'}</td>
              <td className="text-right">{formatNumber(item.meter)}</td>
              <td className="text-right">{formatNumber(item.rate)}</td>
              <td className="text-right">{formatNumber(item.amount ?? item.meter * item.rate)}</td>
            </tr>
          ))}
          {Array.from({ length: emptyRows }).map((_, i) => (
            <tr key={`e-${i}`}>
              <td>&nbsp;</td>
              <td></td>
              <td></td>
              <td></td>
              <td></td>
              <td></td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td colSpan={3} className="text-right" style={{ fontWeight: 'bold' }}>
              Total
            </td>
            <td className="text-right" style={{ fontWeight: 'bold' }}>
              {formatNumber(rows.reduce((s, r) => s + r.meter, 0))}
            </td>
            <td></td>
            <td className="text-right" style={{ fontWeight: 'bold' }}>
              {formatNumber(challan.subtotal)}
            </td>
          </tr>
        </tfoot>
      </table>

      <table style={{ marginTop: 4, width: '100%' }}>
        <tbody>
          <tr>
            <td style={{ border: 'none', width: '55%', verticalAlign: 'top', fontSize: 9 }}>
              {challan.transport && <div>Transport: {challan.transport}</div>}
              {challan.vehicleNo && <div>Vehicle: {challan.vehicleNo}</div>}
            </td>
            <td style={{ border: 'none', width: '45%' }}>
              <table>
                <tbody>
                  <tr>
                    <td>Sub Total</td>
                    <td className="text-right">{formatCurrency(challan.subtotal)}</td>
                  </tr>
                  {challan.discount > 0 && (
                    <tr>
                      <td>Discount</td>
                      <td className="text-right">-{formatCurrency(challan.discount)}</td>
                    </tr>
                  )}
                  {!challan.isInterState ? (
                    <>
                      <tr>
                        <td>CGST</td>
                        <td className="text-right">{formatCurrency(challan.cgstAmount)}</td>
                      </tr>
                      <tr>
                        <td>SGST</td>
                        <td className="text-right">{formatCurrency(challan.sgstAmount)}</td>
                      </tr>
                    </>
                  ) : (
                    <tr>
                      <td>IGST</td>
                      <td className="text-right">{formatCurrency(challan.igstAmount)}</td>
                    </tr>
                  )}
                  <tr style={{ fontWeight: 'bold', fontSize: 12 }}>
                    <td>Grand Total</td>
                    <td className="text-right">{formatCurrency(challan.totalAmount)}</td>
                  </tr>
                </tbody>
              </table>
            </td>
          </tr>
        </tbody>
      </table>

      <table style={{ border: 'none', marginTop: 24 }}>
        <tbody>
          <tr>
            <td style={{ border: 'none', width: '50%', textAlign: 'center', fontSize: 10 }}>
              <div style={{ borderTop: '1px solid #000', display: 'inline-block', minWidth: 120, paddingTop: 4 }}>
                Receiver&apos;s Sign
              </div>
            </td>
            <td style={{ border: 'none', width: '50%', textAlign: 'center', fontSize: 10 }}>
              <div style={{ borderTop: '1px solid #000', display: 'inline-block', minWidth: 120, paddingTop: 4 }}>
                For {company.tradeName || company.name}
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
