import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

export type HTBService = {
  port: number;
  proto: 'tcp' | 'udp';
  service: string;
  version?: string;
  notes?: string;
};

export type HTBTask = {
  id: string;
  title: string;
  status: 'todo' | 'doing' | 'blocked' | 'done';
};

export type ExploitLogEntry = {
  id: string;
  timestamp: string;
  title: string;
  command?: string;
  result?: string;
};

export type HTBProject = {
  id: string;
  name: string;
  ip?: string;
  os?: string;
  htbUrl?: string;
  avatarUrl?: string;
  avatarDataUrl?: string;
  difficultyLabel?: string;
  summary?: string;
  createdAt: string;
  updatedAt: string;
  progress: {
    recon: boolean;
    initialAccess: boolean;
    privesc: boolean;
    root: boolean;
  };
  pwnedAt?: string;
  closed?: boolean;
  closedAt?: string;
  timeSpentSeconds: number;
  objectives?: string;
  severity?: 'low' | 'medium' | 'high' | 'critical';
  tags: string[];
  // Recon
  passiveNotes: string;
  nmapRaw: string;
  services: HTBService[];
  // Initial access
  potentialVectors: { label: string; level: 'red' | 'yellow' | 'green'; note?: string }[];
  usernames: string[];
  passwords: string[];
  hashes: string[];
  exploitLog: ExploitLogEntry[];
  // Privesc
  privescChecklist: { id: string; label: string; done: boolean }[];
  // Post-exploitation
  lateralMoves: { id: string; target: string; method?: string; note?: string }[];
  persistenceNotes: string;
  // Tasks
  tasks: HTBTask[];
  // Writeup/Template
  writeupMarkdown: string;
};

export type HTBProfile = {
  id: string;
  name: string;
  email?: string;
  createdAt: string;
  projects: Record<string, HTBProject>;
  selectedProjectId?: string;
};

type HTBState = {
  profile: HTBProfile;
  addProject: (data: Partial<HTBProject>) => string;
  updateProject: (projectId: string, updates: Partial<HTBProject>) => void;
  deleteProject: (projectId: string) => void;
  selectProject: (projectId?: string) => void;
  closeProject: (projectId: string) => void;
  exportProfile: () => HTBProfile;
  importProfile: (incoming: HTBProfile) => void;
  exportProject: (projectId: string) => HTBProject | null;
  importProject: (proj: HTBProject) => void;
};

function uid(): string {
  return `${Date.now()}_${Math.floor(Math.random() * 1e9)}`;
}

export const useHTBStore = create<HTBState>()(
  devtools(
    persist(
      (set, get) => ({
        profile: {
          id: uid(),
          name: 'Mon Profil HTB',
          createdAt: new Date().toISOString(),
          projects: {},
        },

        addProject: (data) => {
          const id = uid();
          const now = new Date().toISOString();
          const project: HTBProject = {
            id,
            name: data.name || 'Nouvelle Box',
            ip: data.ip || '',
            os: data.os || '',
            createdAt: now,
            updatedAt: now,
            progress: { recon: false, initialAccess: false, privesc: false, root: false },
            timeSpentSeconds: 0,
            objectives: data.objectives || '',
            severity: data.severity || 'medium',
            tags: data.tags || [],
            passiveNotes: '',
            nmapRaw: '',
            services: [],
            potentialVectors: [],
            usernames: [],
            passwords: [],
            hashes: [],
            exploitLog: [],
            privescChecklist: [],
            lateralMoves: [],
            persistenceNotes: '',
            tasks: [
              { id: uid(), title: 'Reconnaissance initiale', status: 'todo' },
              { id: uid(), title: 'Scans Nmap', status: 'todo' },
            ],
            writeupMarkdown: '',
          };
          set((state) => ({
            profile: {
              ...state.profile,
              projects: { ...state.profile.projects, [id]: project },
              selectedProjectId: id,
            },
          }));
          return id;
        },

        updateProject: (projectId, updates) => {
          set((state) => {
            const existing = state.profile.projects[projectId];
            if (!existing) return state as any;
            const updated: HTBProject = { ...existing, ...updates, updatedAt: new Date().toISOString() };
            if (updates.progress && updates.progress.root && !existing.progress.root && !existing.pwnedAt) {
              updated.pwnedAt = new Date().toISOString();
            }
            return {
              profile: {
                ...state.profile,
                projects: { ...state.profile.projects, [projectId]: updated },
              },
            } as any;
          });
        },

        closeProject: (projectId) => {
          set((state) => {
            const existing = state.profile.projects[projectId];
            if (!existing) return state as any;
            const updated: HTBProject = { ...existing, closed: true, closedAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
            return {
              profile: { ...state.profile, projects: { ...state.profile.projects, [projectId]: updated } },
            } as any;
          });
        },

        deleteProject: (projectId) => {
          set((state) => {
            const { [projectId]: _, ...rest } = state.profile.projects;
            const nextSelected = state.profile.selectedProjectId === projectId ? undefined : state.profile.selectedProjectId;
            return {
              profile: { ...state.profile, projects: rest, selectedProjectId: nextSelected },
            } as any;
          });
        },

        selectProject: (projectId) => {
          set((state) => ({ profile: { ...state.profile, selectedProjectId: projectId } } as any));
        },

        exportProfile: () => {
          return JSON.parse(JSON.stringify(get().profile));
        },

        importProfile: (incoming) => {
          set({ profile: incoming });
        },

        exportProject: (projectId) => {
          const p = get().profile.projects[projectId];
          return p ? JSON.parse(JSON.stringify(p)) : null;
        },

        importProject: (proj) => {
          const id = proj.id || uid();
          const normalized = { ...proj, id } as HTBProject;
          set((state) => ({
            profile: { ...state.profile, projects: { ...state.profile.projects, [id]: normalized } },
          } as any));
        },
      }),
      { name: 'htb-profile' }
    )
  )
);


