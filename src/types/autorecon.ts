export interface AutoReconHost {
  ip: string;
  hostname?: string;
  ports: Port[];
  services: Service[];
  vulnerabilities: Vulnerability[];
  commands: Command[];
  scans: ScanResult[];
  screenshots: Screenshot[];
  notes: string;
  osFingerprint?: OSFingerprint;
}

export interface Port {
  port: number;
  protocol: 'tcp' | 'udp';
  state: 'open' | 'closed' | 'filtered';
  service: string;
  version?: string;
  banner?: string;
}

export interface Service {
  name: string;
  port: number;
  protocol: 'tcp' | 'udp';
  version?: string;
  banner?: string;
  scans: ScanResult[];
  vulnerabilities: Vulnerability[];
  files: ServiceFile[];
}

export interface ScanResult {
  tool: string;
  command: string;
  output: string;
  outputFile?: string;
  timestamp?: string;
  service?: string;
  port?: number;
}

export interface Command {
  command: string;
  tool: string;
  timestamp?: string;
  service?: string;
  port?: number;
}

export interface Vulnerability {
  id: string;
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  service?: string;
  port?: number;
  cvss?: number;
  cve?: string;
  references?: string[];
}

export interface Screenshot {
  filename: string;
  path: string;
  timestamp?: string;
  service?: string;
  port?: number;
  description?: string;
}

export interface ServiceFile {
  filename: string;
  path: string;
  type: 'scan' | 'output' | 'report' | 'xml';
  content?: string;
  size?: number;
}

export interface OSFingerprint {
  os: string;
  confidence: number;
  details?: string;
  guesses?: string[];
}

export interface AutoReconReport {
  hosts: AutoReconHost[];
  timestamp: string;
  targetNetwork?: string;
  totalHosts: number;
  metadata: {
    version?: string;
    scanDuration?: string;
    totalCommands?: number;
    totalServices?: number;
  };
}

export interface ParsedAutoReconData {
  report: AutoReconReport;
  rawFiles: Map<string, string>;
  fileStructure: FileNode[];
}

export interface FileNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  children?: FileNode[];
  size?: number;
  extension?: string;
}

export interface ServiceViewData {
  serviceName: string;
  port: number;
  protocol: 'tcp' | 'udp';
  hosts: {
    ip: string;
    version?: string;
    banner?: string;
    scans: ScanResult[];
    vulnerabilities: Vulnerability[];
  }[];
  totalHosts: number;
  totalScans: number;
  totalVulns: number;
}

export interface HostFilter {
  ips: string[];
  services: string[];
  ports: number[];
  hasVulnerabilities?: boolean;
  osType?: string;
}

export interface AutoReconViewerState {
  data: ParsedAutoReconData | null;
  selectedHosts: string[];
  selectedServices: string[];
  currentView: 'overview' | 'hosts' | 'services' | 'vulnerabilities' | 'files';
  filters: HostFilter;
  searchTerm: string;
  isLoading: boolean;
  error: string | null;
}
