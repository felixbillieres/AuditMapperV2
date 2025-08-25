import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import 'highlight.js/styles/github-dark.css';

interface ParsedService {
  port: number;
  proto: string;
  service: string;
  version?: string;
  state?: string;
}

function parseNmapSimple(nmapText: string): ParsedService[] {
  const lines = nmapText.split(/\r?\n/);
  const services: ParsedService[] = [];
  
  // Regex ULTRA stricte pour capturer UNIQUEMENT les vraies lignes de service nmap
  // Format exact attendu: PORT/PROTO STATE SERVICE [VERSION]
  // Doit commencer par un port, suivi de /tcp ou /udp, puis un état valide, puis un service valide
  // Le service peut se terminer par ? (pour les services inconnus)
  const serviceRegex = /^(\d{1,5})\/(tcp|udp)\s+(open|closed|filtered|open\|filtered)\s+([a-zA-Z][a-zA-Z0-9\-_\/]*\??)\s*(.*)$/i;
  
  for (const line of lines) {
    const trimmedLine = line.trim();
    
    // Ignorer les lignes vides
    if (!trimmedLine) continue;
    
    // PREMIERE VERIFICATION: La ligne doit ressembler à un service Nmap
    // Doit commencer par un nombre suivi de /tcp ou /udp
    if (!/^\d{1,5}\/(tcp|udp)\s+/i.test(trimmedLine)) {
      continue;
    }
    
    // DEUXIEME VERIFICATION: Ignorer TOUTES les lignes de métadonnées Nmap
    if (trimmedLine.startsWith('|') || 
        trimmedLine.startsWith('|_') || 
        trimmedLine.startsWith('Warning:') ||
        trimmedLine.startsWith('Device type:') ||
        trimmedLine.startsWith('Running:') ||
        trimmedLine.startsWith('OS CPE:') ||
        trimmedLine.startsWith('OS details:') ||
        trimmedLine.startsWith('TCP/IP fingerprint:') ||
        trimmedLine.startsWith('Uptime guess:') ||
        trimmedLine.startsWith('Network Distance:') ||
        trimmedLine.startsWith('TCP Sequence Prediction:') ||
        trimmedLine.startsWith('IP ID Sequence Generation:') ||
        trimmedLine.startsWith('Service Info:') ||
        trimmedLine.startsWith('TRACEROUTE') ||
        trimmedLine.startsWith('HOP') ||
        trimmedLine.startsWith('NSE:') ||
        trimmedLine.startsWith('Initiating NSE') ||
        trimmedLine.startsWith('Completed NSE') ||
        trimmedLine.startsWith('Read data files') ||
        trimmedLine.startsWith('OS and Service detection') ||
        trimmedLine.startsWith('Nmap done:') ||
        trimmedLine.startsWith('Raw packets') ||
        trimmedLine.includes('PORT') ||
        trimmedLine.includes('STATE') ||
        trimmedLine.includes('SERVICE') ||
        trimmedLine.includes('REASON') ||
        trimmedLine.includes('VERSION') ||
        // Ignorer les lignes qui contiennent des certificats SSL
        trimmedLine.startsWith('ssl-cert:') ||
        trimmedLine.startsWith('ssl-date:') ||
        trimmedLine.startsWith('Subject:') ||
        trimmedLine.startsWith('Subject Alternative Name:') ||
        trimmedLine.startsWith('Not valid before:') ||
        trimmedLine.startsWith('Not valid after:') ||
        trimmedLine.startsWith('commonName=') ||
        trimmedLine.startsWith('DNS:') ||
        // Ignorer les lignes qui contiennent des métadonnées SMB
        trimmedLine.startsWith('smb2-security-mode:') ||
        trimmedLine.startsWith('Message signing') ||
        trimmedLine.startsWith('clock-skew:') ||
        trimmedLine.startsWith('smb2-time:') ||
        trimmedLine.startsWith('start_date:') ||
        trimmedLine.startsWith('date:') ||
        // Ignorer les lignes qui contiennent des caractères spéciaux
        trimmedLine.startsWith('othername:') ||
        trimmedLine.startsWith('unsupported') ||
        trimmedLine.startsWith('Site:') ||
        trimmedLine.startsWith('Domain:') ||
        trimmedLine.startsWith('Host:') ||
        trimmedLine.startsWith('OS:') ||
        trimmedLine.startsWith('CPE:') ||
        // Ignorer les lignes host script results et autres métadonnées
        trimmedLine.startsWith('Host script results:') ||
        trimmedLine.startsWith('Service detection performed') ||
        trimmedLine.startsWith('Please report any incorrect results') ||
        // Ignorer les lignes contenant des dates spécifiques qui peuvent être parsées comme des ports
        /^\d{4}-\d{2}-\d{2}/.test(trimmedLine) ||
        /^\d{1,2}\/\d{1,2}\/\d{4}/.test(trimmedLine) ||
        // Ignorer les lignes qui contiennent uniquement des métadonnées (pas de vrai format nmap)
        trimmedLine.includes('scanner time') ||
        trimmedLine.includes('deviation') ||
        trimmedLine.includes('median') ||
        trimmedLine.includes('mean:') ||
        trimmedLine.includes('scanned in') ||
        trimmedLine.includes('seconds')) {
      continue;
    }
    
    // TROISIEME VERIFICATION: Vérifier que ça ne contient pas de dates formatées
    // Éviter les faux positifs comme "2025/tcp", "2021/tcp", etc. qui viennent des dates
    if (/^(19|20)\d{2}\/(tcp|udp)/i.test(trimmedLine)) {
      continue;
    }
    
    // QUATRIEME VERIFICATION: Essayer de matcher la ligne avec le regex de service
    const match = trimmedLine.match(serviceRegex);
    if (match) {
      const [, port, proto, state, service, version] = match;
      
      // CINQUIEME VERIFICATION: Le service doit être dans la liste des services valides
      const validServices = [
        'ssh', 'http', 'https', 'ftp', 'ftps', 'smtp', 'smtps', 'pop3', 'pop3s', 'imap', 'imaps', 
        'dns', 'dhcp', 'tftp', 'telnet', 'rsh', 'rlogin', 'rexec', 'finger', 'nfs', 'rpc', 
        'netbios', 'netbios-ns', 'netbios-dgm', 'netbios-ssn', 'smb', 'cifs', 'ldap', 'ldaps', 
        'kerberos', 'kerberos-sec', 'mysql', 'postgresql', 'oracle', 'mssql', 'redis', 'mongodb',
        'elasticsearch', 'rabbitmq', 'apache', 'nginx', 'iis', 'tomcat', 'jboss', 'weblogic',
        'websphere', 'glassfish', 'jetty', 'node', 'snmp', 'ntp', 'sip', 'rtsp', 'ipp',
        // Services Windows spécifiques
        'domain', 'msrpc', 'microsoft-ds', 'kpasswd5', 'ncacn_http', 'ssl/ldap', 'mc-nmf',
        // Services communs supplémentaires
        'vnc', 'rdp', 'x11', 'ssh-rsa', 'ssl/http', 'ssl/https', 'ssl/smtp', 'ssl/pop3', 
        'ssl/imap', 'ssl/ftp', 'unknown', 'tcpwrapped'
      ];
      
      // Nettoyer le nom du service (enlever le ? à la fin si présent)
      const cleanServiceName = service.replace(/\?$/, '').toLowerCase();
      
      // SIXIEME VERIFICATION: S'assurer que le service est valide et le port raisonnable
      if (validServices.includes(cleanServiceName)) {
        const portNum = Number(port);
        if (portNum >= 1 && portNum <= 65535) {
          services.push({
            port: portNum,
            proto: proto as 'tcp' | 'udp',
            state: state,
            service: service,
            version: version?.trim() || undefined
          });
        }
      }
    }
  }
  
  // Trier par port et supprimer les doublons
  const uniqueServices = services.filter((service, index, self) => 
    index === self.findIndex(s => s.port === service.port && s.proto === service.proto)
  );
  
  return uniqueServices.sort((a, b) => a.port - b.port);
}

function generateMarkdown(opts: { name: string; date: string; difficulty: string; os: string; goal: string; tags: string; services: ParsedService[]; }): string {
  const { name, date, difficulty, os, goal, tags, services } = opts;
  const toc = ['- [Résumé Exécutif](#résumé-exécutif)','- [Sommaire Technique](#sommaire-technique)','- [Introduction](#introduction)','- [Énumération](#énumération)',...services.map((s) => `  - [${s.port}/${s.proto} - ${s.service}](#${s.port}-${s.proto}-${s.service})`),'- [Exploitation](#exploitation)','- [Post-Exploitation](#post-exploitation)','- [Conclusion](#conclusion)'].join('\n');
  const servicesMd = services.map((s) => `### ${s.port}/${s.proto} - ${s.service}

- État: ${s.state || 'inconnu'}
- Version: ${s.version || 'N/A'}

Notes énumération:


Pistes exploitation:
 
`).join('\n');
  return `# ${name}

- Date: ${date || new Date().toISOString().slice(0, 10)}
- Difficulté: ${difficulty || 'N/A'}
- OS: ${os || 'N/A'}
- Objectif: ${goal || 'N/A'}
- Tags: ${tags || 'N/A'}

## Résumé Exécutif

Décrivez brièvement le contexte, l'objectif et les principaux résultats.

## Sommaire Technique

${toc}

## Introduction

Contexte, périmètre, méthodologie, outils utilisés.

## Énumération

${services.length ? servicesMd : '_Aucun service parsé automatiquement. Ajouter vos sections manuellement._'}

## Exploitation

Décrivez les vecteurs d'attaque identifiés, preuves de concept, captures, commandes.

## Post-Exploitation

Élévation de privilèges, persistance, pillage de secrets, mouvements latéraux.

## Conclusion

Points clés, recommandations, remédiations.
`;
}

const TemplateGeneratorPage: React.FC = () => {
  const [name, setName] = useState('Nom de la box / Cible');
  const [dateStr, setDateStr] = useState(() => new Date().toISOString().slice(0, 10));
  const [difficulty, setDifficulty] = useState('Moyenne');
  const [os, setOs] = useState('Linux');
  const [goal, setGoal] = useState('Obtenir un shell / DA / Root ...');
  const [tags, setTags] = useState('pentest, ctf, enum, exploit');
  const [nmap, setNmap] = useState('');

  const services = useMemo(() => parseNmapSimple(nmap), [nmap]);
  const markdown = useMemo(() => generateMarkdown({ name, date: dateStr, difficulty, os, goal, tags, services }), [name, dateStr, difficulty, os, goal, tags, services]);
  
  // Fonction de debug pour analyser le parsing
  const debugParsing = () => {
    if (!nmap) return [];
    const lines = nmap.split(/\r?\n/);
    const debugInfo = lines.map((line, index) => {
      const trimmed = line.trim();
      
      // Utiliser la même logique que le parser principal
      const looksLikeService = /^\d{1,5}\/(tcp|udp)\s+/i.test(trimmed);
      const isService = /^(\d{1,5})\/(tcp|udp)\s+(open|closed|filtered|open\|filtered)\s+([a-zA-Z][a-zA-Z0-9\-_\/]*\??)\s*(.*)$/i.test(trimmed);
      
      // Règles de filtrage identiques à celles du parser principal
      const isMetadata = trimmed.startsWith('|') || 
                        trimmed.startsWith('|_') || 
                        trimmed.startsWith('Warning:') ||
                        trimmed.startsWith('Device type:') ||
                        trimmed.startsWith('Running:') ||
                        trimmed.startsWith('OS CPE:') ||
                        trimmed.startsWith('OS details:') ||
                        trimmed.startsWith('TCP/IP fingerprint:') ||
                        trimmed.startsWith('Uptime guess:') ||
                        trimmed.startsWith('Network Distance:') ||
                        trimmed.startsWith('TCP Sequence Prediction:') ||
                        trimmed.startsWith('IP ID Sequence Generation:') ||
                        trimmed.startsWith('Service Info:') ||
                        trimmed.startsWith('TRACEROUTE') ||
                        trimmed.startsWith('HOP') ||
                        trimmed.startsWith('NSE:') ||
                        trimmed.startsWith('Initiating NSE') ||
                        trimmed.startsWith('Completed NSE') ||
                        trimmed.startsWith('Read data files') ||
                        trimmed.startsWith('OS and Service detection') ||
                        trimmed.startsWith('Nmap done:') ||
                        trimmed.startsWith('Raw packets') ||
                        trimmed.includes('PORT') ||
                        trimmed.includes('STATE') ||
                        trimmed.includes('SERVICE') ||
                        trimmed.includes('REASON') ||
                        trimmed.includes('VERSION') ||
                        // Ignorer les lignes qui contiennent des certificats SSL
                        trimmed.startsWith('ssl-cert:') ||
                        trimmed.startsWith('ssl-date:') ||
                        trimmed.startsWith('Subject:') ||
                        trimmed.startsWith('Subject Alternative Name:') ||
                        trimmed.startsWith('Not valid before:') ||
                        trimmed.startsWith('Not valid after:') ||
                        trimmed.startsWith('commonName=') ||
                        trimmed.startsWith('DNS:') ||
                        // Ignorer les lignes qui contiennent des métadonnées SMB
                        trimmed.startsWith('smb2-security-mode:') ||
                        trimmed.startsWith('Message signing') ||
                        trimmed.startsWith('clock-skew:') ||
                        trimmed.startsWith('smb2-time:') ||
                        trimmed.startsWith('start_date:') ||
                        trimmed.startsWith('date:') ||
                        // Ignorer les lignes qui contiennent des caractères spéciaux
                        trimmed.startsWith('othername:') ||
                        trimmed.startsWith('unsupported') ||
                        trimmed.startsWith('Site:') ||
                        trimmed.startsWith('Domain:') ||
                        trimmed.startsWith('Host:') ||
                        trimmed.startsWith('OS:') ||
                        trimmed.startsWith('CPE:') ||
                        // Ignorer les lignes host script results et autres métadonnées
                        trimmed.startsWith('Host script results:') ||
                        trimmed.startsWith('Service detection performed') ||
                        trimmed.startsWith('Please report any incorrect results') ||
                        // Ignorer les lignes contenant des dates spécifiques qui peuvent être parsées comme des ports
                        /^\d{4}-\d{2}-\d{2}/.test(trimmed) ||
                        /^\d{1,2}\/\d{1,2}\/\d{4}/.test(trimmed) ||
                        // Ignorer les lignes qui contiennent uniquement des métadonnées (pas de vrai format nmap)
                        trimmed.includes('scanner time') ||
                        trimmed.includes('deviation') ||
                        trimmed.includes('median') ||
                        trimmed.includes('mean:') ||
                        trimmed.includes('scanned in') ||
                        trimmed.includes('seconds');
      
      // Vérifier si c'est une date formatée qui ressemble à un port
      const isDateLikePort = /^(19|20)\d{2}\/(tcp|udp)/i.test(trimmed);
      
      // Déterminer la catégorie avec plus de précision
      let category = 'other';
      if (isDateLikePort) {
        category = 'date-false-positive';
      } else if (!looksLikeService) {
        if (isMetadata) {
          category = 'metadata';
        } else if (!trimmed) {
          category = 'empty';
        } else {
          category = 'other';
        }
      } else if (looksLikeService && !isMetadata) {
        // Vérifier si c'est un vrai service valide
        const match = trimmed.match(/^(\d{1,5})\/(tcp|udp)\s+(open|closed|filtered|open\|filtered)\s+([a-zA-Z][a-zA-Z0-9\-_\/]*\??)\s*(.*)$/i);
        if (match) {
          const [, , , , service] = match;
          const validServices = [
            'ssh', 'http', 'https', 'ftp', 'ftps', 'smtp', 'smtps', 'pop3', 'pop3s', 'imap', 'imaps', 
            'dns', 'dhcp', 'tftp', 'telnet', 'rsh', 'rlogin', 'rexec', 'finger', 'nfs', 'rpc', 
            'netbios', 'netbios-ns', 'netbios-dgm', 'netbios-ssn', 'smb', 'cifs', 'ldap', 'ldaps', 
            'kerberos', 'kerberos-sec', 'mysql', 'postgresql', 'oracle', 'mssql', 'redis', 'mongodb',
            'elasticsearch', 'rabbitmq', 'apache', 'nginx', 'iis', 'tomcat', 'jboss', 'weblogic',
            'websphere', 'glassfish', 'jetty', 'node', 'snmp', 'ntp', 'sip', 'rtsp', 'ipp',
            // Services Windows spécifiques
            'domain', 'msrpc', 'microsoft-ds', 'kpasswd5', 'ncacn_http', 'ssl/ldap', 'mc-nmf',
            // Services communs supplémentaires
            'vnc', 'rdp', 'x11', 'ssh-rsa', 'ssl/http', 'ssl/https', 'ssl/smtp', 'ssl/pop3', 
            'ssl/imap', 'ssl/ftp', 'unknown', 'tcpwrapped'
          ];
          
          // Nettoyer le nom du service (enlever le ? à la fin si présent)
          const cleanServiceName = service.replace(/\?$/, '').toLowerCase();
          
          if (validServices.includes(cleanServiceName)) {
            category = 'service';
          } else {
            category = 'invalid-service';
          }
        } else {
          category = 'malformed-service';
        }
      } else if (isMetadata) {
        category = 'metadata';
      }
      
      return {
        lineNumber: index + 1,
        content: trimmed,
        isService,
        isMetadata,
        isIgnored: isMetadata || !trimmed || (trimmed.includes('PORT') && trimmed.includes('STATE')) || isDateLikePort,
        category: category
      };
    }).filter(info => info.content); // Filtrer les lignes vides
    
    return debugInfo;
  };
  
  const debugInfo = debugParsing();

  const [editorMode, setEditorMode] = useState<'edit' | 'preview'>('preview');
  const [markdownDraft, setMarkdownDraft] = useState('');
  const [showDebug, setShowDebug] = useState(false);
  const effectiveMarkdown = markdownDraft || markdown;

  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(effectiveMarkdown);
    alert('Markdown copié');
  };

  return (
    <div className="app-layout">
      {/* Header */}
      <div className="main-header p-6">
        <div className="flex-between mb-6">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-3">
              <img src="/logo.png" alt="AuditMapper" className="w-8 h-8 rounded-lg opacity-80" />
              <div>
                <h1 className="text-2xl font-bold text-slate-100">Template Generator</h1>
                <p className="text-slate-400">Générez un template Markdown propre (Obsidian/MD) à partir de paramètres et d'un scan Nmap</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button className="bg-blue-600 hover:bg-blue-700" onClick={copyToClipboard}>📄 Copier Markdown</Button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="main-content">
        <div className="content-area">
          <div className="content-main p-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Paramètres */}
            <Card className="border-slate-700 bg-slate-800">
              <CardHeader>
                <CardTitle className="text-slate-100">🎛️ Paramètres</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-3 rounded border border-slate-700 bg-slate-700/20">
                    <label className="text-xs uppercase tracking-wide text-slate-400">Nom</label>
                    <Input value={name} onChange={(e) => setName(e.target.value)} className="mt-1 bg-slate-700 border-slate-600 text-slate-100" />
                    <div className="text-[11px] text-slate-400 mt-1">Nom de la box, du domaine ou de la cible principale.</div>
                  </div>
                  <div className="p-3 rounded border border-slate-700 bg-slate-700/20">
                    <label className="text-xs uppercase tracking-wide text-slate-400">Date</label>
                    <Input type="date" value={dateStr} onChange={(e) => setDateStr(e.target.value)} className="mt-1 bg-slate-700 border-slate-600 text-slate-100" />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-3 rounded border border-slate-700 bg-slate-700/20">
                    <label className="text-xs uppercase tracking-wide text-slate-400">Difficulté</label>
                    <Input value={difficulty} onChange={(e) => setDifficulty(e.target.value)} className="mt-1 bg-slate-700 border-slate-600 text-slate-100" />
                  </div>
                  <div className="p-3 rounded border border-slate-700 bg-slate-700/20">
                    <label className="text-xs uppercase tracking-wide text-slate-400">OS</label>
                    <Input value={os} onChange={(e) => setOs(e.target.value)} className="mt-1 bg-slate-700 border-slate-600 text-slate-100" />
                  </div>
                  <div className="p-3 rounded border border-slate-700 bg-slate-700/20">
                    <label className="text-xs uppercase tracking-wide text-slate-400">Tags</label>
                    <Input value={tags} onChange={(e) => setTags(e.target.value)} className="mt-1 bg-slate-700 border-slate-600 text-slate-100" />
                    <div className="text-[11px] text-slate-400 mt-1">Séparés par des virgules (ex: pentest, web, ldap).</div>
                  </div>
                </div>
                <div className="p-3 rounded border border-slate-700 bg-slate-700/20">
                  <label className="text-xs uppercase tracking-wide text-slate-400">Objectif</label>
                  <Input value={goal} onChange={(e) => setGoal(e.target.value)} className="mt-1 bg-slate-700 border-slate-600 text-slate-100" />
                </div>
              </CardContent>
            </Card>

            {/* Nmap */}
            <Card className="border-slate-700 bg-slate-800">
              <CardHeader>
                <CardTitle className="text-slate-100">🛰️ Coller un output Nmap (texte)</CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea rows={14} value={nmap} onChange={(e) => setNmap(e.target.value)} placeholder={"Ex: 22/tcp open ssh OpenSSH 8.9p1 Ubuntu\n80/tcp open http Apache httpd 2.4.41"} className="w-full bg-slate-700 border-slate-600 text-slate-100" />
                <div className="text-xs text-slate-400 mt-2">Astuce: collez la section "PORT STATE SERVICE VERSION" d'un scan Nmap normal.</div>
              </CardContent>
            </Card>

            {/* Preview / Edition */}
            <Card className="border-slate-700 bg-slate-800 lg:col-span-2">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-slate-100">🧾 Markdown</CardTitle>
                  <div className="flex items-center gap-2">
                    <Button variant={editorMode==='edit' ? 'default' : 'outline'} className={editorMode==='edit' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-slate-700 border-slate-600 text-slate-200 hover:bg-slate-600'} onClick={() => setEditorMode('edit')}>✍️ Édition</Button>
                    <Button variant={editorMode==='preview' ? 'default' : 'outline'} className={editorMode==='preview' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-slate-700 border-slate-600 text-slate-200 hover:bg-slate-600'} onClick={() => setEditorMode('preview')}>👁️ Aperçu</Button>
                    <Button className="bg-blue-600 hover:bg-blue-700" onClick={copyToClipboard}>Copier</Button>
                    <Button className="bg-slate-700 border border-slate-600 hover:bg-slate-600" onClick={() => {
                      const blob = new Blob([effectiveMarkdown], { type: 'text/markdown;charset=utf-8' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url; a.download = `${name.replace(/\s+/g, '_') || 'template'}.md`;
                      document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
                    }}>Télécharger .md</Button>
                    <Button 
                      variant="outline" 
                      className={`${showDebug ? 'bg-blue-700 border-blue-600 text-blue-200' : 'bg-slate-700 border-slate-600 text-slate-200'} hover:bg-slate-600`} 
                      onClick={() => setShowDebug(!showDebug)}
                    >
                      🔍 Debug Parsing
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {editorMode === 'edit' ? (
                  <Textarea rows={22} value={markdownDraft || markdown} onChange={(e) => setMarkdownDraft(e.target.value)} className="w-full bg-slate-900 border-slate-700 text-slate-100 font-mono" />
                ) : (
                  <div className="prose prose-invert max-w-none">
                    <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]}>
                      {effectiveMarkdown}
                    </ReactMarkdown>
                  </div>
                )}
              </CardContent>
            </Card>
            
            {/* Section Debug Parsing */}
            {showDebug && (
              <Card className="border-slate-700 bg-slate-800 lg:col-span-2">
                <CardHeader>
                  <CardTitle className="text-slate-100">🔍 Debug Parsing Nmap</CardTitle>
                  <div className="text-sm text-slate-400">
                    Analyse détaillée de la sortie nmap et des services détectés
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Services détectés */}
                    <div>
                      <h4 className="text-lg font-semibold text-slate-200 mb-3">✅ Services Détectés ({services.length})</h4>
                      {services.length > 0 ? (
                        <div className="space-y-2">
                          {services.map((service, index) => (
                            <div key={index} className="p-3 bg-green-900/20 border border-green-700 rounded">
                              <div className="flex items-center justify-between">
                                <span className="font-mono text-green-300">
                                  {service.port}/{service.proto} - {service.service}
                                </span>
                                <span className="text-xs px-2 py-1 bg-green-700 text-green-100 rounded">
                                  {service.state}
                                </span>
                              </div>
                              {service.version && (
                                <div className="text-sm text-green-200 mt-1">
                                  {service.version}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-slate-400 text-center py-8">
                          Aucun service détecté. Vérifiez le format de votre nmap.
                        </div>
                      )}
                    </div>
                    
                    {/* Analyse ligne par ligne */}
                    <div>
                      <h4 className="text-lg font-semibold text-slate-200 mb-3">📊 Analyse Ligne par Ligne</h4>
                      <div className="space-y-2 max-h-96 overflow-y-auto">
                        {debugInfo.map((info, index) => (
                          <div 
                            key={index} 
                            className={`p-2 rounded text-xs font-mono ${
                              info.category === 'service' 
                                ? 'bg-green-900/20 border border-green-700 text-green-300'
                                : info.category === 'metadata'
                                ? 'bg-blue-900/20 border border-blue-700 text-blue-300'
                                : info.category === 'invalid-service'
                                ? 'bg-red-900/20 border border-red-700 text-red-300'
                                : info.category === 'date-false-positive'
                                ? 'bg-orange-900/20 border border-orange-700 text-orange-300'
                                : info.category === 'malformed-service'
                                ? 'bg-purple-900/20 border border-purple-700 text-purple-300'
                                : info.isIgnored
                                ? 'bg-slate-700/50 border border-slate-600 text-slate-400'
                                : 'bg-yellow-900/20 border border-yellow-700 text-yellow-300'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-xs opacity-70">Ligne {info.lineNumber}</span>
                              <span className={`px-2 py-1 rounded text-xs ${
                                info.category === 'service' 
                                  ? 'bg-green-700 text-green-100'
                                  : info.category === 'metadata'
                                  ? 'bg-blue-700 text-blue-100'
                                  : info.category === 'invalid-service'
                                  ? 'bg-red-700 text-red-100'
                                  : info.category === 'date-false-positive'
                                  ? 'bg-orange-700 text-orange-100'
                                  : info.category === 'malformed-service'
                                  ? 'bg-purple-700 text-purple-100'
                                  : info.isIgnored
                                  ? 'bg-slate-600 text-slate-300'
                                  : 'bg-yellow-700 text-yellow-100'
                              }`}>
                                {info.category}
                              </span>
                            </div>
                            <div className="mt-1 break-all">
                              {info.content}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                  
                  {/* Statistiques */}
                  <div className="mt-6 p-4 bg-slate-700/30 rounded border border-slate-600">
                    <h5 className="text-sm font-semibold text-slate-200 mb-2">📈 Statistiques de Parsing</h5>
                    <div className="grid grid-cols-2 md:grid-cols-6 gap-4 text-center">
                      <div>
                        <div className="text-2xl font-bold text-green-400">{services.length}</div>
                        <div className="text-xs text-slate-400">Services valides</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-red-400">
                          {debugInfo.filter(info => info.category === 'invalid-service').length}
                        </div>
                        <div className="text-xs text-slate-400">Services invalides</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-orange-400">
                          {debugInfo.filter(info => info.category === 'date-false-positive').length}
                        </div>
                        <div className="text-xs text-slate-400">Faux positifs dates</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-blue-400">
                          {debugInfo.filter(info => info.category === 'metadata').length}
                        </div>
                        <div className="text-xs text-slate-400">Métadonnées</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-yellow-400">
                          {debugInfo.filter(info => info.category === 'other').length}
                        </div>
                        <div className="text-xs text-slate-400">Autres lignes</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-slate-400">
                          {debugInfo.filter(info => info.isIgnored).length}
                        </div>
                        <div className="text-xs text-slate-400">Ignorées</div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TemplateGeneratorPage;
