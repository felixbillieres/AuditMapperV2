import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type PrivescMode = 'linux' | 'windows';

export interface ChecklistState {
  [themeId: string]: {
    [itemId: string]: boolean;
  };
}

interface PrivescStoreState {
  checklists: {
    linux: ChecklistState;
    windows: ChecklistState;
  };
  toggleItem: (mode: PrivescMode, themeId: string, itemId: string) => void;
  setItem: (mode: PrivescMode, themeId: string, itemId: string, value: boolean) => void;
  resetMode: (mode: PrivescMode) => void;
}

export const usePrivescStore = create<PrivescStoreState>()(
  persist(
    (set) => ({
      checklists: { linux: {}, windows: {} },
      toggleItem: (mode, themeId, itemId) =>
        set((state) => {
          const modeState = { ...(state.checklists[mode] || {}) };
          const themeState = { ...(modeState[themeId] || {}) };
          themeState[itemId] = !themeState[itemId];
          modeState[themeId] = themeState;
          return { checklists: { ...state.checklists, [mode]: modeState } };
        }),
      setItem: (mode, themeId, itemId, value) =>
        set((state) => {
          const modeState = { ...(state.checklists[mode] || {}) };
          const themeState = { ...(modeState[themeId] || {}) };
          themeState[itemId] = value;
          modeState[themeId] = themeState;
          return { checklists: { ...state.checklists, [mode]: modeState } };
        }),
      resetMode: (mode) =>
        set((state) => ({
          checklists: { ...state.checklists, [mode]: {} },
        })),
    }),
    { name: 'privesc-store' }
  )
);
