import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  AutoReconViewerState,
  ParsedAutoReconData,
  AutoReconHost,
  Service,
  ServiceViewData,
  HostFilter
} from '../types/autorecon';
import { AutoReconParser } from '../utils/autoReconParser';

interface AutoReconStore extends AutoReconViewerState {
  // Actions
  loadAutoReconData: (files: FileList) => Promise<void>;
  setSelectedHosts: (hosts: string[]) => void;
  setSelectedServices: (services: string[]) => void;
  setCurrentView: (view: AutoReconViewerState['currentView']) => void;
  setFilters: (filters: Partial<HostFilter>) => void;
  setSearchTerm: (term: string) => void;
  clearData: () => void;
  
  // Getters
  getFilteredHosts: () => AutoReconHost[];
  getServiceViewData: (serviceName: string) => ServiceViewData | null;
  getHostByIP: (ip: string) => AutoReconHost | null;
  getUniqueServices: () => string[];
  getUniquePorts: () => number[];
  getAllVulnerabilities: () => any[];
  getStatistics: () => {
    totalHosts: number;
    totalServices: number;
    totalVulnerabilities: number;
    totalCommands: number;
    openPorts: number;
    criticalVulns: number;
    highVulns: number;
    mediumVulns: number;
    lowVulns: number;
  };
}

const initialState: AutoReconViewerState = {
  data: null,
  selectedHosts: [],
  selectedServices: [],
  currentView: 'overview',
  filters: {
    ips: [],
    services: [],
    ports: [],
    hasVulnerabilities: undefined,
    osType: undefined
  },
  searchTerm: '',
  isLoading: false,
  error: null
};

export const useAutoReconStore = create<AutoReconStore>()((set, get) => ({
      ...initialState,

      loadAutoReconData: async (files: FileList) => {
        set({ isLoading: true, error: null });
        
        try {
          const parser = new AutoReconParser();
          const data = await parser.parseAutoReconResults(files);
          
          set({
            data,
            isLoading: false,
            error: null,
            selectedHosts: [],
            selectedServices: [],
            currentView: 'overview'
          });
        } catch (error) {
          let errorMessage = 'Erreur lors du parsing des résultats AutoRecon';
          
          if (error instanceof Error) {
            if (error.message.includes('quota')) {
              errorMessage = 'Fichiers trop volumineux. Essayez avec moins de fichiers ou videz le cache du navigateur.';
            } else if (error.message.includes('Fichiers trop volumineux')) {
              errorMessage = error.message;
            } else {
              errorMessage = error.message;
            }
          }
          
          set({
            isLoading: false,
            error: errorMessage
          });
        }
      },

      setSelectedHosts: (hosts: string[]) => {
        set({ selectedHosts: hosts });
      },

      setSelectedServices: (services: string[]) => {
        set({ selectedServices: services });
      },

      setCurrentView: (view: AutoReconViewerState['currentView']) => {
        set({ currentView: view });
      },

      setFilters: (newFilters: Partial<HostFilter>) => {
        set(state => ({
          filters: { ...state.filters, ...newFilters }
        }));
      },

      setSearchTerm: (term: string) => {
        set({ searchTerm: term });
      },

      clearData: () => {
        set(initialState);
      },

      getFilteredHosts: () => {
        const state = get();
        if (!state.data) return [];

        let hosts = state.data.report.hosts;

        // Filter by selected hosts
        if (state.selectedHosts.length > 0) {
          hosts = hosts.filter(host => state.selectedHosts.includes(host.ip));
        }

        // Filter by search term
        if (state.searchTerm) {
          const term = state.searchTerm.toLowerCase();
          hosts = hosts.filter(host =>
            host.ip.toLowerCase().includes(term) ||
            (host.hostname && host.hostname.toLowerCase().includes(term)) ||
            host.services.some(service => service.name.toLowerCase().includes(term)) ||
            host.ports.some(port => port.service.toLowerCase().includes(term))
          );
        }

        // Apply filters
        const { filters } = state;

        if (filters.ips.length > 0) {
          hosts = hosts.filter(host => filters.ips.includes(host.ip));
        }

        if (filters.services.length > 0) {
          hosts = hosts.filter(host =>
            host.services.some(service => filters.services.includes(service.name))
          );
        }

        if (filters.ports.length > 0) {
          hosts = hosts.filter(host =>
            host.ports.some(port => filters.ports.includes(port.port))
          );
        }

        if (filters.hasVulnerabilities !== undefined) {
          hosts = hosts.filter(host =>
            filters.hasVulnerabilities ? host.vulnerabilities.length > 0 : host.vulnerabilities.length === 0
          );
        }

        if (filters.osType) {
          hosts = hosts.filter(host =>
            host.osFingerprint && host.osFingerprint.os.toLowerCase().includes(filters.osType!.toLowerCase())
          );
        }

        return hosts;
      },

      getServiceViewData: (serviceName: string) => {
        const state = get();
        if (!state.data) return null;

        const hosts = state.data.report.hosts;
        const serviceHosts = hosts
          .filter(host => host.services.some(service => service.name === serviceName))
          .map(host => {
            const service = host.services.find(s => s.name === serviceName)!;
            return {
              ip: host.ip,
              version: service.version,
              banner: service.banner,
              scans: service.scans,
              vulnerabilities: service.vulnerabilities
            };
          });

        if (serviceHosts.length === 0) return null;

        // Get port and protocol from first service instance
        const firstService = hosts
          .flatMap(host => host.services)
          .find(service => service.name === serviceName);

        return {
          serviceName,
          port: firstService?.port || 0,
          protocol: firstService?.protocol || 'tcp',
          hosts: serviceHosts,
          totalHosts: serviceHosts.length,
          totalScans: serviceHosts.reduce((sum, host) => sum + host.scans.length, 0),
          totalVulns: serviceHosts.reduce((sum, host) => sum + host.vulnerabilities.length, 0)
        };
      },

      getHostByIP: (ip: string) => {
        const state = get();
        if (!state.data) return null;
        return state.data.report.hosts.find(host => host.ip === ip) || null;
      },

      getUniqueServices: () => {
        const state = get();
        if (!state.data) return [];

        const services = new Set<string>();
        state.data.report.hosts.forEach(host => {
          host.services.forEach(service => {
            services.add(service.name);
          });
        });

        return Array.from(services).sort();
      },

      getUniquePorts: () => {
        const state = get();
        if (!state.data) return [];

        const ports = new Set<number>();
        state.data.report.hosts.forEach(host => {
          host.ports.forEach(port => {
            if (port.state === 'open') {
              ports.add(port.port);
            }
          });
        });

        return Array.from(ports).sort((a, b) => a - b);
      },

      getAllVulnerabilities: () => {
        const state = get();
        if (!state.data) return [];

        const vulnerabilities: any[] = [];
        state.data.report.hosts.forEach(host => {
          host.vulnerabilities.forEach(vuln => {
            vulnerabilities.push({
              ...vuln,
              hostIp: host.ip
            });
          });
          host.services.forEach(service => {
            service.vulnerabilities.forEach(vuln => {
              vulnerabilities.push({
                ...vuln,
                hostIp: host.ip,
                serviceName: service.name
              });
            });
          });
        });

        return vulnerabilities;
      },

      getStatistics: () => {
        const state = get();
        if (!state.data) {
          return {
            totalHosts: 0,
            totalServices: 0,
            totalVulnerabilities: 0,
            totalCommands: 0,
            openPorts: 0,
            criticalVulns: 0,
            highVulns: 0,
            mediumVulns: 0,
            lowVulns: 0
          };
        }

        const { hosts } = state.data.report;
        const allVulns = get().getAllVulnerabilities();

        return {
          totalHosts: hosts.length,
          totalServices: hosts.reduce((sum, host) => sum + host.services.length, 0),
          totalVulnerabilities: allVulns.length,
          totalCommands: hosts.reduce((sum, host) => sum + host.commands.length, 0),
          openPorts: hosts.reduce((sum, host) => 
            sum + host.ports.filter(port => port.state === 'open').length, 0
          ),
          criticalVulns: allVulns.filter(v => v.severity === 'critical').length,
          highVulns: allVulns.filter(v => v.severity === 'high').length,
          mediumVulns: allVulns.filter(v => v.severity === 'medium').length,
          lowVulns: allVulns.filter(v => v.severity === 'low').length
        };
      }
    }));
