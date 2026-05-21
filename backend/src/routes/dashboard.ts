import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';

const router = Router();

router.get('/', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const companyId = req.user!.companyId;
    if (!companyId) {
      return res.json({ success: true, data: getEmptyDashboard() });
    }

    const now = new Date();
    const startOfDay = new Date(now.setHours(0, 0, 0, 0));
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfYear = new Date(now.getFullYear(), 0, 1);

    const [
      totalSales,
      pendingPayments,
      dailyChallans,
      monthlyRevenue,
      recentChallans,
      topCustomers,
      lowStockProducts,
      monthlySales,
    ] = await Promise.all([
      prisma.invoice.aggregate({
        where: { companyId, status: { in: ['PAID', 'PARTIAL', 'SENT'] } },
        _sum: { totalAmount: true },
      }),
      prisma.invoice.aggregate({
        where: { companyId, status: { in: ['SENT', 'PARTIAL', 'OVERDUE'] } },
        _sum: { balanceAmount: true },
      }),
      prisma.challan.count({
        where: { companyId, date: { gte: startOfDay }, status: 'CONFIRMED' },
      }),
      prisma.invoice.aggregate({
        where: { companyId, date: { gte: startOfMonth } },
        _sum: { totalAmount: true },
      }),
      prisma.challan.findMany({
        where: { companyId },
        orderBy: { createdAt: 'desc' },
        take: 8,
        include: { customer: true, items: true },
      }),
      prisma.customer.findMany({
        where: { companyId, isActive: true },
        orderBy: { outstandingBalance: 'desc' },
        take: 5,
      }),
      prisma.product
        .findMany({ where: { companyId, isActive: true }, take: 50 })
        .then((products) => products.filter((p) => p.stockQuantity <= p.minStock).slice(0, 10)),
      getMonthlySales(companyId, startOfYear),
    ]);

    res.json({
      success: true,
      data: {
        totalSales: totalSales._sum.totalAmount || 0,
        pendingPayments: pendingPayments._sum.balanceAmount || 0,
        dailyChallans,
        monthlyRevenue: monthlyRevenue._sum.totalAmount || 0,
        recentChallans,
        topCustomers,
        lowStockProducts,
        monthlySales,
      },
    });
  } catch (e) {
    next(e);
  }
});

async function getMonthlySales(companyId: string, from: Date) {
  const invoices = await prisma.invoice.findMany({
    where: { companyId, date: { gte: from } },
    select: { date: true, totalAmount: true },
  });
  const months: Record<string, number> = {};
  for (let i = 0; i < 12; i++) {
    const d = new Date(from.getFullYear(), from.getMonth() + i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    months[key] = 0;
  }
  invoices.forEach((inv) => {
    const key = `${inv.date.getFullYear()}-${String(inv.date.getMonth() + 1).padStart(2, '0')}`;
    if (months[key] !== undefined) months[key] += inv.totalAmount;
  });
  return Object.entries(months).map(([month, amount]) => ({ month, amount }));
}

function getEmptyDashboard() {
  return {
    totalSales: 0,
    pendingPayments: 0,
    dailyChallans: 0,
    monthlyRevenue: 0,
    recentChallans: [],
    topCustomers: [],
    lowStockProducts: [],
    monthlySales: [],
  };
}

export default router;
