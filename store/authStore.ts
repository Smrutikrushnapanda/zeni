import { create } from 'zustand';
import { User } from 'firebase/auth';

interface AuthState {
  user: User | null;
  isGuest: boolean;
  setUser: (user: User | null) => void;
  setGuest: (isGuest: boolean) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isGuest: true,
  setUser: (user) => set({ user, isGuest: false }),
  setGuest: (isGuest) => set({ isGuest }),
  clearAuth: () => set({ user: null, isGuest: true }),
}));