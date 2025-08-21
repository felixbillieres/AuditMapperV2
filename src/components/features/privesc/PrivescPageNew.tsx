import React, { useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { usePrivescStore, PrivescMode } from '@/stores/privescStore';
import { createPortal } from 'react-dom';
import {
  Shield,
  Wrench,
  Info,
  Search,
  RefreshCw,
  Bug,
  Clipboard,
  Upload,
  Download,
  ExternalLink,
} from 'lucide-react';
import InfoModal from '@/components/ui/InfoModal';

const copyText = async (text: string) => {
  try { await navigator.clipboard.writeText(text); } catch {}
};

type ItemDetails = {
  description?: string;
  commands?: string[];
  lookFors?: string[]; // ce qu'il faut chercher
  expected?: string[]; // sorties attendues / indices
};

const DETAILS: Record<string, ItemDetails> = {
  // Linux
  uname: {
    description: "Version noyau et distribution pour identifier des exploits ciblés.",
    commands: ["uname -a", "lsb_release -a 2>/dev/null || cat /etc/os-release"],
    lookFors: ["Kernel trop ancien", "Distribution non patchée"],
    expected: ["Linux target 5.x …", "Ubuntu 20.04 …"],
  },
  id: {
    description: "Contexte utilisateur et privilèges potentiels.",
    commands: ["id", "groups", "sudo -l 2>/dev/null"],
    lookFors: ["(sudo) NOPASSWD", "groupes sensibles (docker, lxd, adm)"],
    expected: ["uid=1000(user) gid=1000(user) groups=docker"],
  },
  proc: {
    description: "Processus et services pour découvertes d'angles d'attaque.",
    commands: ["ps aux", "ss -tunlp", "systemctl list-units --type=service"],
    lookFors: ["services tournant en root", "ports internes", "binaires custom"],
    expected: ["/opt/app/service (root)", "127.0.0.1:8080"],
  },
  files: {
    description: "Fichiers SUID/SGID intéressants pour escalade.",
    commands: ["find / -perm -4000 -type f -exec ls -la {} + 2>/dev/null"],
    lookFors: ["binaire custom SUID", "GTFOBins SUID"],
    expected: ["-rwsr-xr-x root root /usr/bin/pythonX"],
  },
  capabilities: {
    description: "Capacités Linux abusables (cap_setuid…).",
    commands: ["getcap -r / 2>/dev/null"],
    lookFors: ["cap_setuid=ep", "cap_dac_read_search=ep"],
    expected: ["/usr/bin/python3 = cap_setuid+ep"],
  },
  cron: {
    description: "Cron modifiable permettant l'exécution planifiée.",
    commands: ["crontab -l", "ls -la /etc/cron*", "systemctl list-timers"],
    lookFors: ["script cron éditable", "chemin écrivable"],
    expected: ["/etc/cron.daily/backup.sh (user: root, writable: user)"],
  },
  docker: {
    description: "Membre du groupe docker -> escalade via conteneur privilégié.",
    commands: ["id | grep -qi docker && echo 'in docker group'"],
    lookFors: ["groupe docker présent"],
    expected: ["groups=... docker ..."],
  },
  nfs: {
    description: "Montages NFS avec no_root_squash permettant root local.",
    commands: ["cat /etc/exports 2>/dev/null", "mount | grep -i nfs"],
    lookFors: ["no_root_squash", "rw"],
    expected: ["/srv/share *(rw,sync,no_root_squash)"],
  },
  path: {
    description: "Répertoires en PATH écrivable (hijack).",
    commands: ["echo $PATH", "ls -ld $(echo $PATH | tr ':' ' ')"],
    lookFors: ["writable dans PATH", "scripts appelant des binaires sans chemin absolu"],
    expected: ["drwxrwxr-x user /usr/local/bin"],
  },

  // Windows
  whoami: {
    description: "Contexte utilisateur et privilèges/tokens.",
    commands: ["whoami /all"],
    lookFors: ["SeImpersonate/SeAssignPrimaryToken", "groupes Admin/Backup"],
    expected: ["Privilege Name: SeImpersonatePrivilege"],
  },
  systeminfo: {
    description: "Version OS et patchs -> mapping CVE/EoP.",
    commands: ["systeminfo"],
    lookFors: ["build ancien", "service pack manquant"],
    expected: ["OS Version: 10.0.17763"],
  },
  net: {
    description: "Services / shares / sessions utiles.",
    commands: ["net start", "net share", "query user"],
    lookFors: ["service custom", "share accessible"],
    expected: ["Share name: C$", "Service: CustomSvc"]
  },
  qfe: {
    description: "Hotfix installés: vérifier si EoP patchée.",
    commands: ["wmic qfe list full"],
    lookFors: ["KB absent pour vuln connue"],
    expected: ["KB5006365 missing"],
  },
  dll_hijack: {
    description: "DLL manquante dans PATH -> charge notre DLL.",
    commands: ["Procmon filter 'NAME NOT FOUND'", "Autoruns (Logon/Services)"],
    lookFors: ["répertoire écrivable dans ordre de recherche"],
    expected: ["LoadLibrary('missing.dll')"]
  },
  unquoted: {
    description: "Chemin de service non quoté -> drop binaire dans chemin partiel.",
    commands: ["wmic service get name,displayname,pathname,startmode | findstr /i 'Auto' | findstr /i /v 'C:\\Windows\\'", "icacls C:\\Program Files\\Vulnerable /grant Users:F"],
    lookFors: ["dossier écrivable avant l'exécutable"],
    expected: ["Service started with our binary"],
  },
  schtasks: {
    description: "Tâches planifiées modifiables/détournables.",
    commands: ["schtasks /query /fo LIST /v", "Get-ScheduledTask"],
    lookFors: ["Action/Arguments modifiables", "binaire dans chemin écrivable"],
    expected: ["Task runs our payload"],
  },
  alwaysinstall: {
    description: "AlwaysInstallElevated -> MSI en SYSTEM.",
    commands: ["reg query HKCU\\...AlwaysInstallElevated", "reg query HKLM\\...AlwaysInstallElevated"],
    lookFors: ["Valeur 1 sur HKCU et HKLM"],
    expected: ["Both keys = 0x1"],
  },
  seimpersonate: {
    description: "Token SeImpersonate -> Juicy/RoguePotato.",
    commands: ["whoami /all", "JuicyPotato.exe -t *"],
    lookFors: ["SeImpersonate présent"],
    expected: ["NT AUTHORITY\\SYSTEM"],
  },
  backup: {
    description: "SeBackup/SeRestore -> lecture SAM/SECURITY.",
    commands: ["reg save HKLM\\SAM C:\\temp\\sam.save", "reg save HKLM\\SYSTEM C:\\temp\\system.save"],
    lookFors: ["Privilèges présents"],
    expected: ["Successfully saved registry key"],
  },
  uac: {
    description: "Bypass UAC selon contexte (non élévation).",
    commands: ["Check UAC level", "fodhelper/elevated COM hijack"],
    lookFors: ["Installations autorisées"],
    expected: ["Exécution élevée de notre appli"],
  },
};

const THEMES: Record<PrivescMode, { id: string; title: string; items: { id: string; label: string; helpKey?: string }[] }[]> = {
  linux: [
    {
      id: 'enum_basics',
      title: 'Reconnaissance de base',
      items: [
        { id: 'uname', label: 'uname -a / lsb_release -a' },
        { id: 'id', label: 'id / groups / sudo -l' },
        { id: 'proc', label: 'ps aux / services / ports ouverts' },
        { id: 'files', label: 'Fichiers SUID/SGID intéressants' },
      ],
    },
    {
      id: 'weak_perms',
      title: 'Permissions faibles',
      items: [
        { id: 'capabilities', label: 'Linux capabilities (getcap -r /)' },
        { id: 'cron', label: 'Cron modifiable' },
        { id: 'path', label: 'PATH hijack / writable dirs' },
        { id: 'nfs', label: 'NFS (no_root_squash ?) / montages' },
        { id: 'docker', label: 'Docker/LXC groupe docker / sockets' },
      ],
    },
    {
      id: 'kernel',
      title: 'Kernel & Exploits',
      items: [
        { id: 'kernel_ver', label: 'Version kernel / exploits connus' },
        { id: 'dirty', label: 'Dirty* (Cow/Pipe/…) si applicable' },
      ],
    },
  ],
  windows: [
    {
      id: 'enum_basics_win',
      title: 'Reconnaissance de base',
      items: [
        { id: 'whoami', label: 'whoami /priv /groups' },
        { id: 'systeminfo', label: 'systeminfo / wmic qfe' },
        { id: 'net', label: 'services, sessions, shares' },
      ],
    },
    {
      id: 'services',
      title: 'Services & DLL',
      items: [
        { id: 'dll_hijack', label: 'DLL Hijacking' },
        { id: 'unquoted', label: 'Unquoted Service Path' },
        { id: 'schtasks', label: 'Scheduled Tasks (schtasks)' },
        { id: 'alwaysinstall', label: 'AlwaysInstallElevated' },
      ],
    },
    {
      id: 'tokens',
      title: 'Privs & Tokens',
      items: [
        { id: 'seimpersonate', label: 'SeImpersonate / JuicyPotato / RoguePotato' },
        { id: 'backup', label: 'SeBackup/SeRestore (SAM/SECURITY backup)' },
        { id: 'uac', label: 'UAC bypass (contexte applicatif)' },
      ],
    },
  ],
};

const TechniqueModal: React.FC<{ 
  open: boolean; 
  onClose: () => void; 
  techniqueId: string; 
  mode: PrivescMode;
}> = ({ open, onClose, techniqueId, mode }) => {
  if (!open) return null;
  
  const technique = DETAILS[techniqueId];
  if (!technique) return null;

  const getTechniqueIcon = (id: string) => {
    const icons: Record<string, string> = {
      uname: '🐧', id: '👤', proc: '⚙️', files: '📁', capabilities: '🔓',
      cron: '⏰', docker: '🐳', nfs: '💾', path: '🛤️', whoami: '🪟',
      systeminfo: 'ℹ️', net: '🌐', qfe: '🔧', dll_hijack: '🎯',
      unquoted: '📝', schtasks: '⏱️', alwaysinstall: '📦', seimpersonate: '🔄',
      backup: '💿', uac: '🚪'
    };
    return icons[id] || '🔍';
  };

  const getDifficultyColor = (id: string) => {
    const difficulties: Record<string, string> = {
      uname: 'text-green-400', id: 'text-green-400', proc: 'text-yellow-400',
      files: 'text-orange-400', capabilities: 'text-red-400', cron: 'text-orange-400',
      docker: 'text-red-400', nfs: 'text-orange-400', path: 'text-yellow-400',
      whoami: 'text-green-400', systeminfo: 'text-green-400', net: 'text-yellow-400',
      qfe: 'text-orange-400', dll_hijack: 'text-red-400', unquoted: 'text-orange-400',
      schtasks: 'text-orange-400', alwaysinstall: 'text-red-400', seimpersonate: 'text-red-400',
      backup: 'text-orange-400', uac: 'text-yellow-400'
    };
    return difficulties[id] || 'text-slate-400';
  };

  const getDifficultyLabel = (id: string) => {
    const difficulties: Record<string, string> = {
      uname: 'Facile', id: 'Facile', proc: 'Moyen', files: 'Difficile',
      capabilities: 'Très difficile', cron: 'Difficile', docker: 'Très difficile',
      nfs: 'Difficile', path: 'Moyen', whoami: 'Facile', systeminfo: 'Facile',
      net: 'Moyen', qfe: 'Difficile', dll_hijack: 'Très difficile', unquoted: 'Difficile',
      schtasks: 'Difficile', alwaysinstall: 'Très difficile', seimpersonate: 'Très difficile',
      backup: 'Difficile', uac: 'Moyen'
    };
    return difficulties[id] || 'Inconnue';
  };

  return createPortal(
    <div className="fixed inset-0 z-[1000]">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="w-full max-w-4xl max-h-[90vh] bg-slate-900 border border-slate-700 rounded-xl shadow-xl overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b border-slate-700 bg-slate-800">
            <div className="flex items-center gap-3">
              <span className="text-2xl">{getTechniqueIcon(techniqueId)}</span>
              <div>
                <div className="font-semibold text-slate-100 text-lg">{techniqueId}</div>
                <div className="text-sm text-slate-400">Technique d'escalade de privilèges</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className={`px-2 py-1 rounded text-xs font-medium ${getDifficultyColor(techniqueId)} bg-slate-700`}>
                {getDifficultyLabel(techniqueId)}
              </span>
              <button className="text-slate-400 hover:text-slate-200" onClick={onClose}>✕</button>
            </div>
          </div>
          
          <div className="p-6 space-y-6 overflow-y-auto max-h-[calc(90vh-80px)]">
            {/* Description */}
            <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
              <h3 className="text-slate-100 font-semibold mb-2 flex items-center gap-2">
                📖 Description
              </h3>
              <p className="text-slate-300 leading-relaxed">{technique.description}</p>
            </div>

            {/* Commandes */}
            {technique.commands && technique.commands.length > 0 && (
              <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
                <h3 className="text-slate-100 font-semibold mb-3 flex items-center gap-2">
                  💻 Commandes d'énumération
                </h3>
                <div className="space-y-3">
                  {technique.commands.map((cmd, idx) => (
                    <div key={idx} className="flex items-center gap-3">
                      <div className="flex-1">
                        <pre className="bg-slate-900 border border-slate-600 text-slate-200 text-sm p-3 rounded overflow-x-auto">
                          <code>{cmd}</code>
                        </pre>
                      </div>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={() => copyText(cmd)} 
                        className="bg-slate-700 border-slate-600 text-slate-200 hover:bg-slate-600 shrink-0"
                      >
                        Copier
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Ce qu'il faut chercher */}
            {technique.lookFors && technique.lookFors.length > 0 && (
              <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
                <h3 className="text-slate-100 font-semibold mb-3 flex items-center gap-2">
                  🔍 Indicateurs de vulnérabilité
                </h3>
                <ul className="space-y-2">
                  {technique.lookFors.map((item, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="text-red-400 mt-1">•</span>
                      <span className="text-slate-300">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Sorties attendues */}
            {technique.expected && technique.expected.length > 0 && (
              <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
                <h3 className="text-slate-100 font-semibold mb-3 flex items-center gap-2">
                  ✅ Signes de succès
                </h3>
                <ul className="space-y-2">
                  {technique.expected.map((item, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="text-green-400 mt-1">✓</span>
                      <span className="text-slate-300">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Étapes d'exploitation */}
            <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
              <h3 className="text-slate-100 font-semibold mb-3 flex items-center gap-2">
                🎯 Étapes d'exploitation
              </h3>
              <div className="bg-slate-900 rounded-lg p-4 border border-slate-600">
                <ol className="space-y-3 text-slate-300">
                  <li className="flex items-start gap-3">
                    <span className="bg-blue-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center shrink-0 mt-0.5">1</span>
                    <span>Exécuter les commandes d'énumération pour identifier la vulnérabilité</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="bg-blue-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center shrink-0 mt-0.5">2</span>
                    <span>Analyser les résultats pour confirmer la présence de la vulnérabilité</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="bg-blue-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center shrink-0 mt-0.5">3</span>
                    <span>Préparer et exécuter l'exploit approprié</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="bg-blue-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center shrink-0 mt-0.5">4</span>
                    <span>Vérifier l'élévation de privilèges obtenue</span>
                  </li>
                </ol>
              </div>
            </div>

            {/* Ressources supplémentaires */}
            <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
              <h3 className="text-slate-100 font-semibold mb-3 flex items-center gap-2">
                📚 Ressources supplémentaires
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <a href="https://book.hacktricks.xyz/" target="_blank" rel="noreferrer" className="text-blue-400 hover:underline flex items-center gap-2 p-2 bg-slate-700 rounded hover:bg-slate-600">
                  <ExternalLink className="w-4 h-4" /> HackTricks
                </a>
                <a href="https://gtfobins.github.io/" target="_blank" rel="noreferrer" className="text-blue-400 hover:underline flex items-center gap-2 p-2 bg-slate-700 rounded hover:bg-slate-600">
                  <ExternalLink className="w-4 h-4" /> GTFOBins
                </a>
                <a href="https://lolbas-project.github.io/" target="_blank" rel="noreferrer" className="text-blue-400 hover:underline flex items-center gap-2 p-2 bg-slate-700 rounded hover:bg-slate-600">
                  <ExternalLink className="w-4 h-4" /> LOLBAS
                </a>
                <a href="https://github.com/carlospolop/PEASS-ng" target="_blank" rel="noreferrer" className="text-blue-400 hover:underline flex items-center gap-2 p-2 bg-slate-700 rounded hover:bg-slate-600">
                  <ExternalLink className="w-4 h-4" /> PEASS-ng
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

const PrivescPage: React.FC = () => {
  const [mode, setMode] = useState<PrivescMode>('linux');
  const { checklists, toggleItem, resetMode } = usePrivescStore();
  const [query, setQuery] = useState('');
  const [about, setAbout] = useState(false);
  const [selectedTechnique, setSelectedTechnique] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const themes = THEMES[mode];

  const filteredThemes = useMemo(() => {
    if (!query.trim()) return themes;
    const q = query.toLowerCase();
    return themes
      .map(t => ({
        ...t,
        items: t.items.filter(i => i.label.toLowerCase().includes(q) || i.id.toLowerCase().includes(q))
      }))
      .filter(t => t.items.length > 0);
  }, [themes, query]);

  const stateForMode = checklists[mode] || {};

  const exportJson = () => {
    const data = { mode, checklists };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `privesc_${new Date().toISOString().slice(0,10)}.json`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
  };

  const importJson = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(String(reader.result));
        if (data?.checklists) {
          localStorage.setItem('privesc-store', JSON.stringify({ state: { checklists: data.checklists } }));
          window.location.reload();
        }
      } catch {}
    };
    reader.readAsText(file);
  };

  const linuxQuick: { label: string; cmd: string }[] = [
    { label: 'uname / lsb_release', cmd: 'uname -a; lsb_release -a 2>/dev/null' },
    { label: 'id / groups / sudo -l', cmd: 'id; groups; sudo -l 2>/dev/null' },
    { label: 'SUID/SGID', cmd: "find / -perm -4000 -type f -exec ls -la {} + 2>/dev/null" },
    { label: 'Capabilities', cmd: 'getcap -r / 2>/dev/null' },
    { label: 'Cron', cmd: 'crontab -l; ls -la /etc/cron*; systemctl list-timers' },
    { label: 'Docker group', cmd: 'id | grep -qi docker && echo "User in docker group"' },
  ];

  const windowsQuick: { label: string; cmd: string }[] = [
    { label: 'whoami /priv', cmd: 'whoami /all' },
    { label: 'systeminfo', cmd: 'systeminfo' },
    { label: 'Hotfix (qfe)', cmd: 'wmic qfe list full' },
    { label: 'Services (unquoted)', cmd: 'wmic service get name,displayname,pathname,startmode | findstr /i "Auto" | findstr /i /v "C:\\Windows\\"' },
    { label: 'Scheduled Tasks', cmd: 'schtasks /query /fo LIST /v' },
    { label: 'AlwaysInstallElevated', cmd: 'reg query HKCU\\Software\\Policies\\Microsoft\\Windows\\Installer /v AlwaysInstallElevated & reg query HKLM\\Software\\Policies\\Microsoft\\Windows\\Installer /v AlwaysInstallElevated' },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* Header amélioré */}
      <div className="bg-slate-900 border-b border-slate-700 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center">
                <Shield className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-slate-100">PrivEsc Helper</h1>
                <p className="text-slate-400 text-lg">Guide complet pour l'escalade de privilèges</p>
              </div>
            </div>
            
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex bg-slate-800 rounded-lg p-1">
                <Button 
                  onClick={() => setMode('linux')} 
                  className={`px-4 py-2 rounded-md transition-all ${
                    mode === 'linux' 
                      ? 'bg-blue-600 text-white shadow-lg' 
                      : 'bg-transparent text-slate-400 hover:text-slate-200'
                  }`}
                >
                  🐧 Linux
                </Button>
                <Button 
                  onClick={() => setMode('windows')} 
                  className={`px-4 py-2 rounded-md transition-all ${
                    mode === 'windows' 
                      ? 'bg-blue-600 text-white shadow-lg' 
                      : 'bg-transparent text-slate-400 hover:text-slate-200'
                  }`}
                >
                  🪟 Windows
                </Button>
              </div>
              
              <div className="flex items-center gap-2">
                <Button onClick={exportJson} variant="outline" className="bg-slate-700 border-slate-600 text-slate-200 hover:bg-slate-600">
                  <Download className="w-4 h-4 mr-2" /> Export
                </Button>
                <input ref={fileRef} type="file" accept="application/json" className="hidden" onChange={(e)=>{ const f=e.target.files?.[0]; if (f) importJson(f); }} />
                <Button onClick={()=>fileRef.current?.click()} variant="outline" className="bg-slate-700 border-slate-600 text-slate-200 hover:bg-slate-600">
                  <Upload className="w-4 h-4 mr-2" /> Import
                </Button>
                <Button onClick={() => resetMode(mode)} variant="outline" className="bg-slate-700 border-slate-600 text-slate-200 hover:bg-slate-600">
                  <RefreshCw className="w-4 h-4 mr-2" /> Reset
                </Button>
                <Button variant="outline" className="bg-slate-700 border-slate-600 text-slate-200 hover:bg-slate-600" onClick={() => setAbout(true)}>
                  ℹ️ Aide
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Contenu principal avec layout amélioré */}
      <div className="max-w-7xl mx-auto p-6">
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
          {/* Sidebar gauche - Outils et recherche */}
          <div className="xl:col-span-1 space-y-6">
            {/* Barre de recherche */}
            <Card className="border-slate-700 bg-slate-800/50 backdrop-blur-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-slate-100 flex items-center gap-2 text-lg">
                  <Search className="w-5 h-5" /> Recherche
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Input 
                  value={query} 
                  onChange={(e)=>setQuery(e.target.value)} 
                  placeholder="Filtrer les techniques..." 
                  className="bg-slate-700 border-slate-600 text-slate-200 placeholder:text-slate-500" 
                />
              </CardContent>
            </Card>

            {/* Statistiques */}
            <Card className="border-slate-700 bg-slate-800/50 backdrop-blur-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-slate-100 flex items-center gap-2 text-lg">
                  📊 Progression
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {filteredThemes.map(theme => {
                    const themeState = stateForMode[theme.id] || {};
                    const totalItems = theme.items.length;
                    const completedItems = Object.values(themeState).filter(Boolean).length;
                    const percentage = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;
                    
                    return (
                      <div key={theme.id} className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-slate-300 font-medium">{theme.title}</span>
                          <span className="text-slate-400 text-xs">{completedItems}/{totalItems}</span>
                        </div>
                        <div className="w-full bg-slate-700 rounded-full h-2">
                          <div 
                            className="bg-gradient-to-r from-blue-500 to-cyan-500 h-2 rounded-full transition-all duration-300" 
                            style={{ width: `${percentage}%` }}
                          ></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Commandes rapides */}
            <Card className="border-slate-700 bg-slate-800/50 backdrop-blur-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-slate-100 flex items-center gap-2 text-lg">
                  <Clipboard className="w-5 h-5" /> Commandes rapides
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {(mode==='linux'?linuxQuick:windowsQuick).map((c) => (
                  <div key={c.label} className="group">
                    <div className="text-xs text-slate-400 mb-1">{c.label}</div>
                    <div className="flex items-center gap-2">
                      <pre className="flex-1 bg-slate-900 border border-slate-600 text-slate-300 text-xs p-2 rounded overflow-x-auto">
                        <code>{c.cmd}</code>
                      </pre>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={()=>copyText(c.cmd)} 
                        className="bg-slate-700 border-slate-600 text-slate-200 hover:bg-slate-600 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        Copier
                      </Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Ressources */}
            <Card className="border-slate-700 bg-slate-800/50 backdrop-blur-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-slate-100 flex items-center gap-2 text-lg">
                  📚 Ressources
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <a href="https://gtfobins.github.io/" target="_blank" rel="noreferrer" className="flex items-center gap-2 p-2 bg-slate-700 rounded hover:bg-slate-600 text-blue-400 hover:text-blue-300 transition-colors">
                  <ExternalLink className="w-4 h-4" /> GTFOBins
                </a>
                <a href="https://lolbas-project.github.io/" target="_blank" rel="noreferrer" className="flex items-center gap-2 p-2 bg-slate-700 rounded hover:bg-slate-600 text-blue-400 hover:text-blue-300 transition-colors">
                  <ExternalLink className="w-4 h-4" /> LOLBAS
                </a>
                <a href="https://book.hacktricks.xyz/" target="_blank" rel="noreferrer" className="flex items-center gap-2 p-2 bg-slate-700 rounded hover:bg-slate-600 text-blue-400 hover:text-blue-300 transition-colors">
                  <ExternalLink className="w-4 h-4" /> HackTricks
                </a>
                <a href="https://github.com/carlospolop/PEASS-ng" target="_blank" rel="noreferrer" className="flex items-center gap-2 p-2 bg-slate-700 rounded hover:bg-slate-600 text-blue-400 hover:text-blue-300 transition-colors">
                  <ExternalLink className="w-4 h-4" /> PEASS-ng
                </a>
              </CardContent>
            </Card>
          </div>

          {/* Contenu principal - Techniques */}
          <div className="xl:col-span-3">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {filteredThemes.map(theme => {
                const themeState = stateForMode[theme.id] || {};
                return (
                  <Card key={theme.id} className="border-slate-700 bg-slate-800/50 backdrop-blur-sm hover:bg-slate-800/70 transition-all duration-200">
                    <CardHeader className="pb-4">
                      <CardTitle className="text-slate-100 flex items-center gap-2 text-xl">
                        <Wrench className="w-6 h-6 text-blue-400" /> {theme.title}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {theme.items.map(item => {
                        const checked = !!themeState[item.id];
                        const d = DETAILS[item.id] || {};
                        
                        return (
                          <div key={item.id} className="group relative">
                            <div className="flex items-start gap-4 p-4 rounded-lg border border-slate-600 bg-slate-700/30 hover:bg-slate-700/50 transition-all duration-200">
                              <input
                                type="checkbox"
                                className="mt-1 w-4 h-4 text-blue-600 bg-slate-700 border-slate-500 rounded focus:ring-blue-500 focus:ring-2"
                                checked={checked}
                                onChange={()=>toggleItem(mode, theme.id, item.id)}
                                title="Marquer comme vérifié"
                              />
                              
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-2">
                                  <h4 className="text-slate-200 font-medium text-sm leading-tight">
                                    {item.label}
                                  </h4>
                                  {checked && (
                                    <span className="text-green-400 text-xs bg-green-400/10 px-2 py-1 rounded-full">
                                      ✓ Vérifié
                                    </span>
                                  )}
                                </div>
                                
                                {d.description && (
                                  <p className="text-xs text-slate-400 leading-relaxed line-clamp-2">
                                    {d.description}
                                  </p>
                                )}
                              </div>
                              
                              <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Button 
                                  size="sm" 
                                  variant="outline" 
                                  onClick={() => setSelectedTechnique(item.id)}
                                  className="bg-slate-600 border-slate-500 text-slate-200 hover:bg-slate-500 hover:border-slate-400"
                                >
                                  📖 Détails
                                </Button>
                                
                                {d.commands?.[0] && (
                                  <Button 
                                    size="sm" 
                                    variant="outline" 
                                    onClick={()=>copyText(d.commands![0]!)} 
                                    className="bg-slate-600 border-slate-500 text-slate-200 hover:bg-slate-500 hover:border-slate-400"
                                  >
                                    💻 Copier
                                  </Button>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <TechniqueModal 
        open={!!selectedTechnique} 
        onClose={() => setSelectedTechnique(null)} 
        techniqueId={selectedTechnique || ''} 
        mode={mode}
      />

      <InfoModal open={about} onClose={() => setAbout(false)} title="PrivEsc Helper – principes techniques">
        <ul className="list-disc ml-5 space-y-1">
          <li><strong>State</strong>: checklist persistée en localStorage via store (Zustand).</li>
          <li><strong>UI</strong>: React + Tailwind; cartes thématiques, actions copier, import/export JSON.</li>
          <li><strong>Sans backend</strong>: tout est client.</li>
        </ul>
      </InfoModal>
    </div>
  );
};

export default PrivescPage;
