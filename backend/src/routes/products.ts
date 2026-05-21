import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';
import { productSchema } from '../validators/product.js';
import { getPagination, paginatedResponse } from '../utils/pagination.js';
import { badRequest, notFound } from '../lib/errors.js';

const router = Router();

router.get('/', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const companyId = req.user!.companyId!;
    const { page, limit, skip } = getPagination(req.query as { page?: string; limit?: string });
    const search = (req.query.search as string) || '';
    const category = req.query.category as string;
    const lowStock = req.query.lowStock === 'true';

    const products = await prisma.product.findMany({
      where: {
        companyId,
        isActive: true,
        ...(search && {
          OR: [
            { fabricName: { contains: search, mode: 'insensitive' } },
            { designNumber: { contains: search, mode: 'insensitive' } },
            { barcode: { contains: search } },
          ],
        }),
        ...(category && { category }),
      },
      orderBy: { fabricName: 'asc' },
    });

    let filtered = products;
    if (lowStock) filtered = products.filter((p) => p.stockQuantity <= p.minStock);

    const total = filtered.length;
    const data = filtered.slice(skip, skip + limit);
    res.json({ success: true, ...paginatedResponse(data, total, page, limit) });
  } catch (e) {
    next(e);
  }
});

router.get('/:id', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const product = await prisma.product.findFirst({
      where: { id: req.params.id, companyId: req.user!.companyId! },
    });
    if (!product) throw notFound();
    res.json({ success: true, data: product });
  } catch (e) {
    next(e);
  }
});

router.post('/', authenticate, validateBody(productSchema), async (req: AuthRequest, res, next) => {
  try {
    const companyId = req.user!.companyId;
    if (!companyId) throw badRequest('No company assigned');
    const product = await prisma.product.create({
      data: { ...req.body, companyId },
    });
    res.status(201).json({ success: true, data: product });
  } catch (e) {
    next(e);
  }
});

router.put('/:id', authenticate, validateBody(productSchema.partial()), async (req: AuthRequest, res, next) => {
  try {
    const existing = await prisma.product.findFirst({
      where: { id: req.params.id, companyId: req.user!.companyId! },
    });
    if (!existing) throw notFound();
    const product = await prisma.product.update({
      where: { id: req.params.id },
      data: req.body,
    });
    res.json({ success: true, data: product });
  } catch (e) {
    next(e);
  }
});

router.delete('/:id', authenticate, async (req: AuthRequest, res, next) => {
  try {
    await prisma.product.update({
      where: { id: req.params.id },
      data: { isActive: false },
    });
    res.json({ success: true });
  } catch (e) {
    next(e);
  }
});

export default router;
