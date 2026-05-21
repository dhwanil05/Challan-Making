'use client';

import { formatCurrency, formatDate, formatNumber } from '@/lib/utils';
import { amountInWords } from '@/lib/amount-in-words';
import type { ChallanPrintData } from '@/components/challan/challan-print';

export type InvoicePrintProps = ChallanPrintData & {
  invoice: {
    invoiceNumber: string;
    date: string;
    dueDate?: string | null;
    status?: string;
    paidAmount?: number;
    balanceAmount?: number;
  };
};

export function InvoicePrint({ company, challan, invoice }: InvoicePrintProps) {
  const rows = challan.items.length
    ? challan.items.map((i) => ({
        description: i.description,
        designNo: i.designNo,
        meter: i.meter,
        rate: i.rate,
        amount: i.amount ?? i.meter * i.rate,
      }))
    : [];

  const totalMeters = rows.reduce((s, r) => s + r.meter, 0);
  const taxable = Math.max(0, challan.subtotal - challan.discount);
  const companyName = company.tradeName || company.name;
  const location = [company.city, company.state].filter(Boolean).join(', ');

  return (
    <article className="invoice-print-a4 print-area text-slate-900">
      {/* Header */}
      <header className="invoice-header">
        <div className="invoice-header-left">
          <h1 className="invoice-company-name">{companyName}</h1>
          {company.name !== companyName && (
            <p className="invoice-legal-name">{company.name}</p>
          )}
          <div className="invoice-company-meta">
            {company.address && <p>{company.address}</p>}
            {location && <p>{location}</p>}
            {company.phone && <p>Phone: {company.phone}</p>}
            {company.gstin && <p className="invoice-gstin">GSTIN: {company.gstin}</p>}
          </div>
        </div>
        <div className="invoice-header-right">
          <div className="invoice-badge">TAX INVOICE</div>
          <table className="invoice-meta-table">
            <tbody>
              <tr>
                <td>Invoice No.</td>
                <td>{invoice.invoiceNumber}</td>
              </tr>
              <tr>
                <td>Date</td>
                <td>{formatDate(invoice.date)}</td>
              </tr>
              {invoice.dueDate && (
                <tr>
                  <td>Due Date</td>
                  <td>{formatDate(invoice.dueDate)}</td>
                </tr>
              )}
              <tr>
                <td>Challan Ref.</td>
                <td>{challan.challanNumber}</td>
              </tr>
              {invoice.status && (
                <tr>
                  <td>Status</td>
                  <td className="invoice-status">{invoice.status}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </header>

      {/* Bill to */}
      <section className="invoice-parties">
        <div className="invoice-bill-to">
          <h2>Bill To</h2>
          <p className="invoice-party-name">M/s. {challan.partyName}</p>
          {challan.partyAddress && <p>{challan.partyAddress}</p>}
          <div className="invoice-party-row">
            {challan.partyMobile && <span>Mobile: {challan.partyMobile}</span>}
            {challan.partyGstin && <span>GSTIN: {challan.partyGstin}</span>}
          </div>
        </div>
        <div className="invoice-supply-note">
          <p>
            <strong>Place of supply:</strong> {company.state || '—'}
          </p>
          <p>
            <strong>Tax type:</strong> {challan.isInterState ? 'IGST (Inter-state)' : 'CGST + SGST (Intra-state)'}
          </p>
        </div>
      </section>

      {/* Line items */}
      <section className="invoice-table-wrap">
        <table className="invoice-items-table">
          <thead>
            <tr>
              <th className="col-sr">Sr</th>
              <th className="col-desc">Description of Goods</th>
              <th className="col-design">Design No.</th>
              <th className="col-qty">Qty (Mtr)</th>
              <th className="col-rate">Rate (₹)</th>
              <th className="col-amt">Amount (₹)</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((item, i) => (
              <tr key={i}>
                <td className="col-sr">{i + 1}</td>
                <td className="col-desc">{item.description}</td>
                <td className="col-design">{item.designNo || '—'}</td>
                <td className="col-qty">{formatNumber(item.meter)}</td>
                <td className="col-rate">{formatNumber(item.rate)}</td>
                <td className="col-amt">{formatNumber(item.amount)}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="invoice-empty">
                  No line items
                </td>
              </tr>
            )}
          </tbody>
          {rows.length > 0 && (
            <tfoot>
              <tr className="invoice-tfoot-total">
                <td colSpan={3} className="text-right">
                  <strong>Total</strong>
                </td>
                <td className="col-qty">
                  <strong>{formatNumber(totalMeters)}</strong>
                </td>
                <td />
                <td className="col-amt">
                  <strong>{formatNumber(challan.subtotal)}</strong>
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </section>

      {/* Totals + amount in words */}
      <section className="invoice-bottom">
        <div className="invoice-words">
          <p className="invoice-words-label">Amount in words</p>
          <p className="invoice-words-value">{amountInWords(challan.totalAmount)}</p>
          {(challan.transport || challan.vehicleNo) && (
            <div className="invoice-logistics">
              {challan.transport && <p>Transport: {challan.transport}</p>}
              {challan.vehicleNo && <p>Vehicle: {challan.vehicleNo}</p>}
            </div>
          )}
        </div>
        <div className="invoice-summary">
          <table className="invoice-summary-table">
            <tbody>
              <tr>
                <td>Subtotal</td>
                <td>{formatCurrency(challan.subtotal)}</td>
              </tr>
              {challan.discount > 0 && (
                <tr>
                  <td>Discount</td>
                  <td>-{formatCurrency(challan.discount)}</td>
                </tr>
              )}
              <tr>
                <td>Taxable value</td>
                <td>{formatCurrency(taxable)}</td>
              </tr>
              {!challan.isInterState ? (
                <>
                  <tr>
                    <td>CGST</td>
                    <td>{formatCurrency(challan.cgstAmount)}</td>
                  </tr>
                  <tr>
                    <td>SGST</td>
                    <td>{formatCurrency(challan.sgstAmount)}</td>
                  </tr>
                </>
              ) : (
                <tr>
                  <td>IGST</td>
                  <td>{formatCurrency(challan.igstAmount)}</td>
                </tr>
              )}
              <tr className="invoice-grand-total">
                <td>Grand Total</td>
                <td>{formatCurrency(challan.totalAmount)}</td>
              </tr>
              {invoice.paidAmount != null && invoice.paidAmount > 0 && (
                <tr>
                  <td>Paid</td>
                  <td>{formatCurrency(invoice.paidAmount)}</td>
                </tr>
              )}
              {invoice.balanceAmount != null && invoice.balanceAmount > 0 && (
                <tr className="invoice-balance-due">
                  <td>Balance Due</td>
                  <td>{formatCurrency(invoice.balanceAmount)}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Signatures */}
      <footer className="invoice-footer">
        <div className="invoice-sign">
          <div className="invoice-sign-line" />
          <p>Receiver&apos;s Signature</p>
        </div>
        <div className="invoice-sign">
          <div className="invoice-sign-line" />
          <p>For {companyName}</p>
          <p className="invoice-sign-sub">Authorised Signatory</p>
        </div>
      </footer>

      <p className="invoice-footnote">This is a computer-generated tax invoice.</p>
    </article>
  );
}
