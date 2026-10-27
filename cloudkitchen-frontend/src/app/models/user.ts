// src/app/models/user.ts
export type UserRole = 'admin' | 'chef' | 'manager' | 'user';

export interface User {
  userId: string;
  email: string;
  fullname: string;
  role: UserRole;
  phone?: string;
  createdDate?: string | Date;
}

// Keep helpers in sync with backend
export const FULLNAME_RE = /^[A-Za-z\s'\-]+$/;
export const PHONE_RE = /^(\+614\d{8}|04\d{8})$/;
export const PASSWORD_RE = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/;

export function createUserPayload(data: {
  email: string;
  password: string;
  fullname: string;
  role?: UserRole;
  phone?: string;
}) {
  return {
    email: String(data.email || '').trim(),
    password: String(data.password || ''),
    fullname: String(data.fullname || '').trim(),
    role: data.role || 'chef',
    phone: data.phone ? String(data.phone).trim() : ''
  };
}

export const isPasswordStrong = (pw: string): boolean => PASSWORD_RE.test(pw || '');
export const isValidEmail = (email: string): boolean => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email || '');
export const isValidAusPhone = (phone: string): boolean => PHONE_RE.test((phone || '').replace(/\s+/g, ''));