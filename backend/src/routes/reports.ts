import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';

const router = Router();

router.get('/sales', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const companyId = req.user!.companyId!;
    const from = req.query.from ? new Date(req.query.from as string) : new Date(new Date().setDate(1));
    const to = req.query.to ? new Date(req.query.to as string) : new Date();

    const [challans, invoices] = await Promise.all([
      prisma.challan.findMany({
        where: { companyId, date: { gte: from, lte: to }, status: 'CONFIRMED' },
        include: { items: true },
      }),
      prisma.invoice.findMany({
        where: { companyId, date: { gte: from, lte: to } },
        include: { payments: true },
      }),
    ]);

    const totalChallanAmount = challans.reduce((s, c) => s + c.totalAmount, 0);
    const totalInvoiceAmount = invoices.reduce((s, i) => s + i.totalAmount, 0);
    const totalCollected = invoices.reduce((s, i) => s + i.paidAmount, 0);

    res.json({
      success: true,
      data: {
        period: { from, to },
        challanCount: challans.length,
        totalChallanAmount,
        invoiceCount: invoices.length,
        totalInvoiceAmount,
        totalCollected,
        pending: totalInvoiceAmount - totalCollected,
      },
    });
  } catch (e) {
    next(e);
  }
});

router.get('/gst', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const companyId = req.user!.companyId!;
    const from = req.query.from ? new Date(req.query.from as string) : new Date(new Date().setDate(1));
    const to = req.query.to ? new Date(req.query.to as string) : new Date();

    const invoices = await prisma.invoice.findMany({
      where: { companyId, date: { gte: from, lte: to } },
    });

    const summary = invoices.reduce(
      (acc, inv) => ({
        taxableAmount: acc.taxableAmount + inv.taxableAmount,
        cgst: acc.cgst + inv.cgstAmount,
        sgst: acc.sgst + inv.sgstAmount,
        igst: acc.igst + inv.igstAmount,
        total: acc.total + inv.totalAmount,
      }),
      { taxableAmount: 0, cgst: 0, sgst: 0, igst: 0, total: 0 }
    );

    res.json({ success: true, data: { period: { from, to }, summary, invoices } });
  } catch (e) {
    next(e);
  }
});

router.get('/profit-loss', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const companyId = req.user!.companyId!;
    const from = req.query.from ? new Date(req.query.from as string) : new Date(new Date().getFullYear(), 0, 1);
    const to = req.query.to ? new Date(req.query.to as string) : new Date();

    const invoices = await prisma.invoice.findMany({
      where: { companyId, date: { gte: from, lte: to }, status: { in: ['PAID', 'PARTIAL', 'SENT'] } },
    });

    const revenue = invoices.reduce((s, i) => s + i.totalAmount, 0);
    const collected = invoices.reduce((s, i) => s + i.paidAmount, 0);

    res.json({
      success: true,
      data: { revenue, collected, outstanding: revenue - collected, invoiceCount: invoices.length },
    });
  } catch (e) {
    next(e);
  }
});

router.get('/daily', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const companyId = req.user!.companyId!;
    const date = req.query.date ? new Date(req.query.date as string) : new Date();
    const start = new Date(date.setHours(0, 0, 0, 0));
    const end = new Date(date.setHours(23, 59, 59, 999));

    const [challans, payments] = await Promise.all([
      prisma.challan.findMany({
        where: { companyId, date: { gte: start, lte: end } },
        include: { items: true },
      }),
      prisma.payment.findMany({
        where: { date: { gte: start, lte: end }, customer: { companyId } },
      }),
    ]);

    res.json({
      success: true,
      data: {
        date: start,
        challans,
        challanTotal: challans.reduce((s, c) => s + c.totalAmount, 0),
        payments,
        paymentTotal: payments.reduce((s, p) => s + p.amount, 0),
      },
    });
  } catch (e) {
    next(e);
  }
});

export default router;
