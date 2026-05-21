import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import bcrypt from 'bcryptjs';
import { prisma } from '../lib/prisma.js';
import { signToken } from '../lib/jwt.js';
import { validateBody } from '../middleware/validate.js';
import { loginSchema, registerSchema, signupSchema, type SignupInput } from '../validators/auth.js';
import { authenticate, AuthRequest, requireRoles } from '../middleware/auth.js';
import { badRequest, forbidden, unauthorized } from '../lib/errors.js';
import { logActivity } from '../services/activityLog.js';

const router = Router();

const signupLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many sign-up attempts from this network. Try again in an hour.' },
});

router.post('/signup', signupLimiter, validateBody(signupSchema), async (req, res, next) => {
  try {
    if (process.env.PUBLIC_SIGNUP_DISABLED === 'true') {
      throw forbidden('New account registration is currently disabled.');
    }

    const d = req.body as SignupInput;

    const [emailTaken, gstinTaken] = await Promise.all([
      prisma.user.findUnique({ where: { email: d.email } }),
      prisma.company.findFirst({ where: { gstin: d.gstin } }),
    ]);
    if (emailTaken) throw badRequest('An account with this email already exists. Sign in instead.');
    if (gstinTaken) throw badRequest('This GSTIN is already registered. Use a different GSTIN or sign in.');

    const passwordHash = await bcrypt.hash(d.password, 12);
    const tradeName = (d.tradeName?.trim() || d.businessName.trim()).slice(0, 200);

    const user = await prisma.$transaction(async (tx) => {
      const company = await tx.company.create({
        data: {
          name: d.businessName.trim(),
          tradeName,
          gstin: d.gstin,
          pan: d.pan,
          address: d.address.trim(),
          city: d.city.trim(),
          state: d.state.trim(),
          pincode: d.pincode,
          phone: d.businessPhone,
          email: d.businessEmail.trim().toLowerCase(),
          isDefault: true,
        },
      });

      return tx.user.create({
        data: {
          email: d.email,
          password: passwordHash,
          name: d.ownerName.trim(),
          phone: d.ownerPhone,
          role: 'ADMIN',
          companyId: company.id,
        },
        include: { company: true },
      });
    });

    const token = signToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      companyId: user.companyId || undefined,
    });

    await logActivity({
      companyId: user.companyId || undefined,
      userId: user.id,
      action: 'SIGNUP',
      entity: 'User',
      entityId: user.id,
      details: `Company: ${user.company?.name}`,
    });

    res.status(201).json({
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        companyId: user.companyId,
        company: user.company,
      },
    });
  } catch (e) {
    next(e);
  }
});

router.post('/login', validateBody(loginSchema), async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const user = await prisma.user.findUnique({
      where: { email },
      include: { company: true },
    });
    if (!user || !user.isActive) throw unauthorized('Invalid credentials');
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) throw unauthorized('Invalid credentials');

    const token = signToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      companyId: user.companyId || undefined,
    });

    await logActivity({
      companyId: user.companyId || undefined,
      userId: user.id,
      action: 'LOGIN',
      entity: 'User',
      entityId: user.id,
    });

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        companyId: user.companyId,
        company: user.company,
      },
    });
  } catch (e) {
    next(e);
  }
});

router.get('/me', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      include: { company: true },
    });
    if (!user) throw unauthorized();
    res.json({ success: true, user });
  } catch (e) {
    next(e);
  }
});

router.post(
  '/register',
  authenticate,
  requireRoles('ADMIN'),
  validateBody(registerSchema),
  async (req: AuthRequest, res, next) => {
    try {
      const { email, password, name, role, companyId } = req.body;
      const exists = await prisma.user.findUnique({ where: { email } });
      if (exists) throw badRequest('Email already registered');

      const hashed = await bcrypt.hash(password, 12);
      const user = await prisma.user.create({
        data: {
          email,
          password: hashed,
          name,
          role: role || 'STAFF',
          companyId: companyId || req.user!.companyId,
        },
        select: { id: true, email: true, name: true, role: true },
      });
      res.status(201).json({ success: true, user });
    } catch (e) {
      next(e);
    }
  }
);

export default router;
