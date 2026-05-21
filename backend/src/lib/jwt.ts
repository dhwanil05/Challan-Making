import jwt, { type SignOptions } from 'jsonwebtoken';

const secret = process.env.JWT_SECRET || 'dev-secret-change-in-production';
const expiresIn = process.env.JWT_EXPIRES_IN || '7d';

export interface JwtPayload {
  userId: string;
  email: string;
  role: string;
  companyId?: string;
}

export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, secret, { expiresIn: '7d' });
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, secret) as JwtPayload;
}
