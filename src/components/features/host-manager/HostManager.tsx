import React, { useState } from 'react';
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
  CheckCircle,
  AlertTriangle,
  Target,
  Shield,
  Maximize2,
  Minimize2,
  X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { SidebarPanel } from './SidebarPanel';
import { CategoryManager } from './CategoryManager';
import { ImportExportPanel } from './ImportExportPanel';
import NetworkVisualization from './NetworkVisualization';
import { useHostStore } from '@/stores/hostStore';
import { Host } from '@/types';
import InfoModal from '@/components/ui/InfoModal';
// import InputDialog from '@/components/ui/InputDialog';
// import ConfirmDialog from '@/components/ui/ConfirmDialog';

interface HostManagerProps {
  // Props if needed
}

export const HostManager: React.FC<HostManagerProps> = () => {
  const { hosts, categories, updateHost, addHost, ensureUniqueCategoryIds } = useHostStore();
  
  const [selectedHost, setSelectedHost] = useState<Host | null>(null);
  const [showSidebar, setShowSidebar] = useState(false);
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const [showCategoryManager, setShowCategoryManager] = useState(false);
  const [showImportExport, setShowImportExport] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'list' | 'grid' | 'network'>('list');
  const [networkFullscreen, setNetworkFullscreen] = useState(false);
  const [about, setAbout] = useState(false);
  const [bulkParserOpen, setBulkParserOpen] = useState(false);
  const [bulkText, setBulkText] = useState('');
  const [bulkCategoryId, setBulkCategoryId] = useState<string>('');
  const [bulkPreview, setBulkPreview] = useState<{ ip: string; hostname?: string; os?: string; services?: any[]; tags?: string[] }[]>([]);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  React.useEffect(() => { ensureUniqueCategoryIds(); }, [ensureUniqueCategoryIds]);

  // Convert hosts object to array
  const hostsArray = Object.values(hosts);

  // Filter hosts based on search and category
  const filteredHosts = hostsArray.filter((host: Host) => {
    const matchesSearch = host.ip.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         host.hostname?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         host.os?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = selectedCategory === 'all' || host.category === selectedCategory;
    
    return matchesSearch && matchesCategory;
  });

  // Calculate statistics
  const stats = {
    total: hostsArray.length,
    active: hostsArray.filter((h: Host) => h.status === 'active').length,
    compromised: hostsArray.filter((h: Host) => h.status === 'compromised').length,
    critical: hostsArray.filter((h: Host) => h.priority === 'critical').length,
    credentials: hostsArray.reduce((sum: number, h: Host) => sum + h.usernames.length + h.passwords.length + h.hashes.length, 0),
    vulnerabilities: hostsArray.reduce((sum: number, h: Host) => sum + (h.vulnerabilities?.length || 0), 0),
  };

  const handleHostSelect = (host: Host) => {
    setSelectedHost(host);
    setShowSidebar(true);
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
      <div className="main-header p-6">
        <div className="flex-between mb-6">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <img src="/logo.png" alt="AuditMapper" className="w-8 h-8 rounded-lg opacity-80" />
              <div>
                <h1 className="text-2xl font-bold text-slate-100">Gestion des Hôtes</h1>
                <p className="text-slate-400">Organisez et gérez vos systèmes par catégories</p>
              </div>
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
                  compromiseLevel: 'none' as const,
                  category: (categories && categories[0]?.id) || '',
                  usernames: [],
                  passwords: [],
                  hashes: [],
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

        {/* Statistics Cards */}
        <div className="stats-grid mb-6">
          <Card className="stats-card">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Server className="w-8 h-8 text-blue-400" />
                <div>
                  <p className="text-2xl font-bold text-slate-100">{stats.total}</p>
                  <p className="text-sm text-slate-400">Total</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="stats-card">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-8 h-8 text-green-400" />
                <div>
                  <p className="text-2xl font-bold text-slate-100">{stats.active}</p>
                  <p className="text-sm text-slate-400">Actifs</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="stats-card">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-8 h-8 text-orange-400" />
                <div>
                  <p className="text-2xl font-bold text-slate-100">{stats.compromised}</p>
                  <p className="text-sm text-slate-400">Compromis</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="stats-card">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Target className="w-8 h-8 text-red-400" />
                <div>
                  <p className="text-2xl font-bold text-slate-100">{stats.critical}</p>
                  <p className="text-sm text-slate-400">Critiques</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="stats-card">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Shield className="w-8 h-8 text-purple-400" />
                <div>
                  <p className="text-2xl font-bold text-slate-100">{stats.credentials}</p>
                  <p className="text-sm text-slate-400">Credentials</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="stats-card">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-8 h-8 text-orange-400" />
                <div>
                  <p className="text-2xl font-bold text-slate-100">{stats.vulnerabilities}</p>
                  <p className="text-sm text-slate-400">Vulnérabilités</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

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
            <li><strong>Nœuds</strong>: chaque host devient un nœud; style déduit du type (routeur/serveur/workstation...) et d’indicateurs (vulns, creds).</li>
            <li><strong>Arêtes</strong>: construites depuis `host.outgoingConnections[]` où chaque entrée contient `toHostId` et `cause` (étiquetage de l’arête). La suppression d’une arête met à jour le store source.</li>
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
            <li><strong>Export</strong>: serialisation JSON de l’état (`hosts` + `categories` + positions) via le panneau Import/Export.</li>
            <li><strong>Import</strong>: injection contrôlée dans le store; les connexions réseau (`outgoingConnections`) et les positions sont restaurées.</li>
          </ul>
          <h4 className="text-slate-100 font-semibold">Stack</h4>
          <p className="text-slate-300">React + Zustand + Tailwind. Visualisation réseau avec vis-network; interactions (drag, zoom, suppression d’arêtes) synchronisées avec le store. Aucun backend requis.</p>
        </div>
      </InfoModal>

      {/* Main Content */}
      <div className="main-content">
        {/* Left Sidebar */}
        <div className="sidebar-left p-4">
          <h3 className="text-lg font-semibold text-slate-100 mb-4">Catégories</h3>
          <Button
            variant="outline"
            onClick={() => setShowCategoryManager(true)}
            className="w-full mb-4 bg-slate-700 border-slate-600 text-slate-200 hover:bg-slate-600"
          >
            <Plus className="w-4 h-4 mr-2" />
            Nouvelle Catégorie
          </Button>
          
          <div className="space-y-2">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`w-full text-left p-3 rounded-lg transition-colors ${
                selectedCategory === 'all'
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-300 hover:bg-slate-700'
              }`}
            >
              <div className="flex items-center justify-between">
                <span>Tous les Hosts</span>
                <span className="text-sm opacity-70">({hostsArray.length})</span>
              </div>
            </button>
            
            {categories.map((category) => (
              <div key={category.id} className="space-y-1">
                <button
                  onClick={() => setSelectedCategory(category.id)}
                  className={`w-full text-left p-3 rounded-lg transition-colors ${
                    selectedCategory === category.id
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span>{category.name}</span>
                    <span className="text-sm opacity-70">
                      ({hostsArray.filter((h: Host) => h.category === category.id).length})
                    </span>
                  </div>
                </button>
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
                      compromiseLevel: 'none' as const,
                      category: category.id,
                      usernames: [],
                      passwords: [],
                      hashes: [],
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
                            compromiseLevel: 'none' as const,
                            category: (categories && categories[0]?.id) || '',
                            usernames: [],
                            passwords: [],
                            hashes: [],
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
            }`}>
              <NetworkVisualization
                hosts={filteredHosts}
                categories={categories}
                onNodeSelect={handleHostSelect}
                selectedHost={selectedHost}
              />
              
              {/* Fullscreen Toggle */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setNetworkFullscreen(!networkFullscreen)}
                className="absolute top-4 right-4 z-20 bg-slate-800 border-slate-600 text-slate-200 hover:bg-slate-700"
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
                        <div className="flex items-center gap-2">
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
              <div className="absolute top-4 right-4 z-10 flex gap-2">
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
              <NetworkVisualization
                hosts={filteredHosts}
                categories={categories}
                onNodeSelect={handleHostSelect}
                selectedHost={selectedHost}

              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* Bulk Parser Modal */}
      {bulkParserOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-5xl h-[80vh] md:h-[75vh] rounded-lg border border-slate-700 bg-slate-900 shadow-xl flex flex-col">
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
                  <Button variant="outline" className="bg-slate-700 border-slate-600 text-slate-200 hover:bg-slate-600" onClick={()=>{ const parsed = parseHostsFromText(bulkText); setBulkPreview(parsed); }}>Parser</Button>
                  <Button className="bg-blue-600 hover:bg-blue-700" onClick={() => {
                    if (!bulkPreview.length) { const parsed = parseHostsFromText(bulkText); setBulkPreview(parsed); if (!parsed.length) { alert('Rien de détecté'); return; }}
                    (bulkPreview.length ? bulkPreview : parseHostsFromText(bulkText)).forEach((h) => {
                      addHost({
                        ip: h.ip,
                        hostname: h.hostname || '',
                        os: h.os || '',
                        status: 'active',
                        priority: 'medium',
                        compromiseLevel: 'none',
                        category: bulkCategoryId || (categories[0]?.id || ''),
                        usernames: [], passwords: [], hashes: [],
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
    </div>
  );
};

export default HostManager;
