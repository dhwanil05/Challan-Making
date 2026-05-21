import { Router } from 'express';
import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';
import { challanSchema } from '../validators/challan.js';
import { getPagination, paginatedResponse } from '../utils/pagination.js';
import { calculateChallanTotals, calculateLineAmount } from '../utils/calculations.js';
import { allocateChallanNumber } from '../utils/documentNumbers.js';
import { badRequest, notFound } from '../lib/errors.js';
import { logActivity } from '../services/activityLog.js';

function isUniqueConstraintError(e: unknown): boolean {
  return e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002';
}

const router = Router();

function defaultGstPercent(
  company: { defaultCgst: number; defaultSgst: number; defaultIgst: number },
  isInterState: boolean
) {
  return isInterState ? company.defaultIgst : company.defaultCgst + company.defaultSgst;
}

router.get('/', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const companyId = req.user!.companyId!;
    const { page, limit, skip } = getPagination(req.query as { page?: string; limit?: string });
    const status = req.query.status as string;
    const search = req.query.search as string;

    const where = {
      companyId,
      ...(status && { status: status as 'DRAFT' | 'CONFIRMED' | 'CANCELLED' }),
      ...(search && {
        OR: [
          { challanNumber: { contains: search, mode: 'insensitive' as const } },
          { partyName: { contains: search, mode: 'insensitive' as const } },
        ],
      }),
    };

    const [challans, total] = await Promise.all([
      prisma.challan.findMany({
        where,
        skip,
        take: limit,
        orderBy: { date: 'desc' },
        include: { customer: true, items: { orderBy: { sortOrder: 'asc' } } },
      }),
      prisma.challan.count({ where }),
    ]);

    res.json({ success: true, ...paginatedResponse(challans, total, page, limit) });
  } catch (e) {
    next(e);
  }
});

router.get('/:id', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const challan = await prisma.challan.findFirst({
      where: { id: req.params.id, companyId: req.user!.companyId! },
      include: {
        customer: true,
        items: { orderBy: { sortOrder: 'asc' }, include: { product: true } },
        company: true,
        invoice: true,
      },
    });
    if (!challan) throw notFound('Challan not found');
    res.json({ success: true, data: challan });
  } catch (e) {
    next(e);
  }
});

router.post('/', authenticate, validateBody(challanSchema), async (req: AuthRequest, res, next) => {
  try {
    const companyId = req.user!.companyId!;
    const company = await prisma.company.findUnique({ where: { id: companyId } });
    if (!company) throw badRequest('Company not found');

    const { items, date, ...rest } = req.body;
    const lineItems = items.map((item: { meter: number; rate: number; gstPercent?: number }) => ({
      meter: item.meter,
      rate: item.rate,
      gstPercent: item.gstPercent,
    }));
    const totals = calculateChallanTotals(
      lineItems,
      rest.discount || 0,
      rest.isInterState || false,
      defaultGstPercent(company, rest.isInterState || false)
    );

    let challan!: Awaited<ReturnType<typeof prisma.challan.create>> & {
      items: unknown;
      company: unknown;
      customer: unknown;
    };

    for (let attempt = 0; attempt < 6; attempt++) {
      try {
        challan = await prisma.$transaction(async (tx) => {
          const { challanNumber, seq } = await allocateChallanNumber(tx, companyId);

          const created = await tx.challan.create({
            data: {
              companyId,
              challanNumber,
              date: date ? new Date(date) : new Date(),
              ...rest,
              ...totals,
              createdBy: req.user!.userId,
              items: {
                create: items.map(
                  (
                    item: {
                      productId?: string;
                      description: string;
                      designNo?: string;
                      colour?: string;
                      meter: number;
                      pieces?: number;
                      rate: number;
                      hsnCode?: string;
                      gstPercent?: number;
                      sortOrder?: number;
                    },
                    idx: number
                  ) => ({
                    ...item,
                    amount: calculateLineAmount(item.meter, item.rate),
                    sortOrder: item.sortOrder ?? idx,
                  })
                ),
              },
            },
            include: { items: true, company: true, customer: true },
          });

          await tx.company.update({
            where: { id: companyId },
            data: { challanCounter: seq + 1 },
          });

          if (rest.status === 'CONFIRMED') {
            for (const item of items) {
              if (item.productId) {
                await tx.product.update({
                  where: { id: item.productId },
                  data: { stockQuantity: { decrement: item.meter } },
                });
                await tx.inventoryTransaction.create({
                  data: {
                    companyId,
                    productId: item.productId,
                    type: 'STOCK_OUT',
                    quantity: item.meter,
                    reference: challanNumber,
                    notes: `Challan ${challanNumber}`,
                  },
                });
              }
            }
          }

          return created;
        });
        break;
      } catch (e) {
        if (attempt < 5 && isUniqueConstraintError(e)) continue;
        throw e;
      }
    }

    await logActivity({
      companyId,
      userId: req.user!.userId,
      action: 'CREATE',
      entity: 'Challan',
      entityId: challan.id,
    });

    res.status(201).json({ success: true, data: challan });
  } catch (e) {
    next(e);
  }
});

router.put('/:id', authenticate, validateBody(challanSchema.partial()), async (req: AuthRequest, res, next) => {
  try {
    const existing = await prisma.challan.findFirst({
      where: { id: req.params.id, companyId: req.user!.companyId! },
      include: { items: true },
    });
    if (!existing) throw notFound();

    const { items, ...rest } = req.body;
    let totals = {};
    if (items) {
      const company = await prisma.company.findUnique({ where: { id: req.user!.companyId! } });
      if (!company) throw badRequest('Company not found');
      const isInter = rest.isInterState ?? existing.isInterState;
      totals = calculateChallanTotals(
        items.map((i: { meter: number; rate: number; gstPercent?: number }) => i),
        rest.discount ?? existing.discount,
        isInter,
        defaultGstPercent(company, isInter)
      );
    }

    const challan = await prisma.$transaction(async (tx) => {
      if (items) {
        await tx.challanItem.deleteMany({ where: { challanId: req.params.id } });
      }
      return tx.challan.update({
        where: { id: req.params.id },
        data: {
          ...rest,
          ...totals,
          ...(items && {
            items: {
              create: items.map(
                (item: { description: string; meter: number; rate: number; [key: string]: unknown }, idx: number) => ({
                  ...item,
                  amount: calculateLineAmount(item.meter, item.rate),
                  sortOrder: idx,
                })
              ),
            },
          }),
        },
        include: { items: true, company: true, customer: true },
      });
    });

    res.json({ success: true, data: challan });
  } catch (e) {
    next(e);
  }
});

router.post('/:id/duplicate', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const original = await prisma.challan.findFirst({
      where: { id: req.params.id, companyId: req.user!.companyId! },
      include: { items: true },
    });
    if (!original) throw notFound();

    let duplicate!: Awaited<ReturnType<typeof prisma.challan.create>> & {
      items: unknown;
      company: unknown;
    };

    for (let attempt = 0; attempt < 6; attempt++) {
      try {
        duplicate = await prisma.$transaction(async (tx) => {
          const { challanNumber, seq } = await allocateChallanNumber(tx, original.companyId);

          const created = await tx.challan.create({
            data: {
              companyId: original.companyId,
              challanNumber,
          date: new Date(),
          customerId: original.customerId,
          partyName: original.partyName,
          partyAddress: original.partyAddress,
          partyGstin: original.partyGstin,
          partyMobile: original.partyMobile,
          status: 'DRAFT',
          subtotal: original.subtotal,
          discount: original.discount,
          taxableAmount: original.taxableAmount,
          cgstAmount: original.cgstAmount,
          sgstAmount: original.sgstAmount,
          igstAmount: original.igstAmount,
          totalAmount: original.totalAmount,
          roundOff: original.roundOff,
          notes: original.notes,
          transport: original.transport,
          vehicleNo: original.vehicleNo,
          isInterState: original.isInterState,
          createdBy: req.user!.userId,
          items: {
            create: original.items.map((item) => ({
              productId: item.productId,
              description: item.description,
              designNo: item.designNo,
              colour: item.colour,
              meter: item.meter,
              pieces: item.pieces,
              rate: item.rate,
              amount: item.amount,
              hsnCode: item.hsnCode,
              gstPercent: item.gstPercent,
              sortOrder: item.sortOrder,
            })),
          },
        },
            include: { items: true, company: true },
          });
          await tx.company.update({
            where: { id: original.companyId },
            data: { challanCounter: seq + 1 },
          });
          return created;
        });
        break;
      } catch (e) {
        if (attempt < 5 && isUniqueConstraintError(e)) continue;
        throw e;
      }
    }

    res.status(201).json({ success: true, data: duplicate });
  } catch (e) {
    next(e);
  }
});

router.delete('/:id', authenticate, async (req: AuthRequest, res, next) => {
  try {
    await prisma.challan.update({
      where: { id: req.params.id },
      data: { status: 'CANCELLED' },
    });
    res.json({ success: true });
  } catch (e) {
    next(e);
  }
});

export default router;
