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
    expected: ["groups=… docker …"],
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

const HELP_TOPICS: Record<string, { title: string; content: React.ReactNode }> = {
  dll_hijacking: {
    title: 'DLL Hijacking (Windows)',
    content: (
      <div className="space-y-3 text-sm leading-relaxed">
        <p>Objectif: Charger une DLL arbitraire à la place d’une DLL manquante dans le PATH de la cible.</p>
        <ol className="list-decimal ml-5 space-y-1">
          <li>Identifier un binaire vulnérable (Procmon/Autoruns/services).</li>
          <li>Filtrer <code>NAME NOT FOUND</code> pour repérer les DLL manquantes.</li>
          <li>Choisir un répertoire écrivable par l’utilisateur dans l’ordre de recherche.</li>
          <li>Compiler/placer une DLL malveillante (exports requis) au nom attendu.</li>
          <li>Déclencher l’exécution (service/appli) pour valider l’exécution de code.</li>
        </ol>
      </div>
    ),
  },
  unquoted_service_path: {
    title: 'Unquoted Service Path (Windows)',
    content: (
      <div className="space-y-3 text-sm leading-relaxed">
        <p>Chemin de service non quoté avec espaces: Windows tente des chemins partiels.</p>
        <ol className="list-decimal ml-5 space-y-1">
          <li>Enum: <code>wmic service get name,displayname,pathname,startmode | findstr /i "Auto" | findstr /i /v "C:\\Windows\\"</code></li>
          <li>Tester les permissions d’écriture des dossiers candidats (<code>icacls</code>).</li>
          <li>Déposer un binaire/DLL à un emplacement antérieur dans le chemin résolu.</li>
          <li>Redémarrer le service pour valider.</li>
        </ol>
      </div>
    ),
  },
  cron_linux: {
    title: 'Cronjob (Linux)',
    content: (
      <div className="space-y-3 text-sm leading-relaxed">
        <p>Recherche d’entrées cron faibles pour escalade.</p>
        <ol className="list-decimal ml-5 space-y-1">
          <li>Enum: <code>crontab -l</code>, <code>ls -la /etc/cron*</code>, <code>systemctl list-timers</code></li>
          <li>Vérifier permissions des scripts appelés (écriture pour l’utilisateur ?).</li>
          <li>Hijack: injecter une commande si modifiable.</li>
        </ol>
      </div>
    ),
  },
  schtasks_windows: {
    title: 'Scheduled Tasks (schtasks) (Windows)',
    content: (
      <div className="space-y-3 text-sm leading-relaxed">
        <p>Tâches planifiées faibles ou détournables.</p>
        <ol className="list-decimal ml-5 space-y-1">
          <li>Enum: <code>schtasks /query /fo LIST /v</code> ou <code>Get-ScheduledTask</code></li>
          <li>Inspecter l’action et le binaire: permissions d’écriture ?</li>
        </ol>
      </div>
    ),
  },
  always_install_elevated: {
    title: 'AlwaysInstallElevated (Windows)',
    content: (
      <div className="space-y-3 text-sm leading-relaxed">
        <p>Si activé, permet d’installer un MSI en tant que SYSTEM.</p>
        <ol className="list-decimal ml-5 space-y-1">
          <li>Vérifier: <code>reg query HKCU\Software\Policies\Microsoft\Windows\Installer /v AlwaysInstallElevated</code> et HKLM</li>
          <li>Si 1/1: générer un MSI malveillant (msfvenom) et lancer <code>msiexec /quiet /qn /i evil.msi</code></li>
        </ol>
      </div>
    ),
  },
  capabilities_linux: {
    title: 'Linux capabilities (setuid)',
    content: (
      <div className="space-y-3 text-sm leading-relaxed">
        <p>Capacités abusables: cap_setuid, cap_dac_* etc.</p>
        <ul className="list-disc ml-5 space-y-1">
          <li><code>{`getcap -r / 2>/dev/null`.replace('>','&gt;')}</code> et tester GTFOBins (python, perl, tar, etc.).</li>
        </ul>
      </div>
    ),
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
        { id: 'files', label: 'Fichiers SUID/SGID intéressants', helpKey: 'capabilities_linux' },
      ],
    },
    {
      id: 'weak_perms',
      title: 'Permissions faibles',
      items: [
        { id: 'sudoers', label: 'sudo -l (NOPASSWD, GTFOBins)' },
        { id: 'capabilities', label: 'Linux capabilities (getcap -r /)', helpKey: 'capabilities_linux' },
        { id: 'cron', label: 'Cron modifiable', helpKey: 'cron_linux' },
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
        { id: 'dll_hijack', label: 'DLL Hijacking', helpKey: 'dll_hijacking' },
        { id: 'unquoted', label: 'Unquoted Service Path', helpKey: 'unquoted_service_path' },
        { id: 'schtasks', label: 'Scheduled Tasks (schtasks)', helpKey: 'schtasks_windows' },
        { id: 'alwaysinstall', label: 'AlwaysInstallElevated', helpKey: 'always_install_elevated' },
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

const HelpModal: React.FC<{ open: boolean; onClose: () => void; title: string; children: React.ReactNode }> = ({ open, onClose, title, children }) => {
  if (!open) return null;
  return createPortal(
    <div className="fixed inset-0 z-[1000]">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="w-full max-w-2xl bg-slate-900 border border-slate-700 rounded-xl shadow-xl">
          <div className="flex items-center justify-between p-4 border-b border-slate-700">
            <div className="font-semibold text-slate-100">{title}</div>
            <button className="text-slate-400 hover:text-slate-200" onClick={onClose}>✕</button>
          </div>
          <div className="p-4 text-slate-200">{children}</div>
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
  const [helpKey, setHelpKey] = useState<string | null>(null);
  const [about, setAbout] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const themes = THEMES[mode];

  const filteredThemes = useMemo(() => {
    if (!query.trim()) return themes;
    const q = query.toLowerCase();
    return themes
      .map(t => ({
        ...t,
        items: t.items.filter(i => i.label.toLowerCase().includes(q) || (i.helpKey && HELP_TOPICS[i.helpKey]))
      }))
      .filter(t => t.items.length > 0);
  }, [themes, query]);

  const stateForMode = checklists[mode] || {};
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const toggleExpanded = (key: string) => setExpanded(prev => ({ ...prev, [key]: !prev[key] }));

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
          // Réinjecter en localStorage pour le middleware persist
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
    <div className="min-h-screen bg-dark-950 text-dark-100 overflow-x-hidden overflow-y-auto">
      {/* Header cohérent */}
      <div className="main-header p-6">
        <div className="flex-between mb-6">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="AuditMapper" className="w-8 h-8 rounded-lg opacity-80" />
            <div>
              <h1 className="text-2xl font-bold text-slate-100">Privesc Helper</h1>
              <p className="text-slate-400">Checklists ciblées et aides rapides pour l’escalade de privilèges</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={() => setMode('linux')} className={mode==='linux'?'bg-blue-600 hover:bg-blue-700':'bg-slate-700 border-slate-600'}>Linux</Button>
            <Button onClick={() => setMode('windows')} className={mode==='windows'?'bg-blue-600 hover:bg-blue-700':'bg-slate-700 border-slate-600'}>Windows</Button>
            <Button onClick={exportJson} variant="outline" className="bg-slate-700 border-slate-600 text-slate-200 hover:bg-slate-600"><Download className="w-4 h-4 mr-1" /> Export</Button>
            <input ref={fileRef} type="file" accept="application/json" className="hidden" onChange={(e)=>{ const f=e.target.files?.[0]; if (f) importJson(f); }} />
            <Button onClick={()=>fileRef.current?.click()} variant="outline" className="bg-slate-700 border-slate-600 text-slate-200 hover:bg-slate-600"><Upload className="w-4 h-4 mr-1" /> Import</Button>
            <Button onClick={() => resetMode(mode)} variant="outline" className="bg-slate-700 border-slate-600 text-slate-200 hover:bg-slate-600"><RefreshCw className="w-4 h-4 mr-1" /> Reset</Button>
            <Button variant="outline" className="bg-slate-800 border-slate-600 text-slate-200 hover:bg-slate-700" onClick={() => setAbout(true)}>ℹ️ Comment ça marche</Button>
          </div>
        </div>
      </div>

      <div className="main-content">
        {/* Sidebar enrichie */}
        <div className="sidebar-left p-4 space-y-4">
          <Card className="border-slate-700 bg-slate-800">
            <CardHeader>
              <CardTitle className="text-slate-100 flex items-center gap-2"><Search className="w-5 h-5" /> Recherche</CardTitle>
            </CardHeader>
            <CardContent>
              <Input value={query} onChange={(e)=>setQuery(e.target.value)} placeholder="Filtrer des items (ex: sudo, cron, dll)" className="bg-slate-700 border-slate-600" />
            </CardContent>
          </Card>

          <Card className="border-slate-700 bg-slate-800">
            <CardHeader>
              <CardTitle className="text-slate-100 flex items-center gap-2"><Bug className="w-5 h-5" /> Aides rapides</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-slate-300 space-y-2">
              <div className="flex flex-wrap gap-2">
                {Object.entries(HELP_TOPICS).map(([key, t]) => (
                  <Button key={key} onClick={()=>setHelpKey(key)} variant="outline" className="bg-slate-700 border-slate-600 text-slate-200 hover:bg-slate-600 text-xs">{t.title}</Button>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-700 bg-slate-800">
            <CardHeader>
              <CardTitle className="text-slate-100 flex items-center gap-2"><Clipboard className="w-5 h-5" /> Commandes utiles</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {(mode==='linux'?linuxQuick:windowsQuick).map((c) => (
                <div key={c.label} className="flex items-center justify-between gap-2">
                  <div className="text-xs text-slate-300 truncate" title={c.cmd}>{c.label}</div>
                  <Button size="sm" variant="outline" onClick={()=>copyText(c.cmd)} className="bg-slate-700 border-slate-600 text-slate-200 hover:bg-slate-600">Copier</Button>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="border-slate-700 bg-slate-800">
            <CardHeader>
              <CardTitle className="text-slate-100 flex items-center gap-2"><Info className="w-5 h-5" /> Références</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <a href="https://gtfobins.github.io/" target="_blank" rel="noreferrer" className="text-blue-400 hover:underline flex items-center gap-1"><ExternalLink className="w-3 h-3" /> GTFOBins (Linux)</a>
              <a href="https://lolbas-project.github.io/" target="_blank" rel="noreferrer" className="text-blue-400 hover:underline flex items-center gap-1"><ExternalLink className="w-3 h-3" /> LOLBAS (Windows)</a>
              <a href="https://book.hacktricks.xyz/" target="_blank" rel="noreferrer" className="text-blue-400 hover:underline flex items-center gap-1"><ExternalLink className="w-3 h-3" /> HackTricks</a>
              <a href="https://github.com/carlospolop/PEASS-ng" target="_blank" rel="noreferrer" className="text-blue-400 hover:underline flex items-center gap-1"><ExternalLink className="w-3 h-3" /> LinPEAS / WinPEAS</a>
            </CardContent>
          </Card>
        </div>

        {/* Contenu principal */}
        <div className="content-main p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredThemes.map(theme => {
              const themeState = stateForMode[theme.id] || {};
              return (
                <Card key={theme.id} className="border-slate-700 bg-slate-800 card-hover">
                  <CardHeader>
                    <CardTitle className="text-slate-100 flex items-center gap-2"><Wrench className="w-5 h-5" /> {theme.title}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {theme.items.map(item => {
                      const checked = !!themeState[item.id];
                      const key = `${theme.id}:${item.id}`;
                      const d = DETAILS[item.id] || {};
                      return (
                        <div key={item.id} className="rounded border border-slate-600 bg-slate-800/60">
                          <div className="flex items-start gap-3 p-3">
                            <input
                              type="checkbox"
                              className="mt-1"
                              checked={checked}
                              onChange={()=>toggleItem(mode, theme.id, item.id)}
                              title="Marquer comme vérifié"
                            />
                            <div className="flex-1 min-w-0">
                              <div className="text-slate-200 text-sm font-medium truncate">
                                {item.label}
                                {item.helpKey && (
                                  <button type="button" onClick={()=>setHelpKey(item.helpKey!)} className="ml-2 text-xs px-1.5 py-0.5 rounded bg-slate-700 border border-slate-600 hover:bg-slate-600">Aide</button>
                                )}
                              </div>
                              {d.description && (
                                <div className="text-xs text-slate-400 mt-0.5 line-clamp-2">{d.description}</div>
                              )}
                            </div>
                            <div className="shrink-0 flex items-center gap-2">
                              {d.commands?.[0] && (
                                <Button size="sm" variant="outline" onClick={()=>copyText(d.commands![0]!)} className="bg-slate-700 border-slate-600 text-slate-200 hover:bg-slate-600">Copier cmd</Button>
                              )}
                              <Button size="sm" variant="outline" onClick={()=>toggleExpanded(key)} className="bg-slate-700 border-slate-600 text-slate-200 hover:bg-slate-600">
                                {expanded[key] ? 'Masquer' : 'Détails'}
                              </Button>
                            </div>
                          </div>

                          {expanded[key] && (
                            <div className="px-4 pb-4 space-y-3">
                              {d.commands && d.commands.length > 0 && (
                                <div>
                                  <div className="text-xs text-slate-400 mb-1">Commandes</div>
                                  <div className="space-y-1">
                                    {d.commands.map((cmd, idx) => (
                                      <div key={idx} className="flex items-center gap-2">
                                        <pre className="flex-1 bg-slate-900 border border-slate-700 text-slate-200 text-xs p-2 rounded overflow-x-auto"><code>{cmd}</code></pre>
                                        <Button size="sm" variant="outline" onClick={()=>copyText(cmd)} className="bg-slate-700 border-slate-600 text-slate-200 hover:bg-slate-600">Copier</Button>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {d.lookFors && d.lookFors.length > 0 && (
                                <div>
                                  <div className="text-xs text-slate-400 mb-1">À chercher</div>
                                  <ul className="list-disc ml-5 text-sm text-slate-300 space-y-0.5">
                                    {d.lookFors.map((l, i) => (<li key={i}>{l}</li>))}
                                  </ul>
                                </div>
                              )}

                              {d.expected && d.expected.length > 0 && (
                                <div>
                                  <div className="text-xs text-slate-400 mb-1">Sorties attendues</div>
                                  <ul className="list-disc ml-5 text-sm text-slate-300 space-y-0.5">
                                    {d.expected.map((l, i) => (<li key={i}>{l}</li>))}
                                  </ul>
                                </div>
                              )}
                            </div>
                          )}
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

      <HelpModal open={!!helpKey} onClose={()=>setHelpKey(null)} title={helpKey ? HELP_TOPICS[helpKey].title : ''}>
        {helpKey ? HELP_TOPICS[helpKey].content : null}
      </HelpModal>

      <InfoModal open={about} onClose={() => setAbout(false)} title="Privesc Helper – principes techniques">
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
