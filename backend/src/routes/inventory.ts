import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';
import { getPagination, paginatedResponse } from '../utils/pagination.js';
import { badRequest } from '../lib/errors.js';

const inventorySchema = z.object({
  productId: z.string(),
  type: z.enum(['STOCK_IN', 'STOCK_OUT', 'ADJUSTMENT']),
  quantity: z.number().positive(),
  rollNo: z.string().optional(),
  reference: z.string().optional(),
  notes: z.string().optional(),
  date: z.string().optional(),
});

const router = Router();

router.get('/', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const companyId = req.user!.companyId!;
    const { page, limit, skip } = getPagination(req.query as { page?: string; limit?: string });

    const [transactions, total] = await Promise.all([
      prisma.inventoryTransaction.findMany({
        where: { companyId },
        skip,
        take: limit,
        orderBy: { date: 'desc' },
        include: { product: true },
      }),
      prisma.inventoryTransaction.count({ where: { companyId } }),
    ]);

    res.json({ success: true, ...paginatedResponse(transactions, total, page, limit) });
  } catch (e) {
    next(e);
  }
});

router.post('/', authenticate, validateBody(inventorySchema), async (req: AuthRequest, res, next) => {
  try {
    const companyId = req.user!.companyId!;
    const { productId, type, quantity, rollNo, reference, notes, date } = req.body;

    const product = await prisma.product.findFirst({
      where: { id: productId, companyId },
    });
    if (!product) throw badRequest('Product not found');

    const meterBefore = product.stockQuantity;
    let meterAfter = meterBefore;
    if (type === 'STOCK_IN') meterAfter += quantity;
    else if (type === 'STOCK_OUT') {
      if (meterBefore < quantity) throw badRequest('Insufficient stock');
      meterAfter -= quantity;
    } else meterAfter = quantity;

    const transaction = await prisma.$transaction(async (tx) => {
      const t = await tx.inventoryTransaction.create({
        data: {
          companyId,
          productId,
          type,
          quantity,
          rollNo,
          reference,
          notes,
          meterBefore,
          meterAfter,
          date: date ? new Date(date) : new Date(),
        },
        include: { product: true },
      });
      await tx.product.update({
        where: { id: productId },
        data: { stockQuantity: meterAfter },
      });
      return t;
    });

    res.status(201).json({ success: true, data: transaction });
  } catch (e) {
    next(e);
  }
});

export default router;
