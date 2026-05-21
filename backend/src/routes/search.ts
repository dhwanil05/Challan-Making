import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';

const router = Router();

router.get('/', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const companyId = req.user!.companyId!;
    const q = (req.query.q as string)?.trim();
    if (!q || q.length < 2) {
      return res.json({ success: true, data: { customers: [], products: [], challans: [], invoices: [] } });
    }

    const [customers, products, challans, invoices] = await Promise.all([
      prisma.customer.findMany({
        where: {
          companyId,
          isActive: true,
          OR: [
            { name: { contains: q, mode: 'insensitive' } },
            { mobile: { contains: q } },
            { gstin: { contains: q, mode: 'insensitive' } },
          ],
        },
        take: 5,
      }),
      prisma.product.findMany({
        where: {
          companyId,
          OR: [
            { fabricName: { contains: q, mode: 'insensitive' } },
            { designNumber: { contains: q, mode: 'insensitive' } },
            { barcode: { contains: q } },
          ],
        },
        take: 5,
      }),
      prisma.challan.findMany({
        where: {
          companyId,
          OR: [
            { challanNumber: { contains: q, mode: 'insensitive' } },
            { partyName: { contains: q, mode: 'insensitive' } },
          ],
        },
        take: 5,
      }),
      prisma.invoice.findMany({
        where: {
          companyId,
          OR: [
            { invoiceNumber: { contains: q, mode: 'insensitive' } },
            { partyName: { contains: q, mode: 'insensitive' } },
          ],
        },
        take: 5,
      }),
    ]);

    res.json({ success: true, data: { customers, products, challans, invoices } });
  } catch (e) {
    next(e);
  }
});

export default router;
