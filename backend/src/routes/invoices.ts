import { Router } from 'express';
import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { getPagination, paginatedResponse } from '../utils/pagination.js';
import { allocateInvoiceNumber } from '../utils/documentNumbers.js';
import { badRequest, notFound } from '../lib/errors.js';

function isUniqueConstraintError(e: unknown): boolean {
  return e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002';
}

const router = Router();

router.get('/', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const companyId = req.user!.companyId!;
    const { page, limit, skip } = getPagination(req.query as { page?: string; limit?: string });
    const status = req.query.status as string;

    const where = {
      companyId,
      ...(status && { status: status as 'DRAFT' | 'SENT' | 'PARTIAL' | 'PAID' | 'OVERDUE' | 'CANCELLED' }),
    };

    const [invoices, total] = await Promise.all([
      prisma.invoice.findMany({
        where,
        skip,
        take: limit,
        orderBy: { date: 'desc' },
        include: { customer: true, challan: true, payments: true },
      }),
      prisma.invoice.count({ where }),
    ]);

    res.json({ success: true, ...paginatedResponse(invoices, total, page, limit) });
  } catch (e) {
    next(e);
  }
});

router.get('/:id', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const invoice = await prisma.invoice.findFirst({
      where: { id: req.params.id, companyId: req.user!.companyId! },
      include: {
        customer: true,
        challan: { include: { items: true } },
        payments: true,
        company: true,
      },
    });
    if (!invoice) throw notFound();
    res.json({ success: true, data: invoice });
  } catch (e) {
    next(e);
  }
});

router.post('/from-challan/:challanId', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const companyId = req.user!.companyId!;
    const challan = await prisma.challan.findFirst({
      where: { id: req.params.challanId, companyId },
      include: { items: true, invoice: true },
    });
    if (!challan) throw notFound('Challan not found');
    if (challan.invoice) throw badRequest('Invoice already exists for this challan');

    const company = await prisma.company.findUnique({ where: { id: companyId } });
    if (!company) throw badRequest('Company not found');

    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 30);

    let invoice!: Awaited<ReturnType<typeof prisma.invoice.create>> & {
      challan: unknown;
      company: unknown;
    };

    for (let attempt = 0; attempt < 6; attempt++) {
      try {
        invoice = await prisma.$transaction(async (tx) => {
          const { invoiceNumber, seq } = await allocateInvoiceNumber(tx, companyId);

          const created = await tx.invoice.create({
            data: {
              companyId,
              customerId: challan.customerId,
              challanId: challan.id,
              invoiceNumber,
              date: new Date(),
              dueDate,
              partyName: challan.partyName,
              partyAddress: challan.partyAddress,
              partyGstin: challan.partyGstin,
              status: 'SENT',
              subtotal: challan.subtotal,
              discount: challan.discount,
              taxableAmount: challan.taxableAmount,
              cgstAmount: challan.cgstAmount,
              sgstAmount: challan.sgstAmount,
              igstAmount: challan.igstAmount,
              totalAmount: challan.totalAmount,
              balanceAmount: challan.totalAmount,
              roundOff: challan.roundOff,
              notes: challan.notes,
            },
            include: { challan: { include: { items: true } }, company: true },
          });

          await tx.company.update({
            where: { id: companyId },
            data: { invoiceCounter: seq + 1 },
          });

          if (challan.customerId) {
            await tx.customer.update({
              where: { id: challan.customerId },
              data: { outstandingBalance: { increment: challan.totalAmount } },
            });
          }

          return created;
        });
        break;
      } catch (e) {
        if (attempt < 5 && isUniqueConstraintError(e)) continue;
        throw e;
      }
    }

    res.status(201).json({ success: true, data: invoice });
  } catch (e) {
    next(e);
  }
});

router.post('/:id/payments', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const { amount, method, reference, notes, date } = req.body;
    if (!amount || amount <= 0) throw badRequest('Invalid payment amount');

    const invoice = await prisma.invoice.findFirst({
      where: { id: req.params.id, companyId: req.user!.companyId! },
    });
    if (!invoice) throw notFound();

    const payment = await prisma.$transaction(async (tx) => {
      const p = await tx.payment.create({
        data: {
          invoiceId: invoice.id,
          customerId: invoice.customerId,
          amount,
          method: method || 'CASH',
          reference,
          notes,
          date: date ? new Date(date) : new Date(),
        },
      });

      const newPaid = invoice.paidAmount + amount;
      const newBalance = Math.max(0, invoice.totalAmount - newPaid);
      const status =
        newBalance <= 0 ? 'PAID' : newPaid > 0 ? 'PARTIAL' : invoice.status;

      await tx.invoice.update({
        where: { id: invoice.id },
        data: { paidAmount: newPaid, balanceAmount: newBalance, status },
      });

      if (invoice.customerId) {
        await tx.customer.update({
          where: { id: invoice.customerId },
          data: { outstandingBalance: { decrement: amount } },
        });
      }

      return p;
    });

    res.status(201).json({ success: true, data: payment });
  } catch (e) {
    next(e);
  }
});

export default router;
