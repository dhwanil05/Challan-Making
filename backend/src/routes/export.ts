import { Router } from 'express';
import * as XLSX from 'xlsx';
import { prisma } from '../lib/prisma.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { badRequest } from '../lib/errors.js';

const router = Router();

router.get('/challans', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const companyId = req.user!.companyId!;
    const from = req.query.from ? new Date(req.query.from as string) : undefined;
    const to = req.query.to ? new Date(req.query.to as string) : undefined;

    const challans = await prisma.challan.findMany({
      where: {
        companyId,
        ...(from && to && { date: { gte: from, lte: to } }),
      },
      include: { items: true, customer: true },
      orderBy: { date: 'desc' },
    });

    const rows = challans.flatMap((c) =>
      c.items.length
        ? c.items.map((item, idx) => ({
            'Challan No': idx === 0 ? c.challanNumber : '',
            Date: idx === 0 ? c.date.toISOString().split('T')[0] : '',
            Party: idx === 0 ? c.partyName : '',
            Description: item.description,
            'Design No': item.designNo || '',
            Meter: item.meter,
            Rate: item.rate,
            Amount: item.amount,
            Total: idx === 0 ? c.totalAmount : '',
            Status: idx === 0 ? c.status : '',
          }))
        : [
            {
              'Challan No': c.challanNumber,
              Date: c.date.toISOString().split('T')[0],
              Party: c.partyName,
              Description: '',
              'Design No': '',
              Meter: 0,
              Rate: 0,
              Amount: 0,
              Total: c.totalAmount,
              Status: c.status,
            },
          ]
    );

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, 'Challans');
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=challans-export.xlsx');
    res.send(buffer);
  } catch (e) {
    next(e);
  }
});

router.get('/customers', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const customers = await prisma.customer.findMany({
      where: { companyId: req.user!.companyId!, isActive: true },
    });
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(
      customers.map((c) => ({
        Name: c.name,
        GSTIN: c.gstin || '',
        Mobile: c.mobile || '',
        Email: c.email || '',
        Address: c.address || '',
        City: c.city || '',
        State: c.state || '',
        Pincode: c.pincode || '',
        Outstanding: c.outstandingBalance,
      }))
    );
    XLSX.utils.book_append_sheet(wb, ws, 'Customers');
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=customers-export.xlsx');
    res.send(buffer);
  } catch (e) {
    next(e);
  }
});

router.post('/import/customers', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const companyId = req.user!.companyId!;
    const { rows } = req.body as { rows: Record<string, string | number>[] };
    if (!rows?.length) throw badRequest('No data provided');

    const created = await prisma.$transaction(
      rows.map((row) =>
        prisma.customer.create({
          data: {
            companyId,
            name: String(row.Name || row.name || ''),
            gstin: String(row.GSTIN || row.gstin || '') || undefined,
            mobile: String(row.Mobile || row.mobile || '') || undefined,
            email: String(row.Email || row.email || '') || undefined,
            address: String(row.Address || row.address || '') || undefined,
            city: String(row.City || row.city || '') || undefined,
            state: String(row.State || row.state || '') || undefined,
            pincode: String(row.Pincode || row.pincode || '') || undefined,
          },
        })
      )
    );

    res.json({ success: true, count: created.length });
  } catch (e) {
    next(e);
  }
});

router.post('/import/products', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const companyId = req.user!.companyId!;
    const { rows } = req.body as { rows: Record<string, string | number>[] };
    if (!rows?.length) throw badRequest('No data provided');

    const created = await prisma.$transaction(
      rows.map((row) =>
        prisma.product.create({
          data: {
            companyId,
            fabricName: String(row['Fabric Name'] || row.fabricName || row.name || ''),
            designNumber: String(row['Design No'] || row.designNumber || '') || undefined,
            colour: String(row.Colour || row.colour || '') || undefined,
            category: String(row.Category || row.category || '') || undefined,
            rate: Number(row.Rate || row.rate || 0),
            stockQuantity: Number(row.Stock || row.stockQuantity || 0),
            minStock: Number(row['Min Stock'] || row.minStock || 0),
            barcode: String(row.Barcode || row.barcode || '') || undefined,
            hsnCode: String(row.HSN || row.hsnCode || '') || undefined,
            gstPercent: Number(row.GST || row.gstPercent || 5),
          },
        })
      )
    );

    res.json({ success: true, count: created.length });
  } catch (e) {
    next(e);
  }
});

export default router;
