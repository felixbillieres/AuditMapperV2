import React, { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import InfoModal from '@/components/ui/InfoModal';
import { useHostStore } from '@/stores/hostStore';

type QuickType = 'users' | 'hashes' | 'passwords' | 'domains' | 'ips' | 'emails';
type AdvancedType = 'credentials' | 'kerberos' | 'secrets' | 'machineAccounts' | 'services' | 'ports';
type ExtractionType = QuickType | AdvancedType;

const OUTPUT_TYPES = [
  { value: 'auto', label: 'Détection automatique' },
  { value: 'secretsdump', label: 'Secretsdump' },
  { value: 'mimikatz', label: 'Mimikatz' },
  { value: 'sam', label: 'SAM Dump' },
  { value: 'lsass', label: 'LSASS Dump' },
  { value: 'rpcclient', label: 'RPC Client' },
  { value: 'ldap', label: 'LDAP' },
  { value: 'passwd', label: '/etc/passwd' },
  { value: 'shadow', label: '/etc/shadow' },
  { value: 'nmap', label: 'Nmap' },
  { value: 'generic', label: 'Générique' },
];

const typeNames: Record<ExtractionType, string> = {
  users: 'Utilisateurs',
  hashes: 'Hashes',
  passwords: 'Mots de passe',
  domains: 'Domaines',
  ips: 'IPs',
  emails: 'Emails',
  credentials: 'Credentials',
  kerberos: 'Kerberos',
  secrets: 'Secrets',
  machineAccounts: 'Comptes Machine',
  services: 'Services',
  ports: 'Ports',
};

const GrepMasterPage: React.FC = () => {
  const [raw, setRaw] = useState<string>('');
  const [outputType, setOutputType] = useState<string>('auto');
  const [detected, setDetected] = useState<string>('—');
  const [results, setResults] = useState<string[]>([]);
  const [currentType, setCurrentType] = useState<ExtractionType | ''>('');
  const [format, setFormat] = useState<'list'|'hashcat'|'john'|'csv'|'json'>('list');
  const [expanded, setExpanded] = useState<{ input: boolean; quick: boolean; results: boolean }>({ input: true, quick: true, results: true });
  const [about, setAbout] = useState(false);
  const { hosts, updateHost } = useHostStore();
  const [targetHostId, setTargetHostId] = useState<string>('');

  const lines = useMemo(() => raw.split('\n').filter(l => l.trim()).length, [raw]);
  const chars = useMemo(() => raw.length, [raw]);

  // Détection basique (placeholder, léger)
  useEffect(() => {
    if (outputType !== 'auto') { setDetected(outputType); return; }
    const tests: Array<{t: string; r: RegExp}> = [
      { t: 'secretsdump', r: /^[^:]+:\d+:[a-fA-F0-9]{32}:[a-fA-F0-9]{32}:::/m },
      { t: 'mimikatz', r: /\*\s*Username\s*:/i },
      { t: 'nmap', r: /Nmap scan report|PORT\s+STATE\s+SERVICE/i },
      { t: 'passwd', r: /^[^:]+:x:\d+:\d+:/m },
      { t: 'shadow', r: /^[^:]+:\$\d+\$/m },
    ];
    const found = tests.find(tt => tt.r.test(raw));
    setDetected(found?.t || 'generic');
  }, [raw, outputType]);

  // Compteurs rapides
  const quickCounts = useMemo(() => {
    const counts: Record<QuickType, number> = { users: 0, hashes: 0, passwords: 0, domains: 0, ips: 0, emails: 0 };
    if (!raw.trim()) return counts;
    // users (faible signal, mais utile)
    counts.users = (raw.match(/(?:user|username|login)[\s:=]+([a-zA-Z0-9_.-]+)/gi) || []).length;
    // hashes
    counts.hashes = (raw.match(/[a-fA-F0-9]{32,64}/g) || []).length;
    // passwords
    counts.passwords = (raw.match(/(?:password|pass|pwd)[\s:=]+([^\s\r\n]+)/gi) || []).length;
    // domains
    counts.domains = (raw.match(/(?:domain|realm)[\s:=]+([a-zA-Z0-9\-.]+)/gi) || []).length;
    // ips
    counts.ips = (raw.match(/\b(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\b/g) || []).length;
    // emails
    counts.emails = (raw.match(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g) || []).length;
    return counts;
  }, [raw]);

  function extract(type: ExtractionType) {
    if (!raw.trim()) { setResults([]); setCurrentType(''); return; }
    let out: string[] = [];
    switch (type) {
      case 'users': out = (raw.match(/(?:user|username|login)[\s:=]+([a-zA-Z0-9_.-]+)/gi) || []).map(m => m.split(/[\s:=]+/)[1]); break;
      case 'hashes': {
        const hexes = (raw.match(/[a-fA-F0-9]{32}|[a-fA-F0-9]{40}|[a-fA-F0-9]{64}|[a-fA-F0-9]{128}/g) || [])
          .filter(h => h.toLowerCase() !== '31d6cfe0d16ae931b73c59d7e0c089c0' && h.toLowerCase() !== 'aad3b435b51404eeaad3b435b51404ee');
        const unixCrypt = raw.match(/\$(?:1|2[aby]?|5|6)\$[^\s:]{1,}\$[^\s:]{1,}/g) || [];
        out = Array.from(new Set([...hexes, ...unixCrypt]));
        break;
      }
      case 'passwords': out = (raw.match(/(?:password|pass|pwd)[\s:=]+([^\s\r\n]+)/gi) || []).map(m => m.split(/[\s:=]+/)[1]); break;
      case 'domains': out = (raw.match(/(?:domain|realm)[\s:=]+([a-zA-Z0-9\-.]+)/gi) || []).map(m => m.split(/[\s:=]+/)[1]); break;
      case 'ips': out = Array.from(new Set(raw.match(/\b(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\b/g) || [])); break;
      case 'emails': out = Array.from(new Set((raw.match(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g) || []).map(e => e.toLowerCase()))); break;
      // avancé (implémentations simples utiles)
      case 'credentials': {
        out = extractCredentialsFromText(raw, detected);
        break;
      }
      case 'kerberos': out = Array.from(new Set(raw.match(/\$krb5\w+\$[^\s]+/gi) || [])); break;
      case 'secrets': {
        const lines = raw.split(/\r?\n/).filter(l => /(dpapi|lsa\s*secrets?|masterkey|credhist|sekurlsa|kerberos::|vault)/i.test(l));
        out = lines.map(l => l.trim());
        break;
      }
      case 'machineAccounts': out = Array.from(new Set(raw.match(/\b[a-zA-Z0-9\-]+\$/g) || [])); break;
      case 'services': {
        const tokens = raw.match(/\b[a-z0-9_\-]*svc[a-z0-9_\-]*\b/gi) || [];
        const explicit = (raw.match(/service\s*account\s*[:=]\s*([^\s\r\n]+)/gi) || []).map(m => m.split(/[:=]/)[1].trim());
        out = Array.from(new Set([...tokens, ...explicit]));
        break;
      }
      case 'ports': out = Array.from(new Set((raw.match(/(\d+)\/(?:tcp|udp)\s+open/gi) || []).map(m => m.match(/(\d+)/)?.[1] || ''))).filter(Boolean); break;
    }
    // déduplication et nettoyage communs
    out = Array.from(new Set(out.map(v => (v || '').trim()).filter(Boolean)));
    setResults(out);
    setCurrentType(type);
  }

  function extractCredentialsFromText(text: string, detectedKind: string): string[] {
    const creds: string[] = [];
    // secretsdump / sam style: DOMAIN\\user:RID:LM:NT:::
    const secretsdumpRe = /^(?:([^\\:\n]+)\\)?([^:\n]+):\d+:[a-fA-F0-9]{32}:([a-fA-F0-9]{32}):::/gm;
    let m: RegExpExecArray | null;
    while ((m = secretsdumpRe.exec(text)) !== null) {
      const domain = m[1] ? m[1] + '\\' : '';
      const user = m[2];
      const nt = m[3];
      if (user && nt && nt !== '31d6cfe0d16ae931b73c59d7e0c089c0') {
        creds.push(`${domain}${user}:${nt}`);
      }
    }
    // mimikatz / lsass: * Username : u, * Domain : d, * NTLM : h
    const userLines = text.match(/\*\s*Username\s*:\s*([^\r\n]+)/gi) || [];
    const domainLines = text.match(/\*\s*Domain\s*:\s*([^\r\n]+)/gi) || [];
    const ntlmLines = text.match(/\*\s*NTLM\s*:\s*([a-fA-F0-9]{32})/gi) || [];
    const len = Math.min(userLines.length, domainLines.length, ntlmLines.length);
    for (let i = 0; i < len; i += 1) {
      const u = userLines[i].replace(/\*\s*Username\s*:\s*/i, '').trim();
      const d = domainLines[i].replace(/\*\s*Domain\s*:\s*/i, '').trim();
      const h = ntlmLines[i].replace(/\*\s*NTLM\s*:\s*/i, '').trim();
      if (u && h && h !== '31d6cfe0d16ae931b73c59d7e0c089c0') creds.push(`${d ? d + '\\' : ''}${u}:${h}`);
    }
    return Array.from(new Set(creds));
  }

  // Hash type analysis and cracking suggestions
  type HashInfo = { type: string; hashcatMode?: number; johnFormat?: string };
  function detectHashInfo(h: string): HashInfo {
    if (/^\$2[aby]?\$/i.test(h)) return { type: 'bcrypt', hashcatMode: 3200, johnFormat: 'bcrypt' };
    if (/^\$6\$/i.test(h)) return { type: 'sha512crypt', hashcatMode: 1800, johnFormat: 'sha512crypt' };
    if (/^\$5\$/i.test(h)) return { type: 'sha256crypt', hashcatMode: 7400, johnFormat: 'sha256crypt' };
    if (/^\$(?:1|apr1)\$/i.test(h)) return { type: 'md5crypt', hashcatMode: 500, johnFormat: 'md5crypt' };
    if (/^[a-fA-F0-9]{128}$/.test(h)) return { type: 'sha512', hashcatMode: 1700, johnFormat: 'raw-sha512' };
    if (/^[a-fA-F0-9]{64}$/.test(h)) return { type: 'sha256', hashcatMode: 1400, johnFormat: 'raw-sha256' };
    if (/^[a-fA-F0-9]{40}$/.test(h)) return { type: 'sha1', hashcatMode: 100, johnFormat: 'raw-sha1' };
    if (/^[a-fA-F0-9]{32}$/.test(h)) return { type: 'ntlm', hashcatMode: 1000, johnFormat: 'NT' };
    return { type: 'unknown' };
  }

  const crackSuggestions = useMemo(() => {
    const present = new Map<string, { count: number; mode?: number; john?: string }>();
    if (currentType !== 'hashes' && currentType !== 'credentials') return { list: [], hashcat: [], john: [] };
    const source = currentType === 'credentials' ? results.map(r => r.split(':').pop() || '') : results;
    for (const h of source) {
      const info = detectHashInfo(h);
      const key = info.type;
      if (!present.has(key)) present.set(key, { count: 0, mode: info.hashcatMode, john: info.johnFormat });
      present.get(key)!.count += 1;
    }
    const list = Array.from(present.entries()).filter(([t]) => t !== 'unknown').map(([t, v]) => ({ type: t, ...v }));
    const hashcat = list.filter(l => l.mode).map(l => `hashcat -m ${l.mode} -a 0 hashes.txt /path/to/wordlist`);
    const john = list.filter(l => l.john).map(l => `john --format=${l.john} hashes.txt --wordlist=/path/to/wordlist`);
    return { list, hashcat: Array.from(new Set(hashcat)), john: Array.from(new Set(john)) };
  }, [results, currentType]);

  function formatted(): string {
    if (format === 'json') return JSON.stringify(results, null, 2);
    if (format === 'csv') return results.join('\n');
    return results.join('\n');
  }

  return (
    <div className="app-layout">
      <div className="main-header p-6">
        <div className="flex-between mb-4">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="AuditMapper" className="w-8 h-8 rounded-lg opacity-80" />
            <div>
              <h1 className="text-2xl font-bold text-slate-100">Grep Master</h1>
              <p className="text-slate-400 text-sm">Collez vos outputs et extrayez rapidement les éléments utiles. Parsing avancé à venir.</p>
            </div>
          </div>
          <div className="ml-auto">
            <Button variant="outline" className="bg-slate-800 border-slate-600 text-slate-200 hover:bg-slate-700" onClick={() => setAbout(true)}>ℹ️ Comment ça marche</Button>
          </div>
        </div>

        {/* Alerte disclaimer */}
        <div className="mb-4 rounded-md border border-red-700 bg-red-900/30 px-3 py-2 text-red-200 text-sm">
          ⚠️ Avertissement regex: je suis nul en regex. Les extractions accélèrent le tri mais il faut toujours vérifier à la main. Si tu es chaud en regex et veux aider, contacte-moi en MP.
        </div>

        <Card className="border-slate-700 bg-slate-800">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-slate-100">Données à analyser</CardTitle>
              <Button
                variant="outline"
                size="sm"
                className="bg-slate-700 border-slate-600 text-slate-200 hover:bg-slate-600"
                onClick={() => setExpanded(e => ({ ...e, input: !e.input }))}
              >
                {expanded.input ? 'Réduire' : 'Afficher'}
              </Button>
            </div>
          </CardHeader>
          {expanded.input && (
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="text-sm text-slate-400">Type d'output</label>
                <Select value={outputType} onValueChange={v => setOutputType(v)}>
                  <SelectTrigger className="mt-1 h-9 bg-slate-700 border-slate-600 text-slate-100">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-600">
                    {OUTPUT_TYPES.map(o => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm text-slate-400">Détecté</label>
                <Input readOnly value={detected} className="mt-1 h-9 bg-slate-700 border-slate-600 text-slate-100" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm text-slate-400">Lignes</label>
                  <Input readOnly value={lines} className="mt-1 h-9 bg-slate-700 border-slate-600 text-slate-100" />
                </div>
                <div>
                  <label className="text-sm text-slate-400">Caractères</label>
                  <Input readOnly value={chars} className="mt-1 h-9 bg-slate-700 border-slate-600 text-slate-100" />
                </div>
              </div>
            </div>

            <Textarea
              value={raw}
              onChange={e => setRaw(e.target.value)}
              rows={14}
              placeholder="Collez ici vos outputs (secretsdump, mimikatz, nmap, etc.)"
              className="bg-slate-900 border-slate-700 text-slate-100"
            />
            <div className="flex gap-2">
              <Button onClick={() => {/* simple re-analyse trigger */}} className="bg-blue-600 hover:bg-blue-700 text-white">Analyser</Button>
              <Button variant="outline" onClick={() => setRaw('')} className="bg-slate-700 border-slate-600 text-slate-200 hover:bg-slate-600">Vider</Button>
            </div>
          </CardContent>
          )}
        </Card>
      </div>

      <div className="main-content">
        <div className="content-area">
          <div className="content-main p-4 md:p-6 space-y-6 w-full max-w-none">
            <Card className="border-slate-700 bg-slate-800">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-slate-100">Extraction rapide</CardTitle>
                  <Button
                    variant="outline"
                    size="sm"
                    className="bg-slate-700 border-slate-600 text-slate-200 hover:bg-slate-600"
                    onClick={() => setExpanded(e => ({ ...e, quick: !e.quick }))}
                  >
                    {expanded.quick ? 'Réduire' : 'Afficher'}
                  </Button>
                </div>
              </CardHeader>
              {expanded.quick && (
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                    {(['users','hashes','passwords','domains','ips','emails'] as QuickType[]).map(t => (
                      <Button key={t} onClick={() => extract(t)} className="bg-slate-700 border border-slate-600 hover:bg-slate-600 text-slate-200 flex items-center justify-between">
                        <span>{typeNames[t]}</span>
                        <span className="ml-2 px-2 py-0.5 rounded bg-slate-900 text-xs">{quickCounts[t]}</span>
                      </Button>
                    ))}
                  </div>
                </CardContent>
              )}
            </Card>

            <Card className="border-slate-700 bg-slate-800">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-slate-100">Résultats</CardTitle>
                  <Button
                    variant="outline"
                    size="sm"
                    className="bg-slate-700 border-slate-600 text-slate-200 hover:bg-slate-600"
                    onClick={() => setExpanded(e => ({ ...e, results: !e.results }))}
                  >
                    {expanded.results ? 'Réduire' : 'Afficher'}
                  </Button>
                </div>
              </CardHeader>
              {expanded.results && (
              <CardContent className="space-y-3">
                {/* Cible d'injection */}
                <div className="flex items-center gap-3">
                  <label className="text-sm text-slate-300">Cibler un host</label>
                  <Select value={targetHostId || '__none__'} onValueChange={(v)=> setTargetHostId(v === '__none__' ? '' : v)}>
                    <SelectTrigger className="h-8 bg-slate-700 border-slate-600 text-slate-100">
                      <SelectValue placeholder="Sélectionner un host" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-800 border-slate-600 max-h-64 overflow-y-auto">
                      <SelectItem value="__none__">Aucun</SelectItem>
                      {Object.values(hosts).map(h => (
                        <SelectItem key={h.id} value={h.id}>{h.ip} — {h.hostname || 'Sans nom'}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    disabled={!targetHostId || results.length === 0}
                    className="bg-blue-600 hover:bg-blue-700"
                    onClick={() => {
                      if (!targetHostId || results.length === 0 || !currentType) return;
                      const host = Object.values(hosts).find(h => h.id === targetHostId);
                      if (!host) return;
                      if (currentType === 'users') {
                        updateHost(host.id, { usernames: Array.from(new Set([...(host.usernames||[]), ...results])) });
                      } else if (currentType === 'passwords') {
                        updateHost(host.id, { passwords: Array.from(new Set([...(host.passwords||[]), ...results])) });
                      } else if (currentType === 'hashes' || currentType === 'credentials') {
                        const hashes = currentType === 'credentials' ? results.map(r => r.split(':').pop() || '').filter(Boolean) : results;
                        updateHost(host.id, { hashes: Array.from(new Set([...(host.hashes||[]), ...hashes])) });
                      }
                    }}
                  >
                    Injecter dans l'hôte
                  </Button>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <div className="text-slate-300 text-sm">Type: <span className="font-medium text-slate-100">{currentType ? typeNames[currentType] : '—'}</span></div>
                  <div className="text-slate-300 text-sm">Total: <span className="font-medium text-slate-100">{results.length}</span></div>
                  <div className="ml-auto flex items-center gap-2">
                    <label className="text-sm text-slate-300">Format</label>
                    <Select value={format} onValueChange={(v: any) => setFormat(v)}>
                      <SelectTrigger className="h-8 bg-slate-700 border-slate-600 text-slate-100">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-800 border-slate-600">
                        <SelectItem value="list">Liste</SelectItem>
                        <SelectItem value="hashcat">Hashcat</SelectItem>
                        <SelectItem value="john">John</SelectItem>
                        <SelectItem value="csv">CSV</SelectItem>
                        <SelectItem value="json">JSON</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      variant="outline"
                      className="bg-slate-700 border-slate-600 text-slate-200 hover:bg-slate-600"
                      onClick={() => navigator.clipboard.writeText(formatted())}
                    >
                      Copier
                    </Button>
                  </div>
                </div>

                <pre className="p-3 bg-slate-900 border border-slate-700 rounded text-slate-100 overflow-auto max-h-[50vh] whitespace-pre-wrap">{formatted()}</pre>
                {(currentType === 'hashes' || currentType === 'credentials') && crackSuggestions.list.length > 0 && (
                  <div className="mt-3 space-y-2">
                    <div className="text-slate-200 text-sm">Suggestions de cracking (détection heuristique)</div>
                    <div className="grid md:grid-cols-2 gap-3">
                      <div className="bg-slate-900 border border-slate-700 rounded p-2">
                        <div className="text-slate-300 text-xs mb-1">Hashcat</div>
                        <pre className="text-slate-100 text-xs whitespace-pre-wrap">{crackSuggestions.hashcat.join('\n')}</pre>
                      </div>
                      <div className="bg-slate-900 border border-slate-700 rounded p-2">
                        <div className="text-slate-300 text-xs mb-1">John</div>
                        <pre className="text-slate-100 text-xs whitespace-pre-wrap">{crackSuggestions.john.join('\n')}</pre>
                      </div>
                    </div>
                    <div className="text-slate-400 text-xs">Placeholders: sauvegardez d'abord les hashes dans <code>hashes.txt</code>. Ajustez la wordlist/règles selon vos besoins.</div>
                  </div>
                )}
              </CardContent>
              )}
            </Card>
          </div>
        </div>
      </div>

      <InfoModal open={about} onClose={() => setAbout(false)} title="Grep Master – principes techniques">
        <ul className="list-disc ml-5 space-y-1">
          <li><strong>UI</strong>: React + composants internes (Cards, Buttons) avec Tailwind.</li>
          <li><strong>Parsing</strong>: heuristiques regex légères par type (users, hashes, passwords, etc.).</li>
          <li><strong>Détection</strong>: tentative de détection d’output (secretsdump, mimikatz, nmap...).</li>
          <li><strong>Cracking</strong>: détection simple de types de hash et génération de commandes Hashcat/John.</li>
          <li><strong>Export</strong>: copie presse‑papiers, formats list/csv/json; à étoffer.</li>
        </ul>
        <p className="text-slate-400">Aucun backend. Tout tourne côté navigateur. Les regex sont simplistes: vérifiez toujours manuellement.</p>
      </InfoModal>
    </div>
  );
};

export default GrepMasterPage;


