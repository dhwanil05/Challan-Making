import { prisma } from '../lib/prisma.js';

export async function logActivity(params: {
  companyId?: string;
  userId?: string;
  action: string;
  entity?: string;
  entityId?: string;
  details?: string;
  ipAddress?: string;
}) {
  try {
    await prisma.activityLog.create({ data: params });
  } catch (e) {
    console.error('Activity log failed:', e);
  }
}
