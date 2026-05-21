import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';
import { customerSchema } from '../validators/customer.js';
import { getPagination, paginatedResponse } from '../utils/pagination.js';
import { badRequest, notFound } from '../lib/errors.js';
import { logActivity } from '../services/activityLog.js';

const router = Router();

router.get('/', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const companyId = req.user!.companyId!;
    const { page, limit, skip } = getPagination(req.query as { page?: string; limit?: string });
    const search = (req.query.search as string) || '';
    const city = req.query.city as string;
    const includeInactive = req.query.includeInactive === 'true';

    const where = {
      companyId,
      ...(!includeInactive && { isActive: true }),
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' as const } },
          { mobile: { contains: search } },
          { gstin: { contains: search, mode: 'insensitive' as const } },
        ],
      }),
      ...(city && { city: { equals: city, mode: 'insensitive' as const } }),
    };

    const [customers, total] = await Promise.all([
      prisma.customer.findMany({
        where,
        skip,
        take: limit,
        orderBy: { name: 'asc' },
      }),
      prisma.customer.count({ where }),
    ]);

    res.json({ success: true, ...paginatedResponse(customers, total, page, limit) });
  } catch (e) {
    next(e);
  }
});

router.get('/:id', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const customer = await prisma.customer.findFirst({
      where: { id: req.params.id, companyId: req.user!.companyId! },
    });
    if (!customer) throw notFound('Customer not found');
    res.json({ success: true, data: customer });
  } catch (e) {
    next(e);
  }
});

router.get('/:id/ledger', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const customerId = req.params.id;
    const [challans, invoices, payments] = await Promise.all([
      prisma.challan.findMany({
        where: { customerId },
        orderBy: { date: 'desc' },
        include: { items: true },
      }),
      prisma.invoice.findMany({
        where: { customerId },
        orderBy: { date: 'desc' },
      }),
      prisma.payment.findMany({
        where: { customerId },
        orderBy: { date: 'desc' },
      }),
    ]);
    res.json({ success: true, data: { challans, invoices, payments } });
  } catch (e) {
    next(e);
  }
});

router.post('/', authenticate, validateBody(customerSchema), async (req: AuthRequest, res, next) => {
  try {
    const companyId = req.user!.companyId;
    if (!companyId) throw badRequest('No company assigned');
    const customer = await prisma.customer.create({
      data: { ...req.body, companyId },
    });
    await logActivity({
      companyId,
      userId: req.user!.userId,
      action: 'CREATE',
      entity: 'Customer',
      entityId: customer.id,
    });
    res.status(201).json({ success: true, data: customer });
  } catch (e) {
    next(e);
  }
});

router.put('/:id', authenticate, validateBody(customerSchema.partial()), async (req: AuthRequest, res, next) => {
  try {
    const existing = await prisma.customer.findFirst({
      where: { id: req.params.id, companyId: req.user!.companyId! },
    });
    if (!existing) throw notFound();
    const customer = await prisma.customer.update({
      where: { id: req.params.id },
      data: req.body,
    });
    res.json({ success: true, data: customer });
  } catch (e) {
    next(e);
  }
});

router.delete('/:id', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const existing = await prisma.customer.findFirst({
      where: { id: req.params.id, companyId: req.user!.companyId! },
    });
    if (!existing) throw notFound();
    await prisma.customer.update({
      where: { id: req.params.id },
      data: { isActive: false },
    });
    res.json({ success: true, message: 'Customer deactivated' });
  } catch (e) {
    next(e);
  }
});

export default router;
