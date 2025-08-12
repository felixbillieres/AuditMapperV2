import { create } from 'zustand';
import { Category } from '@/types';

interface CategoryStore {
  categories: Category[];
  addCategory: (category: Category) => void;
  updateCategory: (id: string, updates: Partial<Category>) => void;
  deleteCategory: (id: string) => void;
}

export const useCategoryStore = create<CategoryStore>((set) => ({
  categories: [
    {
      id: 'externe',
      name: 'externe',
      color: '#3b82f6',
      icon: 'Globe',
      description: 'Hôtes externes',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'interne',
      name: 'interne',
      color: '#10b981',
      icon: 'Server',
      description: 'Hôtes internes',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ],
  
  addCategory: (category) => set((state) => ({
    categories: [...state.categories, category],
  })),
  
  updateCategory: (id, updates) => set((state) => ({
    categories: state.categories.map(cat => 
      cat.id === id ? { ...cat, ...updates, updatedAt: new Date().toISOString() } : cat
    ),
  })),
  
  deleteCategory: (id) => set((state) => ({
    categories: state.categories.filter(cat => cat.id !== id),
  })),
}));
