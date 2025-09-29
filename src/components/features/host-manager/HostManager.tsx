import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Server, 
  Filter, 
  Upload, 
  Plus, 
  Search, 
  List, 
  Grid, 
  Network, 
  Maximize2,
  Minimize2,
  X,
  Eye,
  EyeOff,
  ArrowRight,
  Info
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { SidebarPanel } from './SidebarPanel';
import { CategoryManager } from './CategoryManager';
import { ImportExportPanel } from './ImportExportPanel';
import NetworkVisualization from './NetworkVisualization';
import ClassicVisualization from './ClassicVisualization';
import KillchainVisualization from './KillchainVisualization';
import { StatsModal } from './StatsModal';
import { ExpandedHostModal } from './ExpandedHostModal';
import { LegendButton } from './LegendButton';
import { useHostStore } from '@/stores/hostStore';
import { useProjectStore } from '@/stores/projectStore';
import { Host } from '@/types';
import InfoModal from '@/components/ui/InfoModal';
import DevelopmentModal from '@/components/ui/DevelopmentModal';
import { ProjectDropdown } from './ProjectDropdown';
import { ProjectStats } from './ProjectStats';
// import InputDialog from '@/components/ui/InputDialog';
// import ConfirmDialog from '@/components/ui/ConfirmDialog';

interface HostManagerProps {
  // Props if needed
}

export const HostManager: React.FC<HostManagerProps> = () => {
  const { hosts, categories, updateHost, addHost, ensureUniqueCategoryIds } = useHostStore();
  const { getCurrentProject, getAllProjects, addProject } = useProjectStore();

  // Données de légende pour chaque type de visualisation
  const getLegendData = () => {
    if (networkStyle === 'killchain') {
      return {
        title: 'Légende Killchain',
        items: [
          { color: '#ef4444', label: 'Exploits', description: 'Connexions d\'exploitation' },
          { color: '#a855f7', label: 'Admin', description: 'Connexions administrateur' },
          { color: '#22c55e', label: 'Partages', description: 'Partages réseau' },
          { color: '#3b82f6', label: 'Web', description: 'Services web' }
        ]
      };
    } else {
      return {
        title: 'Légende Classique',
        items: [
          { color: '#3b82f6', label: 'Serveurs', description: 'Machines serveur' },
          { color: '#a855f7', label: 'Routeurs', description: 'Équipements réseau' }
        ]
      };
    }
  };
  
  const [selectedHost, setSelectedHost] = useState<Host | null>(null);
  const [showSidebar, setShowSidebar] = useState(false);
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const [showCategoryManager, setShowCategoryManager] = useState(false);
  const [showImportExport, setShowImportExport] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'list' | 'grid' | 'network'>('list');
  const [networkFullscreen, setNetworkFullscreen] = useState(false);
  const [networkStyle, setNetworkStyle] = useState<'classic' | 'killchain'>('classic');
  const [showNetworkLabels, setShowNetworkLabels] = useState(true);
  const [categoriesSidebarCollapsed, setCategoriesSidebarCollapsed] = useState(false);
  const [showStyleInfo, setShowStyleInfo] = useState(false);

  const [about, setAbout] = useState(false);
  const [bulkParserOpen, setBulkParserOpen] = useState(false);
  const [bulkText, setBulkText] = useState('');
  const [showExpandedModal, setShowExpandedModal] = useState(false);
  const [bulkCategoryId, setBulkCategoryId] = useState<string>('');
  const [bulkPreview, setBulkPreview] = useState<{ ip: string; hostname?: string; os?: string; services?: any[]; tags?: string[] }[]>([]);
  const [statsModalOpen, setStatsModalOpen] = useState(false);
  const [statsModalType, setStatsModalType] = useState<'total' | 'active' | 'compromised' | 'critical' | 'credentials' | 'exploitation'>('total');
  const [killchainDevModalOpen, setKillchainDevModalOpen] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  React.useEffect(() => { ensureUniqueCategoryIds(); }, [ensureUniqueCategoryIds]);

  // Initialiser un projet par défaut si aucun projet n'existe
  React.useEffect(() => {
    const allProjects = getAllProjects();
    if (allProjects.length === 0) {
      addProject({
        name: 'Projet par défaut',
        description: 'Projet initial créé automatiquement',
        color: '#3b82f6',
      });
    }
  }, [getAllProjects, addProject]);

  // Get current project
  const currentProject = getCurrentProject();

  // Convert hosts object to array and filter by project
  const hostsArray = useMemo(() => {
    const allHosts = Object.values(hosts);
    if (!currentProject) {
      return []; // Ne montrer aucun host si aucun projet n'est sélectionné
    }
    // Filtrer strictement par projet - ne pas migrer automatiquement
    return allHosts.filter(host => host.projectId === currentProject.id);
  }, [hosts, currentProject]);

  // Filter hosts based on search and category - mémorisé pour éviter les re-renders inutiles
  const filteredHosts = useMemo(() => {
    return hostsArray.filter((host: Host) => {
      const matchesSearch = host.ip.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           host.hostname?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           host.os?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesCategory = selectedCategory === 'all' || host.category === selectedCategory;
      
      return matchesSearch && matchesCategory;
    });
  }, [hostsArray, searchTerm, selectedCategory]);

  // Calculate statistics - mémorisé pour éviter les recalculs inutiles
  const stats = useMemo(() => ({
    total: hostsArray.length,
    active: hostsArray.filter((h: Host) => h.status === 'active').length,
    compromised: hostsArray.filter((h: Host) => h.status === 'compromised').length,
    critical: hostsArray.filter((h: Host) => h.priority === 'critical').length,
    credentials: hostsArray.reduce((sum: number, h: Host) => sum + h.usernames.length + h.passwords.length + h.hashes.length, 0),
    vulnerabilities: hostsArray.reduce((sum: number, h: Host) => sum + (h.exploitationSteps?.length || 0), 0),
  }), [hostsArray]);

  const handleHostSelect = (host: Host) => {
    setSelectedHost(host);
    setShowSidebar(true);
  };

  const handleOpenExpandedModal = () => {
    if (selectedHost) {
      setShowExpandedModal(true);
    }
  };

  const handleNodeClickInFullscreen = (host: Host) => {
    setSelectedHost(host);
    setShowExpandedModal(true);
  };

  const handleCloseSidebar = () => {
    setShowSidebar(false);
    setSelectedHost(null);
    setSidebarExpanded(false);
  };

  const handleUpdateHost = (host: Host) => {
    updateHost(host.id, host);
    // Synchroniser l'état local pour que la sidebar et les modales reflètent immédiatement les données à jour
    setSelectedHost(host);
  };

  const handleCreateHost = () => {
    setShowSidebar(true);
  };

  const handleCreateConnection = (fromHostId?: string) => {
    // TODO: Implémenter la création de connexions
    console.log('Créer connexion depuis:', fromHostId);
    // Pour l'instant, on ouvre la sidebar pour créer un host
    setShowSidebar(true);
  };

  const parseHostsFromText = (text: string): { ip: string; hostname?: string; os?: string; services?: any[]; tags?: string[] }[] => {
    const results: any[] = [];
    const lines = text.split(/\r?\n/);
    let current: any = null;
    const ipRe = /\b(\d{1,3}(?:\.\d{1,3}){3})\b/;
    // Nmap standard blocks
    lines.forEach((line) => {
      const nmapHost = line.match(/^Nmap scan report for\s+(.*?)(?:\s+\((\d+\.\d+\.\d+\.\d+)\))?$/i);
      if (nmapHost) {
        if (current) results.push(current);
        const name = nmapHost[1];
        const ip = nmapHost[2] || (name.match(ipRe)?.[1] || '');
        current = { ip, hostname: ip === name ? undefined : name, services: [], tags: [] };
        return;
      }
      const portLine = line.match(/^(\d+)\/(tcp|udp)\s+(open|closed|filtered|open\|filtered)\s+([\w\-\?\._]+)(?:\s+(.*))?$/i);
      if (portLine && current) {
        const portNum = Number(portLine[1]);
        const serviceName = portLine[4];
        const versionInfo = portLine[5];
        current.services.push({ port: portNum, status: portLine[3] as any, service: serviceName, version: versionInfo });
        // Heuristiques: Domaine/Forêt/OS depuis la colonne VERSION
        if (versionInfo) {
          const domainMatch = versionInfo.match(/Domain:\s*([^,\)\]]+)/i);
          const forestMatch = versionInfo.match(/Forest:\s*([^,\)\]]+)/i);
          if (domainMatch) current.tags = Array.from(new Set([...(current.tags||[]), `domain:${domainMatch[1].trim()}`]));
          if (forestMatch) current.tags = Array.from(new Set([...(current.tags||[]), `forest:${forestMatch[1].trim()}`]));
          if (!current.os) {
            if (/windows/i.test(versionInfo)) current.os = 'Windows';
            else if (/linux|ubuntu|debian|centos|red hat/i.test(versionInfo)) current.os = 'Linux';
          }
        }
        return;
      }
      const greppable = line.match(/^Host:\s+(\d+\.\d+\.\d+\.\d+)\s+\((.*?)\)\s+Status:\s+Up/i);
      if (greppable) {
        results.push({ ip: greppable[1], hostname: greppable[2] && greppable[2] !== '()' ? greppable[2] : undefined });
        return;
      }
      // TSV/ligne compact: "IP <tab/space> HOSTNAME <tab/space> - <tab/space> 53/domain, 88/kerberos-sec, ..."
      const tsv = line.match(/^(\d{1,3}(?:\.\d{1,3}){3})\s+([^\s]+)\s+-\s+(.+)$/);
      if (tsv) {
        const ip = tsv[1];
        const name = tsv[2];
        const servicesStr = tsv[3];
        const services = servicesStr.split(',').map(s=>s.trim()).filter(Boolean).map(tok => {
          const m = tok.match(/^(\d{1,5})\/(.+)$/);
          if (m) {
            const svc = m[2].trim();
            return { port: Number(m[1]), status: 'open', service: svc.replace(/\?+$/,'') };
          }
          // fallback: only port
          const onlyPort = tok.match(/^(\d{1,5})$/);
          return onlyPort ? { port: Number(onlyPort[1]), status: 'open', service: '' } : null;
        }).filter(Boolean);
        results.push({ ip, hostname: name !== '-' ? name : undefined, services });
        return;
      }
      const fping = line.match(/^(\d{1,3}(?:\.\d{1,3}){3})\s+is\s+alive/i);
      if (fping) {
        results.push({ ip: fping[1] });
        return;
      }
      const pingOnly = line.trim().match(/^\d{1,3}(?:\.\d{1,3}){3}$/);
      if (pingOnly) {
        results.push({ ip: pingOnly[0] });
        return;
      }
      // NetExec/CrackMapExec-like lines: protocol IP [port] ... [*|+|-|!] info
      const ne = line.match(/^(SMB|HTTP|HTTPS|FTP|SSH|RDP|WINRM|LDAP|MSSQL|MYSQL|POSTGRES|VNC)\s+(\d{1,3}(?:\.\d{1,3}){3})(?:\s+(\d{1,5}))?[^\[]*\[(?:\*|\+|\-|!|INFO)?\]\s+(.*)$/i)
        || line.match(/^(SMB|HTTP|HTTPS|FTP|SSH|RDP|WINRM|LDAP|MSSQL|MYSQL|POSTGRES|VNC)\s+(\d{1,3}(?:\.\d{1,3}){3})(?:\s+(\d{1,5}))?\s+(.*)$/i);
      if (ne) {
        const proto = ne[1].toLowerCase();
        const ip = ne[2];
        const portStr = ne[3];
        const info = ne[4] || '';
        const defaultPorts: Record<string, number> = { smb: 445, http: 80, https: 443, ftp: 21, ssh: 22, rdp: 3389, winrm: 5985, ldap: 389, mssql: 1433, mysql: 3306, postgres: 5432, vnc: 5900 };
        const port = portStr ? Number(portStr) : (defaultPorts[proto] || 0);
        const name = (info.match(/name:([^\)\s]+)/i)?.[1] || '').trim();
        const domain = (info.match(/domain:([^\)\s]+)/i)?.[1] || '').trim();
        const os = info.split('(')[0].trim();
        const tags = domain ? [`domain:${domain}`] : [];
        results.push({ ip, hostname: name || undefined, os: os || undefined, services: port ? [{ port, status: 'open', service: proto, version: domain ? `domain:${domain}` : undefined }] : [], tags });
        return;
      }
    });
    if (current) results.push(current);
    // Deduplicate by IP
    const map: Record<string, any> = {};
    results.forEach((r) => {
      if (!r.ip) return;
      if (!map[r.ip]) map[r.ip] = r;
      else {
        if (r.hostname && !map[r.ip].hostname) map[r.ip].hostname = r.hostname;
        if (r.os && !map[r.ip].os) map[r.ip].os = r.os;
        if (r.tags && r.tags.length) {
          const cur = new Set(map[r.ip].tags || []);
          r.tags.forEach((t:string)=>cur.add(t));
          map[r.ip].tags = Array.from(cur);
        }
        if (r.services && r.services.length) map[r.ip].services = [...(map[r.ip].services||[]), ...r.services];
      }
    });
    return Object.values(map);
  };

  const parseHostsFromNmapXml = (xmlText: string): { ip: string; hostname?: string; os?: string; services?: any[] }[] => {
    try {
      const parser = new DOMParser();
      const xml = parser.parseFromString(xmlText, 'application/xml');
      const hostNodes = Array.from(xml.getElementsByTagName('host'));
      const out: any[] = [];
      hostNodes.forEach((host) => {
        const status = host.querySelector('status')?.getAttribute('state');
        if (status && status.toLowerCase() !== 'up') return;
        const addr = host.querySelector('address[addrtype="ipv4"]')?.getAttribute('addr') || '';
        if (!addr) return;
        const hostnames = host.querySelector('hostnames > hostname')?.getAttribute('name') || undefined;
        const ports = Array.from(host.querySelectorAll('ports > port')).map((p) => {
          const portid = Number(p.getAttribute('portid') || '0');
          const proto = p.getAttribute('protocol') || 'tcp';
          const state = p.querySelector('state')?.getAttribute('state') || '';
          const svc = p.querySelector('service');
          const name = svc?.getAttribute('name') || '';
          const version = [svc?.getAttribute('product'), svc?.getAttribute('version')].filter(Boolean).join(' ');
          return { port: portid, status: state, service: name || proto, version };
        }).filter((s) => s.status && s.status !== 'closed');
        const osmatch = host.querySelector('os osmatch')?.getAttribute('name') || undefined;
        out.push({ ip: addr, hostname: hostnames, os: osmatch, services: ports });
      });
      return out;
    } catch {
      return [];
    }
  };

  const handleHostsFileImport = async (file: File) => {
    const name = file.name.toLowerCase();
    const text = await file.text();
    let parsed: any[] = [];
    if (name.endsWith('.xml')) {
      parsed = parseHostsFromNmapXml(text);
    } else if (name.endsWith('.json')) {
      try {
        const data = JSON.parse(text);
        const arr = Array.isArray(data) ? data : (data.hosts ? (Array.isArray(data.hosts) ? data.hosts : Object.values(data.hosts)) : []);
        parsed = arr.map((h: any) => ({ ip: h.ip, hostname: h.hostname, os: h.os, services: h.services || h.ports || [] })).filter((h: any) => h.ip);
      } catch {
        parsed = [];
      }
    } else {
      // .nmap/.gnmap/.txt — fallback to text parser
      parsed = parseHostsFromText(text);
    }
    setBulkText(text);
    setBulkPreview(parsed);
  };


  return (
    <div className="app-layout">
      {/* Header */}
      <div className="main-header p-4">
        <div className="flex-between mb-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <img src="/logo.png" alt="AuditMapper" className="w-8 h-8 rounded-lg opacity-80" />
              <div>
                <h1 className="text-2xl font-bold text-slate-100">Gestion des Hôtes</h1>
                <p className="text-slate-400">Organisez et gérez vos systèmes par catégories</p>
              </div>
            </div>
            <div className="ml-8">
              <ProjectDropdown />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="default"
              onClick={() => { setBulkCategoryId(categories[0]?.id || ''); setBulkText(''); setBulkParserOpen(true); }}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              Parseur de Hosts
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowCategoryManager(true)}
              className="bg-slate-700 border-slate-600 text-slate-200 hover:bg-slate-600"
            >
              <Filter className="w-4 h-4 mr-2" />
              Catégories
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowImportExport(true)}
              className="bg-slate-700 border-slate-600 text-slate-200 hover:bg-slate-600"
            >
              <Upload className="w-4 h-4 mr-2" />
              Import/Export
            </Button>
            <Button
              variant="default"
              onClick={() => {
                const newHost = {
                  ip: '0.0.0.0',
                  hostname: 'Nouveau Host',
                  os: 'Unknown',
                  status: 'active' as const,
                  priority: 'medium' as const,
                  compromiseLevel: 'no_foothold' as const,
                  category: (categories && categories[0]?.id) || '',
                  projectId: currentProject?.id,
                  usernames: [],
                  passwords: [],
                  hashes: [],
                  credentials: [],
                  exploitationSteps: [],
                  screenshots: [],
                  vulnerabilities: [],
                  tags: [],
                  services: [],
                  ports: [],
                  outgoingConnections: [],
                  incomingConnections: [],
                  notes: '',
                };
                addHost(newHost);
                // Trouver le host créé et l'ouvrir
                const createdHost = Object.values(hosts).find(h => 
                  h.ip === newHost.ip && h.hostname === newHost.hostname
                );
                if (createdHost) {
                  setSelectedHost(createdHost);
                  setShowSidebar(true);
                }
              }}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Nouveau Host
            </Button>
            <Button
              variant="outline"
              className="bg-slate-800 border-slate-600 text-slate-200 hover:bg-slate-700"
              onClick={() => setAbout(true)}
            >
              ℹ️ Comment ça marche
            </Button>
          </div>
        </div>

        {/* Statistics Cards - Compact for laptops */}
        {currentProject ? (
          <ProjectStats 
            hosts={hostsArray} 
            className="mb-4" 
            onStatClick={(type) => {
              setStatsModalType(type);
              setStatsModalOpen(true);
            }}
          />
        ) : (
          <div className="mb-4 p-4 bg-slate-800/50 border border-slate-600 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-blue-600/20 flex items-center justify-center">
                <Server className="w-4 h-4 text-blue-400" />
              </div>
              <div>
                <h3 className="text-slate-100 font-medium">Aucun projet sélectionné</h3>
                <p className="text-sm text-slate-400">Sélectionnez un projet pour voir les statistiques et commencer à travailler</p>
              </div>
            </div>
          </div>
        )}

        {/* Search and View Controls */}
        <div className="flex items-center gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
            <Input
              placeholder="Rechercher par IP, hostname, OS..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-slate-700 border-slate-600 text-slate-100"
            />
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant={viewMode === 'list' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('list')}
              className={viewMode === 'list' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-slate-700 border-slate-600 text-slate-200 hover:bg-slate-600'}
            >
              <List className="w-4 h-4" />
            </Button>
            <Button
              variant={viewMode === 'grid' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('grid')}
              className={viewMode === 'grid' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-slate-700 border-slate-600 text-slate-200 hover:bg-slate-600'}
            >
              <Grid className="w-4 h-4" />
            </Button>
            <Button
              variant={viewMode === 'network' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('network')}
              className={viewMode === 'network' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-slate-700 border-slate-600 text-slate-200 hover:bg-slate-600'}
            >
              <Network className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      <InfoModal open={about} onClose={() => setAbout(false)} title="Host Manager – architecture et flux de données">
        <div className="space-y-2">
          <h4 className="text-slate-100 font-semibold">Données et persistance</h4>
          <ul className="list-disc ml-5 space-y-1">
            <li><strong>Store Zustand</strong>: `useHostStore` et `useCategoryStore` centralisent `hosts` et `categories` avec persistance locale (localStorage).</li>
            <li><strong>Modèle Host</strong>: identifiant stable `id`, métadonnées (ip, hostname, os, status, priority), artefacts (usernames, passwords, hashes, screenshots), `vulnerabilities`, et graph (`outgoingConnections`, `incomingConnections`).</li>
            <li><strong>Positions réseau</strong>: `networkNodes` sauvegarde `x/y` par host pour conserver le layout entre sessions.</li>
          </ul>
          <h4 className="text-slate-100 font-semibold">Relations (nodes/edges)</h4>
          <ul className="list-disc ml-5 space-y-1">
            <li><strong>Nœuds</strong>: chaque host devient un nœud; style déduit du type (routeur/serveur/workstation...) et d'indicateurs (vulns, creds).</li>
            <li><strong>Arêtes</strong>: construites depuis `host.outgoingConnections[]` où chaque entrée contient `toHostId` et `cause` (étiquetage de l'arête). La suppression d'une arête met à jour le store source.</li>
            <li><strong>Sélection</strong>: clic sur un nœud → ouverture de la sidebar liée au host pour édition immédiate.</li>
          </ul>
          <h4 className="text-slate-100 font-semibold">Traitement et vues</h4>
          <ul className="list-disc ml-5 space-y-1">
            <li><strong>Filtrage</strong>: recherche plein‑texte (ip/hostname/os) + filtre par catégorie.</li>
            <li><strong>Stats</strong>: agrégations calculées à la volée (actifs, compromis, critiques, credentials, vulnérabilités).</li>
            <li><strong>Vues</strong>: list/grid (cartes) ou réseau (vis-network). Reflow automatique de la zone principale selon la sidebar.</li>
          </ul>
          <h4 className="text-slate-100 font-semibold">Import / Export</h4>
          <ul className="list-disc ml-5 space-y-1">
            <li><strong>Export</strong>: serialisation JSON de l'état (`hosts` + `categories` + positions) via le panneau Import/Export.</li>
            <li><strong>Import</strong>: injection contrôlée dans le store; les connexions réseau (`outgoingConnections`) et les positions sont restaurées.</li>
          </ul>
          <h4 className="text-slate-100 font-semibold">Stack</h4>
          <p className="text-slate-300">React + Zustand + Tailwind. Visualisation réseau avec vis-network; interactions (drag, zoom, suppression d'arêtes) synchronisées avec le store. Aucun backend requis.</p>
        </div>
      </InfoModal>


      {/* Main Content */}
      <div className="main-content">
        {/* Left Sidebar */}
        <div className={`sidebar-left transition-all duration-300 ${categoriesSidebarCollapsed ? 'w-16' : 'w-64'} p-4`}>
          <div className="flex items-center justify-between mb-4">
            {!categoriesSidebarCollapsed && (
              <h3 className="text-lg font-semibold text-slate-100">Catégories</h3>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCategoriesSidebarCollapsed(!categoriesSidebarCollapsed)}
              className="text-slate-400 hover:text-slate-200 p-1"
              title={categoriesSidebarCollapsed ? "Développer" : "Réduire"}
            >
              {categoriesSidebarCollapsed ? (
                <ArrowRight className="w-4 h-4" />
              ) : (
                <ArrowRight className="w-4 h-4 rotate-180" />
              )}
            </Button>
          </div>
          <Button
            variant="outline"
            onClick={() => setShowCategoryManager(true)}
            className={`mb-4 bg-slate-700 border-slate-600 text-slate-200 hover:bg-slate-600 ${categoriesSidebarCollapsed ? 'w-full p-2' : 'w-full'}`}
            title={categoriesSidebarCollapsed ? "Nouvelle Catégorie" : undefined}
          >
            <Plus className={`w-4 h-4 ${categoriesSidebarCollapsed ? '' : 'mr-2'}`} />
            {!categoriesSidebarCollapsed && "Nouvelle Catégorie"}
          </Button>
          
          <div className="space-y-2">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`w-full text-left rounded-lg transition-colors ${
                selectedCategory === 'all'
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-300 hover:bg-slate-700'
              } ${categoriesSidebarCollapsed ? 'p-2 flex justify-center' : 'p-3'}`}
              title={categoriesSidebarCollapsed ? `Tous les Hosts (${hostsArray.length})` : undefined}
            >
              {categoriesSidebarCollapsed ? (
                <Server className="w-4 h-4" />
              ) : (
                <div className="flex items-center justify-between">
                  <span>Tous les Hosts</span>
                  <span className="text-sm opacity-70">({hostsArray.length})</span>
                </div>
              )}
            </button>
            
            {categories.map((category) => (
              <div key={category.id} className="space-y-1">
                <button
                  onClick={() => setSelectedCategory(category.id)}
                  className={`w-full text-left rounded-lg transition-colors ${
                    selectedCategory === category.id
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-300 hover:bg-slate-700'
                  } ${categoriesSidebarCollapsed ? 'p-2 flex justify-center' : 'p-3'}`}
                  title={categoriesSidebarCollapsed ? `${category.name} (${hostsArray.filter((h: Host) => h.category === category.id).length})` : undefined}
                >
                  {categoriesSidebarCollapsed ? (
                    <div 
                      className="w-4 h-4 rounded-full border-2" 
                      style={{ backgroundColor: category.color, borderColor: category.color }}
                    />
                  ) : (
                    <div className="flex items-center justify-between">
                      <span>{category.name}</span>
                      <span className="text-sm opacity-70">
                        ({hostsArray.filter((h: Host) => h.category === category.id).length})
                      </span>
                    </div>
                  )}
                </button>
                {!categoriesSidebarCollapsed && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const newHost = {
                        ip: '0.0.0.0',
                        hostname: `Nouveau Host ${category.name}`,
                        os: 'Unknown',
                        status: 'active' as const,
                        priority: 'medium' as const,
                        compromiseLevel: 'no_foothold' as const,
                        category: category.id,
                        projectId: currentProject?.id,
                        usernames: [],
                        passwords: [],
                        hashes: [],
                        credentials: [],
                        exploitationSteps: [],
                        screenshots: [],
                        vulnerabilities: [],
                        tags: [],
                        services: [],
                        ports: [],
                        outgoingConnections: [],
                        incomingConnections: [],
                        notes: '',
                      };
                      addHost(newHost);
                      // Trouver le host créé et l'ouvrir
                      const createdHost = Object.values(hosts).find(h => 
                        h.ip === newHost.ip && h.hostname === newHost.hostname
                      );
                      if (createdHost) {
                        setSelectedHost(createdHost);
                        setShowSidebar(true);
                      }
                    }}
                    className="w-full bg-slate-700 border-slate-600 text-slate-200 hover:bg-slate-600 text-xs"
                  >
                    <Plus className="w-3 h-3 mr-1" />
                    Ajouter un hôte
                  </Button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Content Area */}
        <div className="content-area relative">
          {hostsArray.length === 0 ? (
            <div className="content-main p-8">
              <div className="mx-auto max-w-3xl rounded-lg border border-slate-700 bg-slate-800 p-6">
                <div className="mb-4">
                  <h3 className="text-xl font-semibold text-slate-100">Bienvenue dans le Host Manager</h3>
                  <p className="text-slate-400 mt-1">Aucun hôte pour le moment. Voici par où commencer et ce que vous pouvez faire ici.</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="rounded border border-slate-700 bg-slate-900/40 p-4">
                    <h4 className="text-slate-200 font-medium mb-2">Ajouter vos premiers hôtes</h4>
                    <ul className="list-disc ml-5 text-sm text-slate-400 space-y-1">
                      <li>Créer un hôte manuellement (IP, hostname, OS…)</li>
                      <li>Parser des outputs (Nmap, NetExec, fping)</li>
                      <li>Importer un export JSON existant</li>
                    </ul>
                    <div className="flex flex-wrap gap-2 mt-3">
                      <Button
                        variant="default"
                        className="bg-blue-600 hover:bg-blue-700"
                        onClick={() => {
                          const newHost = {
                            ip: '0.0.0.0',
                            hostname: 'Nouveau Host',
                            os: 'Unknown',
                            status: 'active' as const,
                            priority: 'medium' as const,
                            compromiseLevel: 'no_foothold' as const,
                            category: (categories && categories[0]?.id) || '',
                            projectId: currentProject?.id,
                            usernames: [],
                            passwords: [],
                            hashes: [],
                            credentials: [],
                            exploitationSteps: [],
                            screenshots: [],
                            vulnerabilities: [],
                            tags: [],
                            services: [],
                            ports: [],
                            outgoingConnections: [],
                            incomingConnections: [],
                            notes: '',
                          };
                          addHost(newHost);
                          const createdHost = Object.values(hosts).find(h => h.ip === newHost.ip && h.hostname === newHost.hostname);
                          if (createdHost) { setSelectedHost(createdHost); setShowSidebar(true); }
                        }}
                      >
                        <Plus className="w-4 h-4 mr-2" /> Ajouter un hôte
                      </Button>
                      <Button
                        variant="outline"
                        className="bg-slate-700 border-slate-600 text-slate-200 hover:bg-slate-600"
                        onClick={() => { setBulkCategoryId(categories[0]?.id || ''); setBulkText(''); setBulkParserOpen(true); }}
                      >
                        🔎 Parseur
                      </Button>
                      <Button
                        variant="outline"
                        className="bg-slate-700 border-slate-600 text-slate-200 hover:bg-slate-600"
                        onClick={() => setShowImportExport(true)}
                      >
                        <Upload className="w-4 h-4 mr-2" /> Importer
                      </Button>
                    </div>
                  </div>
                  <div className="rounded border border-slate-700 bg-slate-900/40 p-4">
                    <h4 className="text-slate-200 font-medium mb-2">Fonctionnalités clés</h4>
                    <ul className="list-disc ml-5 text-sm text-slate-400 space-y-1">
                      <li>Catégorisation des hôtes et filtres rapides</li>
                      <li>Vue liste/grille et <em>visualisation réseau</em></li>
                      <li>Gestion des credentials, vulnérabilités, captures</li>
                      <li>Workflow d’exploitation et notes par hôte</li>
                      <li>Import/Export JSON complet</li>
                    </ul>
                    <div className="flex flex-wrap gap-2 mt-3">
                      <Button
                        variant="outline"
                        className="bg-slate-700 border-slate-600 text-slate-200 hover:bg-slate-600"
                        onClick={() => setShowCategoryManager(true)}
                      >
                        <Filter className="w-4 h-4 mr-2" /> Gérer les catégories
                      </Button>
                      <Button
                        variant="outline"
                        className="bg-slate-700 border-slate-600 text-slate-200 hover:bg-slate-600"
                        onClick={() => setViewMode('network')}
                      >
                        <Network className="w-4 h-4 mr-2" /> Voir la vue réseau
                      </Button>
                      <Button
                        variant="outline"
                        className="bg-slate-700 border-slate-600 text-slate-200 hover:bg-slate-600"
                        onClick={() => setAbout(true)}
                      >
                        ℹ️ Comment ça marche
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : viewMode === 'network' ? (
            // Network Visualization
            <div className={`content-main network-container transition-all duration-300 ${
              showSidebar && sidebarExpanded ? 'mr-[50%]' : showSidebar ? 'mr-[28rem]' : ''
            }`} style={{ height: 'calc(100vh - 120px)', minHeight: '800px' }}>
              {/* Contrôles unifiés */}
              <div className="absolute top-4 right-4 z-30 space-y-2">
                {/* Style Selector */}
                <div className="bg-slate-800/95 backdrop-blur-md rounded-xl p-3 border border-slate-600/50 shadow-2xl ring-1 ring-white/5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-300 font-medium">Style:</span>
                    <div className="flex gap-1">

                      <button
                        onClick={() => setNetworkStyle('classic')}
                        className={`inline-flex items-center justify-center whitespace-nowrap text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border hover:text-accent-foreground h-9 rounded-md px-3 ${
                          networkStyle === 'classic' 
                            ? 'bg-purple-600/80 border-purple-500 text-white hover:bg-purple-500/80' 
                            : 'bg-slate-700 border-slate-600 text-slate-200 hover:bg-slate-600'
                        }`}
                        title="Vue classique avec zones réseau"
                      >
                        <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" strokeWidth="2" fill="none"/>
                          <path d="M2 17L12 22L22 17" stroke="currentColor" strokeWidth="2" fill="none"/>
                          <path d="M2 12L12 17L22 12" stroke="currentColor" strokeWidth="2" fill="none"/>
                        </svg>
                        Classique
                      </button>
                      <button
                        onClick={() => setKillchainDevModalOpen(true)}
                        className={`inline-flex items-center justify-center whitespace-nowrap text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border hover:text-accent-foreground h-9 rounded-md px-3 ${
                          networkStyle === 'killchain' 
                            ? 'bg-indigo-600/80 border-indigo-500 text-white hover:bg-indigo-500/80' 
                            : 'bg-slate-700 border-slate-600 text-slate-200 hover:bg-slate-600'
                        }`}
                        title="Vue Killchain - En cours de développement"
                      >
                        <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" strokeWidth="2" fill="none"/>
                          <path d="M2 17L12 22L22 17" stroke="currentColor" strokeWidth="2" fill="none"/>
                          <path d="M2 12L12 17L22 12" stroke="currentColor" strokeWidth="2" fill="none"/>
                          <path d="M8 4L16 4" stroke="currentColor" strokeWidth="2"/>
                          <path d="M8 20L16 20" stroke="currentColor" strokeWidth="2"/>
                        </svg>
                        Killchain
                      </button>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowStyleInfo(!showStyleInfo)}
                      className="ml-2 border-slate-500/50 text-slate-100 hover:border-slate-400 transition-all duration-200 backdrop-blur-sm px-2 bg-slate-700/80 hover:bg-slate-600/80"
                      title="Informations sur le mode"
                    >
                      <Info className="w-3 h-3" />
                    </Button>
                  </div>
                  
                  {/* Dropdown des informations du mode */}
                  {showStyleInfo && (
                    <div className="mt-3 pt-3 border-t border-slate-600/50">
                      <h3 className="text-sm font-semibold text-slate-100 mb-2 flex items-center gap-2">
                        {networkStyle === 'killchain' ? (
                          <svg className="w-4 h-4 text-red-400" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" strokeWidth="2" fill="none"/>
                            <path d="M2 17L12 22L22 17" stroke="currentColor" strokeWidth="2" fill="none"/>
                            <path d="M2 12L12 17L22 12" stroke="currentColor" strokeWidth="2" fill="none"/>
                          </svg>
                        ) : (
                          <Info className="w-4 h-4 text-blue-400" />
                        )}
                        {networkStyle === 'classic' ? 'Mode Classique' : 'Mode Killchain'}
                      </h3>
                      <div className="space-y-1 text-xs text-slate-300">
                        {networkStyle === 'classic' ? (
                          <>
                            <div className="flex items-start gap-2">
                              <span className="text-purple-400">•</span>
                              <span><strong className="text-slate-200">Zones réseau</strong> par catégorie</span>
                            </div>
                            <div className="flex items-start gap-2">
                              <span className="text-purple-400">•</span>
                              <span><strong className="text-slate-200">Nœuds avec emojis</strong> selon le type</span>
                            </div>
                            <div className="flex items-start gap-2">
                              <span className="text-purple-400">•</span>
                              <span><strong className="text-slate-200">Connexions colorées</strong> par type</span>
                            </div>
                            <div className="flex items-start gap-2">
                              <span className="text-purple-400">•</span>
                              <span><strong className="text-slate-200">Zoom et pan fluides</strong></span>
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="flex items-start gap-2">
                              <span className="text-red-400">•</span>
                              <span><strong className="text-slate-200">Phases d'attaque</strong> visuelles</span>
                            </div>
                            <div className="flex items-start gap-2">
                              <span className="text-red-400">•</span>
                              <span><strong className="text-slate-200">Connexions d'exploitation</strong> colorées</span>
                            </div>
                            <div className="flex items-start gap-2">
                              <span className="text-red-400">•</span>
                              <span><strong className="text-slate-200">Workflow d'attaque</strong> complet</span>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Bouton Mode Anonyme */}
                <div className="flex gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowNetworkLabels(!showNetworkLabels)}
                    className={`px-4 py-2 text-sm font-medium transition-all duration-200 ${
                      showNetworkLabels 
                        ? 'bg-slate-700/80 border-slate-500/50 text-slate-100 hover:bg-slate-600/80 hover:border-slate-400' 
                        : 'bg-red-600/80 border-red-500/50 text-white hover:bg-red-500/80 hover:border-red-400'
                    }`}
                    title={showNetworkLabels ? "Activer le mode anonyme" : "Désactiver le mode anonyme"}
                  >
                    {showNetworkLabels ? <Eye className="w-4 h-4 mr-2" /> : <EyeOff className="w-4 h-4 mr-2" />}
                    {showNetworkLabels ? "Mode anonyme" : "Mode normal"}
                  </Button>

                  <LegendButton
                    {...getLegendData()}
                    className=""
                  />
                </div>
              </div>



              {/* Network Visualization Component */}
              {networkStyle === 'classic' ? (
                <ClassicVisualization
                  hosts={filteredHosts}
                  categories={categories}
                  onNodeSelect={handleHostSelect}
                  selectedHost={selectedHost}
                  showLabels={showNetworkLabels}
                  onCreateHost={handleCreateHost}
                  onCreateConnection={handleCreateConnection}
                />
              ) : (
                <KillchainVisualization
                  hosts={filteredHosts}
                  categories={categories}
                  onNodeSelect={handleHostSelect}
                  selectedHost={selectedHost}
                  showLabels={showNetworkLabels}
                />
              )}
              
              {/* Fullscreen Toggle */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setNetworkFullscreen(!networkFullscreen)}
                className="absolute top-4 left-4 z-20 bg-slate-800/95 backdrop-blur-md border-slate-600 text-slate-200 hover:bg-slate-700 shadow-lg"
                title={networkFullscreen ? "Quitter le plein écran" : "Mode plein écran"}
              >
                {networkFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </Button>
            </div>
          ) : (
            // List/Grid View
            <div className={`content-main transition-all duration-300 overflow-auto ${
              showSidebar && sidebarExpanded ? 'mr-[50%]' : showSidebar ? 'mr-[28rem]' : ''
            }`}>
              <div className={viewMode === 'grid' ? 'host-grid' : 'space-y-4 p-6'}>
                {filteredHosts.map((host) => (
                  <Card
                    key={host.id}
                    className="host-card"
                    onClick={() => handleHostSelect(host)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h3 className="font-mono text-lg font-semibold text-slate-100">{host.ip}</h3>
                          <p className="text-sm text-slate-400">{host.hostname || 'Sans nom'}</p>
                          <p className="text-xs text-slate-500">{host.os || 'Unknown OS'}</p>
                        </div>
                        <div className="flex flex-col md:flex-row items-end md:items-center gap-1 md:gap-2">
                          <span className={`px-2 py-1 text-xs rounded ${
                            host.status === 'active' ? 'bg-green-900/50 text-green-400 border border-green-700' :
                            host.status === 'compromised' ? 'bg-orange-900/50 text-orange-400 border border-orange-700' :
                            'bg-slate-700 text-slate-400 border border-slate-600'
                          }`}>
                            {host.status}
                          </span>
                          <span className={`px-2 py-1 text-xs rounded ${
                            host.priority === 'critical' ? 'bg-red-900/50 text-red-400 border border-red-700' :
                            host.priority === 'high' ? 'bg-orange-900/50 text-orange-400 border border-orange-700' :
                            host.priority === 'medium' ? 'bg-yellow-900/50 text-yellow-400 border border-yellow-700' :
                            'bg-green-900/50 text-green-400 border border-green-700'
                          }`}>
                            {host.priority}
                          </span>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between text-xs text-slate-400">
                        <span>{host.vulnerabilities?.length || 0} vulns</span>
                        <span>{host.exploitationSteps?.length || 0} steps</span>
                        <span>{host.screenshots?.length || 0} screens</span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Right Sidebar Panel */}
          <AnimatePresence>
            {showSidebar && selectedHost && (
              <div className={`absolute top-0 right-0 h-full z-40 transition-all duration-300 ${
                sidebarExpanded ? 'w-[50%] min-w-[800px]' : 'w-[28rem]'
              }`}>
                <SidebarPanel
                  selectedHost={selectedHost}
                  onClose={handleCloseSidebar}
                  onUpdateHost={handleUpdateHost}
                  isExpanded={sidebarExpanded}
                  onExpandChange={setSidebarExpanded}
                  onOpenExpandedModal={handleOpenExpandedModal}
                />
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Modals */}
      <AnimatePresence>
        {showCategoryManager && (
          <CategoryManager onClose={() => setShowCategoryManager(false)} />
        )}
        {showImportExport && (
          <ImportExportPanel onClose={() => setShowImportExport(false)} />
        )}
        {statsModalOpen && (
          <StatsModal
            isOpen={statsModalOpen}
            onClose={() => setStatsModalOpen(false)}
            type={statsModalType}
            hosts={hostsArray}
            stats={stats}
          />
        )}
      </AnimatePresence>

      {/* Fullscreen Network Modal */}
      <AnimatePresence>
        {networkFullscreen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-slate-900"
          >
            <div className="h-full relative">
              <div className="absolute top-4 left-4 z-20 flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setNetworkFullscreen(false)}
                  className="bg-slate-800 border-slate-600 text-slate-200 hover:bg-slate-700"
                >
                  <X className="w-4 h-4 mr-2" />
                  Fermer
                </Button>
              </div>
              {networkStyle === 'classic' ? (
                <ClassicVisualization
                  hosts={filteredHosts}
                  categories={categories}
                  onNodeSelect={handleNodeClickInFullscreen}
                  selectedHost={selectedHost}
                  showLabels={showNetworkLabels}
                  onCreateHost={handleCreateHost}
                  onCreateConnection={handleCreateConnection}
                />
              ) : networkStyle === 'killchain' ? (
                <KillchainVisualization
                  hosts={filteredHosts}
                  categories={categories}
                  onNodeSelect={handleNodeClickInFullscreen}
                  selectedHost={selectedHost}
                  showLabels={showNetworkLabels}
                  onCreateHost={() => setShowSidebar(true)}
                  onCreateConnection={(fromHostId) => {
                    // TODO: Implémenter la création de connexions
                    console.log('Créer connexion depuis:', fromHostId);
                  }}
                />
              ) : (
                <NetworkVisualization
                  hosts={filteredHosts}
                  categories={categories}
                  onNodeSelect={handleNodeClickInFullscreen}
                  selectedHost={selectedHost}
                  uiRightOffset={120}
                  showLabels={showNetworkLabels}
                  graphStyle="bloodhound"
                  onCreateHost={() => setShowSidebar(true)}
                  onCreateConnection={(fromHostId) => {
                    // TODO: Implémenter la création de connexions
                    console.log('Créer connexion depuis:', fromHostId);
                  }}
                />
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* Bulk Parser Modal */}
      {bulkParserOpen && (
        <div 
          className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 p-4"
          onClick={() => setBulkParserOpen(false)}
        >
          <div 
            className="w-full max-w-5xl h-[80vh] md:h-[75vh] rounded-lg border border-slate-700 bg-slate-900 shadow-xl flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-slate-700 flex items-center justify-between sticky top-0 bg-slate-900 z-10">
              <div className="text-slate-100 font-semibold">Parseur de Hosts (Nmap / NetExec / Fping)</div>
              <Button variant="outline" className="bg-slate-800 border-slate-600 text-slate-200 hover:bg-slate-700" onClick={()=>setBulkParserOpen(false)}>Fermer</Button>
            </div>
            <div className="p-4 space-y-3 flex-1 overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="text-sm text-slate-300 mb-1">Catégorie cible</label>
                  <select value={bulkCategoryId} onChange={(e)=>setBulkCategoryId(e.target.value)} className="w-full bg-slate-700 border-slate-600 text-slate-100 rounded px-3 py-2">
                    {categories.map(c=> (<option key={c.id} value={c.id}>{c.name}</option>))}
                  </select>
                </div>
                <div className="md:col-span-2 text-sm text-slate-400">
                  Collez des outputs Nmap, Nmap greppable, NetExec (CME/NXC), fping… ou importez directement un fichier (.xml/.nmap/.gnmap/.json/.txt). Les IP et ports ouverts seront extraits.
                </div>
              </div>

              {/* Cheatsheet commandes utiles */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="p-3 bg-slate-800 rounded border border-slate-600">
                  <div className="text-slate-200 text-sm font-semibold mb-2">Découverte rapide</div>
                  {[
                    { label: 'Nmap Ping Sweep', cmd: 'nmap -sn 192.168.0.0/24' },
                    { label: 'fping (rapide)', cmd: 'fping -uqg 192.168.0.0/24' },
                    { label: 'Greppable', cmd: 'nmap -sn 192.168.0.0/24 -oG nmap_output' },
                  ].map(({label, cmd}) => (
                    <div key={cmd} className="mb-2">
                      <div className="text-xs text-slate-400 mb-1">{label}</div>
                      <div className="flex items-center gap-2">
                        <code className="flex-1 text-xs bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-300 overflow-x-auto">{cmd}</code>
                        <Button variant="outline" size="sm" className="bg-slate-700 border-slate-600 text-slate-200 hover:bg-slate-600 px-2"
                          onClick={()=>navigator.clipboard.writeText(cmd)}>📋</Button>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="p-3 bg-slate-800 rounded border border-slate-600">
                  <div className="text-slate-200 text-sm font-semibold mb-2">Services & OS</div>
                  {[
                    { label: 'Nmap Services (rapide)', cmd: 'nmap -sV 192.168.0.0/24' },
                    { label: 'Nmap Full TCP', cmd: 'nmap -sS -p- --min-rate 2000 192.168.0.0/24' },
                    { label: 'NetExec SMB', cmd: 'netexec smb 192.168.0.0/24' },
                  ].map(({label, cmd}) => (
                    <div key={cmd} className="mb-2">
                      <div className="text-xs text-slate-400 mb-1">{label}</div>
                      <div className="flex items-center gap-2">
                        <code className="flex-1 text-xs bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-300 overflow-x-auto">{cmd}</code>
                        <Button variant="outline" size="sm" className="bg-slate-700 border-slate-600 text-slate-200 hover:bg-slate-600 px-2"
                          onClick={()=>navigator.clipboard.writeText(cmd)}>📋</Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between gap-2">
                <textarea value={bulkText} onChange={(e)=>setBulkText(e.target.value)} rows={16} className="w-full bg-slate-800 border border-slate-600 text-slate-100 rounded p-3 font-mono text-sm" placeholder="# Collez ici" />
              </div>
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <input ref={fileInputRef} type="file" accept=".xml,.nmap,.gnmap,.json,.txt" className="hidden" onChange={async (e)=>{ const f = e.target.files?.[0]; if (f) { await handleHostsFileImport(f); e.currentTarget.value=''; } }} />
                  <Button variant="outline" className="bg-slate-700 border-slate-600 text-slate-200 hover:bg-slate-600" onClick={()=> fileInputRef.current?.click()}>Importer un fichier…</Button>
                </div>
                <div className="text-sm text-slate-400">Prévisualisation: {bulkPreview.length} hôte(s)</div>
              </div>
              <div className="flex justify-between items-center gap-2">
                <div />
                <div className="flex gap-2">
                  <Button variant="outline" className="bg-slate-800 border-slate-600 text-slate-200 hover:bg-slate-700" onClick={()=>{setBulkText(''); setBulkPreview([]);}}>Effacer</Button>
                  <Button variant="outline" className="bg-slate-700 border-slate-600 text-slate-200 hover:bg-slate-600" onClick={()=>{ 
                    const parsed = parseHostsFromText(bulkText); 
                    setBulkPreview(parsed); 
                    if (parsed.length === 0) {
                      alert('Aucun hôte détecté. Vérifiez que le format du texte est correct (Nmap, NetExec, etc.)');
                    }
                  }}>Parser</Button>
                  <Button className="bg-blue-600 hover:bg-blue-700" onClick={() => {
                    // Toujours parser le texte pour obtenir les résultats les plus récents
                    const currentParsed = bulkPreview.length > 0 ? bulkPreview : parseHostsFromText(bulkText);
                    if (!currentParsed.length) { 
                      alert('Aucun hôte détecté dans le texte. Vérifiez le format.'); 
                      return; 
                    }
                    // Mettre à jour la preview si nécessaire
                    if (!bulkPreview.length) {
                      setBulkPreview(currentParsed);
                    }
                    console.log(`Creating ${currentParsed.length} hosts:`, currentParsed.map(h => h.ip));
                    currentParsed.forEach((h, index) => {
                      console.log(`Adding host ${index + 1}/${currentParsed.length}: ${h.ip} (${h.hostname})`);
                      addHost({
                        ip: h.ip,
                        hostname: h.hostname || '',
                        os: h.os || '',
                        status: 'active',
                        priority: 'medium',
                        compromiseLevel: 'no_foothold',
                        category: bulkCategoryId || (categories[0]?.id || ''),
                        projectId: currentProject?.id,
                        usernames: [], passwords: [], hashes: [],
                        credentials: [],
                        vulnerabilities: [], exploitationSteps: [], tags: h.tags || [], notes: '',
                        services: (h.services || []).map((s:any)=>({ name: s.service, port: s.port, status: s.status, version: s.version })),
                        ports: (h.services || []).map((s:any)=>({ port: s.port, status: s.status as any, service: s.service, version: s.version })),
                        screenshots: [], outgoingConnections: [], incomingConnections: [],
                      });
                    });
                    setBulkParserOpen(false);
                  }}>Créer {bulkPreview.length ? `(${bulkPreview.length})` : ''}</Button>
                </div>
              </div>

              {bulkPreview.length > 0 && (
                <div className="max-h-72 overflow-y-auto border border-slate-700 rounded">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-slate-800 text-slate-300">
                        <th className="px-3 py-2 text-left">IP</th>
                        <th className="px-3 py-2 text-left">Hostname</th>
                        <th className="px-3 py-2 text-left">OS</th>
                        <th className="px-3 py-2 text-left">Services</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bulkPreview.map((h)=> (
                        <tr key={h.ip} className="border-t border-slate-700">
                          <td className="px-3 py-1 font-mono text-slate-100">{h.ip}</td>
                          <td className="px-3 py-1 text-slate-200">{h.hostname || '-'}</td>
                          <td className="px-3 py-1 text-slate-200">{h.os || '-'}</td>
                          <td className="px-3 py-1 text-slate-200">{(h.services || []).map((s:any)=>`${s.port}/${s.service}`).join(', ') || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal Agrandi */}
      {showExpandedModal && selectedHost && (
        <ExpandedHostModal
          currentHost={selectedHost}
          isOpen={showExpandedModal}
          onClose={() => {
            setShowExpandedModal(false);
            setSelectedHost(null);
          }}
          onUpdateHost={handleUpdateHost}
        />
      )}

      {/* Modal de développement Killchain */}
      <DevelopmentModal
        isOpen={killchainDevModalOpen}
        onClose={() => setKillchainDevModalOpen(false)}
        title="Vue Killchain en développement"
        feature="la vue Killchain"
      />
    </div>
  );
};

export default HostManager;
