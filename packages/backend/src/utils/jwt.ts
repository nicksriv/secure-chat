import jwt from 'jsonwebtoken';
import { Types } from 'mongoose';

const JWT_SECRET = process.env.JWT_SECRET || 'default-secret-key';

export interface TokenPayload {
  userId: string;
  email: string;
}

export const generateToken = (userId: Types.ObjectId, email: string): string => {
  return jwt.sign(
    { userId: userId.toString(), email },
    JWT_SECRET,
    { expiresIn: '24h' }
  );
};

export const verifyToken = (token: string): TokenPayload => {
  return jwt.verify(token, JWT_SECRET) as TokenPayload;
};