// ==========================================
// TYPES PRINCIPAUX
// ==========================================

export interface NetworkConnection {
  fromHostId: string;
  toHostId: string;
  type: 'outgoing' | 'incoming';
  cause?: string;
  method?: string;
  timestamp: string;
}

export interface Host {
  id: string;
  ip: string;
  hostname?: string;
  os?: string;
  status: 'active' | 'inactive' | 'compromised';
  priority: 'low' | 'medium' | 'high' | 'critical';
  compromiseLevel: 'none' | 'initial' | 'partial' | 'full';
  category?: string;
  usernames: string[];
  passwords: string[];
  hashes: string[];
  vulnerabilities: Vulnerability[];
  exploitationSteps: ExploitationStep[];
  tags: string[];
  notes?: string;
  services: Service[];
  ports: Port[];
  screenshots: Screenshot[];
  outgoingConnections?: NetworkConnection[];
  incomingConnections?: NetworkConnection[];
  discoveredAt?: string;
  lastSeen?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Service {
  name: string;
  port: number;
  status: 'open' | 'closed' | 'filtered';
  description?: string;
  version?: string;
  fqdn?: string;
  os?: string;
  cpe?: string;
  product?: string;
  info?: string;
}

export interface Vulnerability {
  id: string;
  title: string;
  description: string;
  severity: 'Low' | 'Medium' | 'High' | 'Critical';
  cve?: string;
  cvss?: number;
  status: 'open' | 'closed' | 'in_progress';
  exploitAvailable?: boolean;
  exploitPath?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Credential {
  id: string;
  type: 'username' | 'password' | 'hash';
  value: string;
  source?: string;
  createdAt: string;
}

export interface Screenshot {
  id: string;
  title: string;
  description?: string;
  url: string;
  createdAt: string;
}

export interface ExploitationStep {
  id: string;
  title: string;
  description: string;
  command?: string;
  output?: string;
  severity: 'Low' | 'Medium' | 'High' | 'Critical';
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  order?: number;
  screenshots?: string[];
  notes?: string;
  cve?: string; // Nouveau: CVE associé à l'étape
  cvss?: number; // Nouveau: score CVSS
  createdAt: string;
  updatedAt: string;
}

export interface Category {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  client?: string;
  scope: string[];
  startDate: Date;
  endDate?: Date;
  status: 'active' | 'completed' | 'paused';
  hosts: Host[];
  categories: Category[];
  createdAt: Date;
  updatedAt: Date;
}

export interface NetworkNode {
  id: string;
  label: string;
  group: string;
  ip: string;
  hostname?: string;
  os?: string;
  status: 'active' | 'inactive' | 'compromised';
  level: number;
  x?: number;
  y?: number;
}

export interface NetworkEdge {
  id: string;
  from: string;
  to: string;
  label?: string;
  arrows?: string;
  color?: string;
  width?: number;
}

export interface ExportOptions {
  format: 'json' | 'csv' | 'xml' | 'pdf' | 'html' | 'markdown';
  includePasswords: boolean;
  includeHashes: boolean;
  includeScreenshots: boolean;
  includeExploitationSteps: boolean;
  categories?: string[];
  hosts?: string[];
}

export interface ImportOptions {
  format: 'json' | 'csv' | 'xml';
  mergeStrategy: 'replace' | 'merge' | 'append';
  conflictResolution: 'skip' | 'overwrite' | 'rename';
}

// ==========================================
// TYPES POUR LES STORES
// ==========================================

export interface HostStore {
  hosts: Record<string, Host>;
  categories: Record<string, Category>;
  selectedHosts: string[];
  filters: HostFilters;
  searchQuery: string;
  sortBy: keyof Host;
  sortOrder: 'asc' | 'desc';
  
  // Actions
  addHost: (host: Omit<Host, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateHost: (id: string, updates: Partial<Host>) => void;
  removeHost: (id: string) => void;
  removeAllHosts: () => void;
  selectHost: (id: string) => void;
  deselectHost: (id: string) => void;
  selectAllHosts: () => void;
  clearSelection: () => void;
  setFilters: (filters: Partial<HostFilters>) => void;
  setSearchQuery: (query: string) => void;
  setSortBy: (field: keyof Host) => void;
  setSortOrder: (order: 'asc' | 'desc') => void;
  
  // Computed
  filteredHosts: Host[];
  selectedHostsData: Host[];
  aggregatedCredentials: AggregatedCredentials;
}

export interface HostFilters {
  status: 'all' | 'active' | 'inactive' | 'compromised';
  priority: 'all' | 'low' | 'medium' | 'high' | 'critical';
  category: 'all' | string;
}

export interface AggregatedCredentials {
  usernames: string[];
  passwords: string[];
  hashes: string[];
  uniqueUsernames: number;
  uniquePasswords: number;
  uniqueHashes: number;
  totalCredentials: number;
}

// ==========================================
// TYPES POUR LES COMPOSANTS
// ==========================================

export interface HostCardProps {
  host: Host;
  isSelected: boolean;
  onSelect: (id: string) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onViewDetails: (id: string) => void;
}

export interface HostFormProps {
  host?: Host;
  onSubmit: (host: Omit<Host, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onCancel: () => void;
}

export interface CredentialFormProps {
  credential?: Credential;
  hostId: string;
  onSubmit: (credential: Omit<Credential, 'id' | 'discoveredAt'>) => void;
  onCancel: () => void;
}

export interface VulnerabilityFormProps {
  vulnerability?: Vulnerability;
  hostId: string;
  serviceId?: string;
  onSubmit: (vulnerability: Omit<Vulnerability, 'id' | 'discoveredAt'>) => void;
  onCancel: () => void;
}

export interface ExploitationStepFormProps {
  step?: ExploitationStep;
  hostId: string;
  onSubmit: (step: Omit<ExploitationStep, 'id' | 'createdAt'>) => void;
  onCancel: () => void;
}

// ==========================================
// TYPES POUR LES SERVICES
// ==========================================

export interface DatabaseService {
  // Hosts
  getHosts: () => Promise<Host[]>;
  getHost: (id: string) => Promise<Host | null>;
  createHost: (host: Omit<Host, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Host>;
  updateHost: (id: string, updates: Partial<Host>) => Promise<Host>;
  deleteHost: (id: string) => Promise<void>;
  
  // Categories
  getCategories: () => Promise<Category[]>;
  getCategory: (id: string) => Promise<Category | null>;
  createCategory: (category: Omit<Category, 'id' | 'createdAt'>) => Promise<Category>;
  updateCategory: (id: string, updates: Partial<Category>) => Promise<Category>;
  deleteCategory: (id: string) => Promise<void>;
  
  // Projects
  getProjects: () => Promise<Project[]>;
  getProject: (id: string) => Promise<Project | null>;
  createProject: (project: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Project>;
  updateProject: (id: string, updates: Partial<Project>) => Promise<Project>;
  deleteProject: (id: string) => Promise<void>;
}

export interface ExportService {
  exportHosts: (hosts: Host[], options: ExportOptions) => Promise<Blob>;
  exportProject: (project: Project, options: ExportOptions) => Promise<Blob>;
  exportCredentials: (credentials: AggregatedCredentials, options: ExportOptions) => Promise<Blob>;
}

export interface ImportService {
  importHosts: (file: File, options: ImportOptions) => Promise<Host[]>;
  importProject: (file: File, options: ImportOptions) => Promise<Project>;
}

// ==========================================
// TYPES POUR LES UTILITAIRES
// ==========================================

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

export interface SearchResult {
  hosts: Host[];
  categories: Category[];
  total: number;
}

export interface SortConfig {
  field: keyof Host;
  order: 'asc' | 'desc';
}

export interface FilterConfig {
  field: keyof Host;
  value: any;
  operator: 'equals' | 'contains' | 'startsWith' | 'endsWith' | 'in' | 'notIn' | 'gt' | 'lt' | 'gte' | 'lte';
}

// ==========================================
// TYPES POUR LES ÉVÉNEMENTS
// ==========================================

export interface HostEvent {
  type: 'created' | 'updated' | 'deleted' | 'selected' | 'deselected';
  host: Host;
  timestamp: Date;
}

export interface CredentialEvent {
  type: 'added' | 'updated' | 'removed' | 'validated';
  credential: Credential;
  hostId: string;
  timestamp: Date;
}

export interface VulnerabilityEvent {
  type: 'discovered' | 'updated' | 'exploited' | 'mitigated';
  vulnerability: Vulnerability;
  hostId: string;
  timestamp: Date;
}

// ==========================================
// TYPES POUR LES CONFIGURATIONS
// ==========================================

export interface AppConfig {
  theme: 'light' | 'dark' | 'system';
  language: 'fr' | 'en';
  autoSave: boolean;
  autoSaveInterval: number;
  maxHosts: number;
  maxCredentialsPerHost: number;
  enableNotifications: boolean;
  enableSound: boolean;
  enableAnimations: boolean;
  enableKeyboardShortcuts: boolean;
}

export interface UserPreferences {
  defaultCategory: string;
  defaultPriority: Host['priority'];
  defaultCompromiseLevel: Host['compromiseLevel'];
  showPasswords: boolean;
  showHashes: boolean;
  showScreenshots: boolean;
  showExploitationSteps: boolean;
  compactMode: boolean;
  sidebarCollapsed: boolean;
  networkViewMode: 'graph' | 'list' | 'grid';
}

// ==========================================
// TYPES POUR LES NOTIFICATIONS
// ==========================================

export interface Notification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
  createdAt: Date;
}

// ==========================================
// TYPES POUR LES RACCORDEMENTS CLAVIER
// ==========================================

export interface KeyboardShortcut {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  meta?: boolean;
  action: () => void;
  description: string;
  category: string;
}

// ==========================================
// TYPES POUR LES STATISTIQUES
// ==========================================

export interface HostStats {
  total: number;
  active: number;
  inactive: number;
  compromised: number;
  byStatus: Record<string, number>;
  byPriority: Record<string, number>;
  byCompromiseLevel: Record<string, number>;
  byOS: Record<string, number>;
  byCategory: Record<string, number>;
}

export interface CredentialStats {
  total: number;
  uniqueUsernames: number;
  uniquePasswords: number;
  uniqueHashes: number;
  validCredentials: number;
  reusedCredentials: number;
}

export interface VulnerabilityStats {
  total: number;
  bySeverity: Record<Vulnerability['severity'], number>;
  byStatus: Record<Vulnerability['status'], number>;
  exploitable: number;
  exploited: number;
  mitigated: number;
}

// ==========================================
// TYPES POUR LES RAPPORTS
// ==========================================

export interface ReportTemplate {
  id: string;
  name: string;
  description: string;
  sections: ReportSection[];
  variables: ReportVariable[];
  createdAt: Date;
  updatedAt: Date;
}

export interface ReportSection {
  id: string;
  title: string;
  type: 'text' | 'table' | 'chart' | 'image' | 'code';
  content: string;
  order: number;
  required: boolean;
}

export interface ReportVariable {
  name: string;
  type: 'string' | 'number' | 'date' | 'boolean' | 'array';
  defaultValue?: any;
  required: boolean;
  description: string;
}

export interface GeneratedReport {
  id: string;
  templateId: string;
  projectId: string;
  content: string;
  format: 'html' | 'pdf' | 'markdown' | 'docx';
  generatedAt: Date;
  metadata: Record<string, any>;
}

export interface Port {
  port: number;
  status: 'open' | 'closed' | 'filtered';
  description?: string;
  service?: string;
  version?: string;
  fqdn?: string;
  os?: string;
  cpe?: string;
  product?: string;
  info?: string;
}
