// ==========================================
// STORE POUR LA GESTION DES HOSTS
// ==========================================

import { create } from 'zustand';
import { persist, devtools } from 'zustand/middleware';
import { Host, Category, HostFilters } from '@/types';

interface NetworkNodeData {
  x: number;
  y: number;
  level: number;
}

interface HostState {
  // Data
  hosts: Record<string, Host>;
  categories: Category[];
  selectedHosts: string[];
  filters: HostFilters;
  viewMode: 'grid' | 'list';
  networkNodes: Record<string, NetworkNodeData>;
  
  // Actions
  addHost: (hostData: Omit<Host, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateHost: (hostId: string, updates: Partial<Host>) => void;
  deleteHost: (hostId: string) => void;
  selectHost: (hostId: string) => void;
  clearSelection: () => void;
  
  addCategory: (category: Omit<Category, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateCategory: (categoryId: string, updates: Partial<Category>) => void;
  deleteCategory: (categoryId: string) => void;
  
  setFilters: (filters: Partial<HostFilters>) => void;
  setViewMode: (mode: 'grid' | 'list') => void;
  
  updateNetworkNode: (hostId: string, nodeData: Partial<NetworkNodeData>) => void;
  
  importData: (data: any) => void;
  exportData: () => any;
  clearAllData: () => void;

  ensureUniqueCategoryIds: () => void;
}

export const useHostStore = create<HostState>()(
  devtools(
    persist(
      (set, get) => ({
        // Initial state
        hosts: {},
        categories: [],
        selectedHosts: [],
        filters: {
          status: 'all',
          priority: 'all',
          category: 'all',
        },
        viewMode: 'grid',
        networkNodes: {},

        // Host actions
        addHost: (hostData) => {
          const newHost: Host = {
            id: Date.now().toString(),
            ...hostData,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          
          set((state) => ({
            hosts: {
              ...state.hosts,
              [newHost.id]: newHost,
            },
          }));
        },

        updateHost: (hostId, updates) => {
          set((state) => {
            const host = state.hosts[hostId];
            if (!host) return state;

            return {
              hosts: {
                ...state.hosts,
                [hostId]: {
                  ...host,
                  ...updates,
                  updatedAt: new Date().toISOString(),
                },
              },
            };
          });
        },

        deleteHost: (hostId) => {
          set((state) => {
            const { [hostId]: deleted, ...remainingHosts } = state.hosts;
            return {
              hosts: remainingHosts,
              selectedHosts: state.selectedHosts.filter(id => id !== hostId),
            };
          });
        },

        selectHost: (hostId) => {
          set((state) => {
            const isSelected = state.selectedHosts.includes(hostId);
            return {
              selectedHosts: isSelected
                ? state.selectedHosts.filter(id => id !== hostId)
                : [...state.selectedHosts, hostId],
            };
          });
        },

        clearSelection: () => {
          set({ selectedHosts: [] });
        },

        // Category actions
        addCategory: (categoryData) => {
          const newId = (typeof crypto !== 'undefined' && 'randomUUID' in crypto)
            ? (crypto as any).randomUUID()
            : `${Date.now()}_${Math.floor(Math.random()*1e9)}`;
          const newCategory: Category = {
            id: newId,
            ...categoryData,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          
          set((state) => ({
            categories: Array.isArray(state.categories) ? [...state.categories, newCategory] : [newCategory],
          }));
        },

        updateCategory: (categoryId, updates) => {
          set((state) => ({
            categories: Array.isArray(state.categories) ? state.categories.map(cat =>
              cat.id === categoryId
                ? { ...cat, ...updates, updatedAt: new Date().toISOString() }
                : cat
            ) : [],
          }));
        },

        deleteCategory: (categoryId) => {
          set((state) => ({
            categories: Array.isArray(state.categories) ? state.categories.filter(cat => cat.id !== categoryId) : [],
          }));
        },

        // UI actions
        setFilters: (newFilters) => {
          set((state) => ({
            filters: { ...state.filters, ...newFilters },
          }));
        },

        setViewMode: (mode) => {
          set({ viewMode: mode });
        },

        updateNetworkNode: (hostId, nodeData) => {
          set((state) => ({
            networkNodes: {
              ...state.networkNodes,
              [hostId]: {
                ...state.networkNodes[hostId],
                ...nodeData,
              },
            },
          }));
        },

        // Data management
        importData: (data) => {
          set({
            hosts: data.hosts || {},
            categories: data.categories || [],
          });
        },

        exportData: () => {
          const state = get();
          return {
            hosts: state.hosts,
            categories: state.categories,
          };
        },

        clearAllData: () => {
          set({
            hosts: {},
            categories: [],
            selectedHosts: [],
          });
        },

        // Ensure categories have unique IDs (handles past duplicates created within same millisecond)
        ensureUniqueCategoryIds: () => {
          const state = get();
          const categories = Array.isArray(state.categories) ? [...state.categories] : [];
          if (categories.length === 0) return;
          const idToIndexes: Record<string, number[]> = {};
          categories.forEach((c, idx) => {
            const id = c.id || '';
            if (!idToIndexes[id]) idToIndexes[id] = [];
            idToIndexes[id].push(idx);
          });
          let changed = false;
          const oldToNew: Record<string, string> = {};
          // Fix empty ids
          categories.forEach((c) => {
            if (!c.id) {
              const newId = (typeof crypto !== 'undefined' && 'randomUUID' in crypto)
                ? (crypto as any).randomUUID()
                : `${Date.now()}_${Math.floor(Math.random()*1e9)}`;
              oldToNew[''] = newId; // Only used if hosts had empty category
              (c as any).id = newId; changed = true;
            }
          });
          // Fix duplicates
          Object.entries(idToIndexes).forEach(([id, idxs]) => {
            if (id === '' || idxs.length <= 1) return;
            // Keep first, re-id others
            for (let i = 1; i < idxs.length; i++) {
              const idx = idxs[i];
              const newId = (typeof crypto !== 'undefined' && 'randomUUID' in crypto)
                ? (crypto as any).randomUUID()
                : `${Date.now()}_${Math.floor(Math.random()*1e9)}_${i}`;
              oldToNew[`${id}__${idx}`] = newId; // key not used directly
              categories[idx] = { ...categories[idx], id: newId, updatedAt: new Date().toISOString() } as Category;
              changed = true;
            }
          });
          if (!changed) return;
          // Reassign hosts heuristically by hostname includes category name
          const hosts = { ...state.hosts } as Record<string, Host>;
          const lowerNameToId: Record<string, string> = {};
          categories.forEach((c) => { lowerNameToId[(c.name || '').toLowerCase()] = c.id; });
          Object.values(hosts).forEach((h) => {
            // If hostname references a category name, assign it
            const hn = (h.hostname || '').toLowerCase();
            let matched = false;
            for (const [lname, cid] of Object.entries(lowerNameToId)) {
              if (lname && hn.includes(lname)) { (h as any).category = cid; matched = true; break; }
            }
            if (!matched && h.category === '') {
              (h as any).category = categories[0]?.id || '';
            }
          });
          set({ categories, hosts });
        },
      }),
      {
        name: 'auditmapper-hosts',
        partialize: (state) => ({
          hosts: state.hosts,
          categories: state.categories,
        }),
      }
    ),
    {
      name: 'host-store',
    }
  )
);
