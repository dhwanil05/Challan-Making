import type { Prisma } from '@prisma/client';

export type Tx = Prisma.TransactionClient;

function year2(): string {
  return new Date().getFullYear().toString().slice(-2);
}

/** e.g. KF/26-0005 */
export function formatChallanNumber(prefix: string, yy: string, seq: number): string {
  const p = prefix.trim() || 'CH';
  return `${p}/${yy}-${String(seq).padStart(4, '0')}`;
}

/** e.g. INV/26-0001 */
export function formatInvoiceNumber(prefix: string, yy: string, seq: number): string {
  return `${prefix}/${yy}-${String(seq).padStart(4, '0')}`;
}

/**
 * Pick the next challan number for this company that is not already in the DB,
 * starting from `company.challanCounter` (fixes counter drift vs existing rows).
 */
export async function allocateChallanNumber(tx: Tx, companyId: string): Promise<{ challanNumber: string; seq: number }> {
  const yy = year2();
  const company = await tx.company.findUniqueOrThrow({
    where: { id: companyId },
    select: { challanPrefix: true, challanCounter: true },
  });
  let seq = company.challanCounter;
  for (let guard = 0; guard < 10_000; guard++) {
    const challanNumber = formatChallanNumber(company.challanPrefix, yy, seq);
    const taken = await tx.challan.findFirst({
      where: { companyId, challanNumber },
      select: { id: true },
    });
    if (!taken) return { challanNumber, seq };
    seq += 1;
  }
  throw new Error('Could not allocate a unique challan number');
}

export async function allocateInvoiceNumber(tx: Tx, companyId: string): Promise<{ invoiceNumber: string; seq: number }> {
  const yy = year2();
  const company = await tx.company.findUniqueOrThrow({
    where: { id: companyId },
    select: { invoicePrefix: true, invoiceCounter: true },
  });
  let seq = company.invoiceCounter;
  for (let guard = 0; guard < 10_000; guard++) {
    const invoiceNumber = formatInvoiceNumber(company.invoicePrefix, yy, seq);
    const taken = await tx.invoice.findFirst({
      where: { companyId, invoiceNumber },
      select: { id: true },
    });
    if (!taken) return { invoiceNumber, seq };
    seq += 1;
  }
  throw new Error('Could not allocate a unique invoice number');
}
