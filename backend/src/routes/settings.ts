import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { authenticate, AuthRequest, requireRoles } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';
import { notFound } from '../lib/errors.js';
import { logActivity } from '../services/activityLog.js';
import { formatChallanNumber } from '../utils/documentNumbers.js';

const resetChallanCounterSchema = z.object({
  confirm: z.literal('CONFIRM'),
});

const companySchema = z.object({
  name: z.string().optional(),
  tradeName: z.string().optional(),
  gstin: z.string().optional(),
  pan: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  pincode: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().optional(),
  website: z.string().optional(),
  logo: z.string().optional(),
  bankName: z.string().optional(),
  bankAccount: z.string().optional(),
  bankIfsc: z.string().optional(),
  challanPrefix: z.string().optional(),
  invoicePrefix: z.string().optional(),
  defaultCgst: z.coerce.number().min(0).max(100).optional(),
  defaultSgst: z.coerce.number().min(0).max(100).optional(),
  defaultIgst: z.coerce.number().min(0).max(100).optional(),
  terms: z.string().optional(),
  signature: z.string().optional(),
});

const router = Router();

router.get('/company', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const company = await prisma.company.findUnique({
      where: { id: req.user!.companyId! },
    });
    if (!company) throw notFound('Company not found');
    res.json({ success: true, data: company });
  } catch (e) {
    next(e);
  }
});

router.put(
  '/company',
  authenticate,
  requireRoles('ADMIN'),
  validateBody(companySchema),
  async (req: AuthRequest, res, next) => {
    try {
      const company = await prisma.company.update({
        where: { id: req.user!.companyId! },
        data: req.body,
      });
      res.json({ success: true, data: company });
    } catch (e) {
      next(e);
    }
  }
);

router.post(
  '/company/reset-challan-counter',
  authenticate,
  requireRoles('ADMIN'),
  validateBody(resetChallanCounterSchema),
  async (req: AuthRequest, res, next) => {
    try {
      const companyId = req.user!.companyId!;
      const yy = new Date().getFullYear().toString().slice(-2);
      const company = await prisma.company.update({
        where: { id: companyId },
        data: { challanCounter: 1 },
      });

      const nextChallanNumber = formatChallanNumber(company.challanPrefix, yy, 1);

      await logActivity({
        companyId,
        userId: req.user!.userId,
        action: 'RESET_CHALLAN_COUNTER',
        entity: 'Company',
        entityId: companyId,
        details: `Challan counter reset to 1. Next number: ${nextChallanNumber}`,
      });

      res.json({
        success: true,
        data: {
          challanCounter: company.challanCounter,
          challanPrefix: company.challanPrefix,
          nextChallanNumber,
          message: `Challan numbering reset. Next challan will be ${nextChallanNumber} (existing challans are unchanged).`,
        },
      });
    } catch (e) {
      next(e);
    }
  }
);

router.get('/notifications', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const notifications = await prisma.notification.findMany({
      where: { companyId: req.user!.companyId! },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    res.json({ success: true, data: notifications });
  } catch (e) {
    next(e);
  }
});

router.patch('/notifications/:id/read', authenticate, async (req: AuthRequest, res, next) => {
  try {
    await prisma.notification.update({
      where: { id: req.params.id },
      data: { isRead: true },
    });
    res.json({ success: true });
  } catch (e) {
    next(e);
  }
});

router.get('/activity-logs', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const logs = await prisma.activityLog.findMany({
      where: { companyId: req.user!.companyId! },
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: { user: { select: { name: true, email: true } } },
    });
    res.json({ success: true, data: logs });
  } catch (e) {
    next(e);
  }
});

export default router;
