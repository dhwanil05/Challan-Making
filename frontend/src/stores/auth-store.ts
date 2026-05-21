import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface CompanyProfile {
  id: string;
  name: string;
  tradeName?: string;
  gstin?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  phone?: string;
  email?: string;
  challanPrefix?: string;
  invoicePrefix?: string;
  challanCounter?: number;
  invoiceCounter?: number;
  defaultCgst?: number;
  defaultSgst?: number;
  defaultIgst?: number;
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'ADMIN' | 'STAFF' | 'ACCOUNTANT';
  companyId?: string;
  company?: CompanyProfile;
}

interface AuthState {
  token: string | null;
  user: User | null;
  setAuth: (token: string, user: User) => void;
  updateCompany: (company: CompanyProfile) => void;
  logout: () => void;
  isAuthenticated: () => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      user: null,
      setAuth: (token, user) => {
        if (typeof window !== 'undefined') localStorage.setItem('token', token);
        set({ token, user });
      },
      updateCompany: (company) => {
        const user = get().user;
        if (!user) return;
        set({
          user: {
            ...user,
            companyId: company.id || user.companyId,
            company,
          },
        });
      },
      logout: () => {
        if (typeof window !== 'undefined') localStorage.removeItem('token');
        set({ token: null, user: null });
      },
      isAuthenticated: () => !!get().token,
    }),
    { name: 'uvita-auth' }
  )
);
