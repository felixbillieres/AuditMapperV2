// ==========================================
// STORE POUR LA GESTION DES PROJETS
// ==========================================

import { create } from 'zustand';
import { persist, devtools } from 'zustand/middleware';

export interface Project {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  color: string;
  isActive: boolean;
}

interface ProjectState {
  // Data
  projects: Record<string, Project>;
  currentProjectId: string | null;
  
  // Actions
  addProject: (projectData: Omit<Project, 'id' | 'createdAt' | 'updatedAt' | 'isActive'>) => string;
  updateProject: (projectId: string, updates: Partial<Project>) => void;
  deleteProject: (projectId: string) => void;
  setCurrentProject: (projectId: string | null) => void;
  getCurrentProject: () => Project | null;
  getAllProjects: () => Project[];
  
  // Data management
  importProjects: (projects: Project[]) => void;
  exportProjects: () => Project[];
  clearAllProjects: () => void;
}

const defaultColors = [
  '#3b82f6', // blue
  '#ef4444', // red
  '#10b981', // emerald
  '#f59e0b', // amber
  '#8b5cf6', // violet
  '#06b6d4', // cyan
  '#84cc16', // lime
  '#f97316', // orange
  '#ec4899', // pink
  '#6b7280', // gray
];

export const useProjectStore = create<ProjectState>()(
  devtools(
    persist(
      (set, get) => ({
        // Initial state
        projects: {},
        currentProjectId: null,

        // Project actions
        addProject: (projectData) => {
          const newId = (typeof crypto !== 'undefined' && 'randomUUID' in crypto)
            ? (crypto as any).randomUUID()
            : `${Date.now()}_${Math.floor(Math.random()*1e9)}`;
          
          const state = get();
          const usedColors = Object.values(state.projects).map(p => p.color);
          const availableColor = defaultColors.find(color => !usedColors.includes(color)) || defaultColors[0];
          
          const newProject: Project = {
            id: newId,
            ...projectData,
            color: projectData.color || availableColor,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            isActive: true,
          };
          
          set((state) => ({
            projects: {
              ...state.projects,
              [newId]: newProject,
            },
            currentProjectId: newId, // Set as current project
          }));
          
          return newId;
        },

        updateProject: (projectId, updates) => {
          set((state) => {
            const project = state.projects[projectId];
            if (!project) return state;

            const updatedProject = {
              ...project,
              ...updates,
              updatedAt: new Date().toISOString(),
            };

            return {
              projects: {
                ...state.projects,
                [projectId]: updatedProject,
              },
            };
          });
        },

        deleteProject: (projectId) => {
          set((state) => {
            const { [projectId]: deleted, ...remainingProjects } = state.projects;
            return {
              projects: remainingProjects,
              currentProjectId: state.currentProjectId === projectId ? null : state.currentProjectId,
            };
          });
        },

        setCurrentProject: (projectId) => {
          set({ currentProjectId: projectId });
        },

        getCurrentProject: () => {
          const state = get();
          return state.currentProjectId ? state.projects[state.currentProjectId] || null : null;
        },

        getAllProjects: () => {
          const state = get();
          return Object.values(state.projects).sort((a, b) => 
            new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
          );
        },

        // Data management
        importProjects: (projects) => {
          const projectsMap = projects.reduce((acc, project) => {
            acc[project.id] = project;
            return acc;
          }, {} as Record<string, Project>);
          
          set({ projects: projectsMap });
        },

        exportProjects: () => {
          const state = get();
          return Object.values(state.projects);
        },

        clearAllProjects: () => {
          set({
            projects: {},
            currentProjectId: null,
          });
        },
      }),
      {
        name: 'auditmapper-projects',
        partialize: (state) => ({
          projects: state.projects,
          currentProjectId: state.currentProjectId,
        }),
      }
    ),
    {
      name: 'project-store',
    }
  )
);
