import { create } from 'zustand';
import {
  clearStoredBagId,
  getLastComparisonId,
  getStoredBagId,
  setLastComparisonId as persistLastComparisonId,
  setStoredBagId,
} from '@/lib/bag-storage';

type ShoppingBagState = {
  drawerOpen: boolean;
  /** Active server-side bag id (fixture API); persisted in localStorage. */
  serverBagId: string | null;
  /** Last successful comparison id (localStorage); drives mobile Compare tab. */
  lastComparisonId: string | null;
  setDrawerOpen: (open: boolean) => void;
  toggleDrawer: () => void;
  setServerBagId: (id: string | null) => void;
  rememberComparisonId: (id: string) => void;
};

export const useShoppingBagStore = create<ShoppingBagState>((set) => ({
  drawerOpen: false,
  serverBagId: typeof window !== 'undefined' ? getStoredBagId() : null,
  lastComparisonId: typeof window !== 'undefined' ? getLastComparisonId() : null,
  setDrawerOpen: (drawerOpen) => set({ drawerOpen }),
  toggleDrawer: () => set((s) => ({ drawerOpen: !s.drawerOpen })),
  setServerBagId: (id) => {
    if (id) setStoredBagId(id);
    else clearStoredBagId();
    set({ serverBagId: id });
  },
  rememberComparisonId: (id) => {
    persistLastComparisonId(id);
    set({ lastComparisonId: id });
  },
}));
