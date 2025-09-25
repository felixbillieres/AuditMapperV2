import React, { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import InfoModal from '@/components/ui/InfoModal';
import HostSelectionModal from './HostSelectionModal';
import { useHostStore } from '@/stores/hostStore';

type QuickType = 'users' | 'hashes' | 'passwords' | 'domains' | 'ips' | 'emails';
type AdvancedType = 'credentials' | 'kerberos' | 'secrets' | 'machineAccounts' | 'services' | 'ports' | 'ntlm' | 'aes' | 'sam' | 'lsass';
type ExtractionType = QuickType | AdvancedType;

const OUTPUT_TYPES = [
  { value: 'auto', label: 'Détection automatique' },
  { value: 'secretsdump', label: 'Secretsdump' },
  { value: 'mimikatz', label: 'Mimikatz' },
  { value: 'netexec', label: 'NetExec (CME/CrackMapExec)' },
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
  ntlm: 'Hashes NTLM',
  aes: 'Clés AES',
  sam: 'SAM Hashes',
  lsass: 'LSASS Credentials',
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
  const [showTestData, setShowTestData] = useState(false);
  const [showHostSelection, setShowHostSelection] = useState(false);
  const { hosts, updateHost } = useHostStore();
  const [targetHostId, setTargetHostId] = useState<string>('');

  const lines = useMemo(() => raw.split('\n').filter(l => l.trim()).length, [raw]);
  const chars = useMemo(() => raw.length, [raw]);

  // Détection améliorée des types d'outputs
  useEffect(() => {
    if (outputType !== 'auto') { setDetected(outputType); return; }
    const tests: Array<{t: string; r: RegExp; priority: number}> = [
      // NetExec/CrackMapExec - patterns plus spécifiques
      { t: 'netexec', r: /^SMB\s+[\d\.]+\s+\d+\s+\w+\s+.*\[.*\]\s+.*\(Pwn3d!\)/m, priority: 1 },
      { t: 'netexec', r: /^SMB\s+[\d\.]+\s+\d+\s+\w+\s+.*-Username-.*-Last PW Set-/m, priority: 2 },
      { t: 'netexec', r: /^SMB\s+[\d\.]+\s+\d+\s+\w+\s+.*\[.*\]\s+.*\(.*\)/m, priority: 3 },
      { t: 'netexec', r: /^SMB\s+[\d\.]+\s+\d+\s+\w+\s+.*\[.*\]/m, priority: 4 },
      
      // Secretsdump - patterns SAM/LSA
      { t: 'secretsdump', r: /^[^:]+:\d+:[a-fA-F0-9]{32}:[a-fA-F0-9]{32}:::/m, priority: 1 },
      { t: 'secretsdump', r: /\[.*\]\s+Dumping\s+(SAM|LSA)\s+secrets/i, priority: 2 },
      
      // Mimikatz - patterns plus spécifiques
      { t: 'mimikatz', r: /\*\s*Username\s*:\s*[^\r\n]+[\r\n]*\*\s*Domain\s*:\s*[^\r\n]+[\r\n]*\*\s*NTLM\s*:\s*[a-fA-F0-9]{32}/i, priority: 1 },
      { t: 'mimikatz', r: /\*\s*Username\s*:\s*[^\r\n]+[\r\n]*\*\s*Password\s*:\s*[^\r\n]+/i, priority: 2 },
      { t: 'mimikatz', r: /\*\s*Username\s*:/i, priority: 3 },
      
      // Nmap
      { t: 'nmap', r: /Nmap scan report|PORT\s+STATE\s+SERVICE/i, priority: 1 },
      
      // Linux passwd/shadow
      { t: 'passwd', r: /^[^:]+:x:\d+:\d+:/m, priority: 1 },
      { t: 'shadow', r: /^[^:]+:\$\d+\$/m, priority: 1 },
      
      // DPAPI/LSA secrets
      { t: 'dpapi', r: /dpapi_machinekey|dpapi_userkey/i, priority: 1 },
      { t: 'lsa', r: /LSA\s+secrets|masterkey/i, priority: 1 },
    ];
    
    // Trier par priorité (plus spécifique = priorité plus basse)
    const sortedTests = tests.sort((a, b) => a.priority - b.priority);
    const found = sortedTests.find(tt => tt.r.test(raw));
    setDetected(found?.t || 'generic');
  }, [raw, outputType]);

  // Compteurs rapides améliorés
  const quickCounts = useMemo(() => {
    const counts: Record<QuickType, number> = { users: 0, hashes: 0, passwords: 0, domains: 0, ips: 0, emails: 0 };
    if (!raw.trim()) return counts;
    
    // Users - patterns améliorés
    const userPatterns = [
      // NetExec format: SMB IP PORT HOST USERNAME ...
      /^SMB\s+[\d\.]+\s+\d+\s+\w+\s+([a-zA-Z0-9\._-]+)\s+(?:\d{4}-\d{2}-\d{2}|<never>)/gm,
      // Mimikatz format: * Username : user
      /\*\s*Username\s*:\s*([a-zA-Z0-9_.-]+)/gi,
      // Secretsdump format: user:rid:...
      /^([^:]+):\d+:[a-fA-F0-9]{32}:[a-fA-F0-9]{32}:::/gm,
      // Domain\user format
      /([a-zA-Z0-9_.-]+)\\([a-zA-Z0-9_.-]+)/g,
      // Service accounts with $
      /([a-zA-Z0-9_.-]+\$)/g,
      // Generic patterns
      /(?:user|username|login)[\s:=]+([a-zA-Z0-9_.-]+)/gi
    ];
    
    const users = new Set<string>();
    userPatterns.forEach(pattern => {
      const matches = raw.match(pattern);
      if (matches) {
        matches.forEach(match => {
          let username = match;
          if (match.includes(':')) {
            username = match.split(':')[0];
          } else if (match.includes('\\')) {
            username = match.split('\\')[1] || match.split('\\')[0];
          } else if (match.includes('Username:')) {
            username = match.replace(/Username:\s*/i, '');
          }
          if (username && username.trim() && !username.match(/^\d+$/) && 
              !username.includes('-Username-') && 
              !username.includes('-Last') &&
              !username.includes('-BadPW-')) {
            users.add(username.trim());
          }
        });
      }
    });
    counts.users = users.size;
    
    // Hashes - patterns améliorés
    const hashPatterns = [
      // NTLM hashes (32 hex chars)
      /[a-fA-F0-9]{32}/g,
      // SHA1 hashes (40 hex chars)
      /[a-fA-F0-9]{40}/g,
      // SHA256 hashes (64 hex chars)
      /[a-fA-F0-9]{64}/g,
      // Kerberos hashes
      /\$krb5\w+\$[^\s]+/gi,
      // Unix crypt hashes
      /\$(?:1|2[aby]?|5|6)\$[^\s:]{1,}\$[^\s:]{1,}/g
    ];
    
    const hashes = new Set<string>();
    hashPatterns.forEach(pattern => {
      const matches = raw.match(pattern);
      if (matches) {
        matches.forEach(hash => {
          const lowerHash = hash.toLowerCase();
          if (lowerHash !== '31d6cfe0d16ae931b73c59d7e0c089c0' && 
              lowerHash !== 'aad3b435b51404eeaad3b435b51404ee' &&
              lowerHash !== '00000000000000000000000000000000' &&
              hash.length >= 8) {
            hashes.add(hash);
          }
        });
      }
    });
    counts.hashes = hashes.size;
    
    // Passwords - patterns améliorés
    const passwordPatterns = [
      // Mimikatz format: * Password : pass
      /\*\s*Password\s*:\s*([^\r\n]+)/gi,
      // LSASS format: Password: pass
      /Password:\s*([^\r\n]+)/gi,
      // DPAPI credentials: [CREDENTIAL] Domain:user:password
      /\[CREDENTIAL\]\s+[^:]+:\s*([^:]+):([^\s]+)/gi,
      // Plain text passwords
      /(?:plain_password|password_hex):\s*([^\s]+)/gi,
      // Generic patterns
      /(?:password|pass|pwd)[\s:=]+([^\s\r\n]+)/gi
    ];
    
    const passwords = new Set<string>();
    passwordPatterns.forEach(pattern => {
      const matches = raw.match(pattern);
      if (matches) {
        matches.forEach(match => {
          let password = match;
          if (match.includes('Password:')) {
            password = match.replace(/Password:\s*/i, '');
          } else if (match.includes('Password :')) {
            password = match.replace(/\*\s*Password\s*:\s*/i, '');
          } else if (match.includes(':')) {
            password = match.split(':').pop() || match;
          }
          if (password && password.trim() && 
              password !== '(null)' && 
              password !== 'null' && 
              password.length > 0) {
            passwords.add(password.trim());
          }
        });
      }
    });
    counts.passwords = passwords.size;
    
    // Domains - patterns améliorés
    const domainPatterns = [
      // Domain\username format
      /([a-zA-Z0-9\-.]+)\\[a-zA-Z0-9_.-]+/g,
      // Mimikatz format: * Domain : domain
      /\*\s*Domain\s*:\s*([a-zA-Z0-9\-.]+)/gi,
      // FQDN patterns
      /([a-zA-Z0-9\-.]+\.(?:local|lan|corp|internal|domain))/gi,
      // Generic patterns
      /(?:domain|realm)[\s:=]+([a-zA-Z0-9\-.]+)/gi
    ];
    
    const domains = new Set<string>();
    domainPatterns.forEach(pattern => {
      const matches = raw.match(pattern);
      if (matches) {
        matches.forEach(match => {
          let domain = match;
          if (match.includes('Domain:')) {
            domain = match.replace(/Domain:\s*/i, '');
          } else if (match.includes('\\')) {
            domain = match.split('\\')[0];
          }
          if (domain && domain.trim() && domain.length > 1) {
            domains.add(domain.trim());
          }
        });
      }
    });
    counts.domains = domains.size;
    
    // IPs - pattern existant (déjà bon)
    counts.ips = (raw.match(/\b(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\b/g) || []).length;
    
    // Emails - pattern existant (déjà bon)
    counts.emails = (raw.match(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g) || []).length;
    
    return counts;
  }, [raw]);

  // Données de test fictives
  const testData = {
    netexec: `└─# nxc smb 172.16.1.200 -u Administrator -H 8f6aaf1438d78c89c4636179e3ae18ea --sam --lsa --dpapi       
SMB         172.16.1.200    445    DC0              [*] Windows 10 / Server 2019 Build 17763 x64 (name:DC0) (domain:LAB.OFFSHORE.LOCAL) (signing:True) (SMBv1:False)
SMB         172.16.1.200    445    DC0              [+] LAB.OFFSHORE.LOCAL\\Administrator:8f6aaf1438d78c89c4636179e3ae18ea (Pwn3d!)
SMB         172.16.1.200    445    DC0              [*] Dumping SAM hashes
SMB         172.16.1.200    445    DC0              Administrator:500:aad3b435b51404eeaad3b435b51404ee:797952ec54e1c3cbecafa37ff2f1bae5:::
SMB         172.16.1.200    445    DC0              Guest:501:aad3b435b51404eeaad3b435b51404ee:31d6cfe0d16ae931b73c59d7e0c089c0:::
SMB         172.16.1.200    445    DC0              DefaultAccount:503:aad3b435b51404eeaad3b435b51404ee:31d6cfe0d16ae931b73c59d7e0c089c0:::
SMB         172.16.1.200    445    DC0              [+] Added 3 SAM hashes to the database
SMB         172.16.1.200    445    DC0              [+] Dumping LSA secrets
SMB         172.16.1.200    445    DC0              LAB\\DC0$:aes256-cts-hmac-sha1-96:1626c12b06a74d1c43d1d3b6999a5e05cc6f099a184a96f2e31d6a5395854b64
SMB         172.16.1.200    445    DC0              LAB\\DC0$:aes128-cts-hmac-sha1-96:2bd3c51fa505ad3d3a13738eba86e3a6
SMB         172.16.1.200    445    DC0              LAB\\DC0$:des-cbc-md5:07fbe6e0cbd5d0f4
SMB         172.16.1.200    445    DC0              LAB\\DC0$:plain_password_hex:6100690020003c003a007a007500640025005000680040005d0029004c00330053007500350053005b0034004a006800390021006800280065005100670067003d004f004a002f00710043005f006100280053003d0069005a003f00570034006e005b005d00390072003d0065007a006600450064002f007a004d00250045005b006b005b0029004d002200540052005f0064006b006f003a0034003b0042004f002500200038003b0046005b004a00500066005b003f0026006f006a002f0046005000670035006500340076003d004000690035003b005c003d0047003f00690020003c0055002c005d0026003200
SMB         172.16.1.200    445    DC0              LAB\\DC0$:aad3b435b51404eeaad3b435b51404ee:b71998e6fd5e3597d4d1abae659f7e68:::
SMB         172.16.1.200    445    DC0              dpapi_machinekey:0x836190a58db353b803aaba63897fe7424ba403fa
SMB         172.16.1.200    445    DC0              dpapi_userkey:0x04505586f313bd7ee23600b64415690268e2e880
SMB         172.16.1.200    445    DC0              [+] Dumped 6 LSA secrets to /root/.nxc/logs/lsa/DC0_172.16.1.200_2025-08-18_151555.secrets and /root/.nxc/logs/lsa/DC0_172.16.1.200_2025-08-18_151555.cached
SMB         172.16.1.200    445    DC0              [+] User is Domain Administrator, exporting domain backupkey...
SMB         172.16.1.200    445    DC0              [*] Collecting DPAPI masterkeys, grab a coffee and be patient...
SMB         172.16.1.200    445    DC0              [+] Got 10 decrypted masterkeys. Looting secrets...
SMB         172.16.1.200    445    DC0              [SYSTEM][CREDENTIAL] Domain:batch=TaskScheduler:Task:{AF2873AC-B9DE-4DD7-A0ED-8BF33B64371A} - LAB\\Administrator:Adm1n_to_j03s_t3st_d0main!`,
    
    mimikatz: `mimikatz # sekurlsa::logonpasswords

Authentication Id : 0 ; 123456 (00000000:0001e240)
Session           : Interactive from 1
User Name         : Administrator
Domain            : LAB
Logon Server      : DC0
Logon Time        : 18/08/2025 15:15:55
SID               : S-1-5-21-1234567890-1234567890-1234567890-500
        * Username : Administrator
        * Domain   : LAB
        * NTLM     : 8f6aaf1438d78c89c4636179e3ae18ea
        * SHA1     : 1234567890abcdef1234567890abcdef12345678
        * Password : Adm1n_to_j03s_t3st_d0main!
        * DPAPI    : 1234567890abcdef1234567890abcdef12345678

Authentication Id : 0 ; 789012 (00000000:000c0a8c)
Session           : Interactive from 1
User Name         : Guest
Domain            : LAB
Logon Server      : DC0
Logon Time        : 18/08/2025 15:15:55
SID               : S-1-5-21-1234567890-1234567890-1234567890-501
        * Username : Guest
        * Domain   : LAB
        * NTLM     : 31d6cfe0d16ae931b73c59d7e0c089c0
        * SHA1     : 31d6cfe0d16ae931b73c59d7e0c089c0
        * Password : (null)`,
    
    secretsdump: `[*] Dumping SAM hashes
Administrator:500:aad3b435b51404eeaad3b435b51404ee:797952ec54e1c3cbecafa37ff2f1bae5:::
Guest:501:aad3b435b51404eeaad3b435b51404ee:31d6cfe0d16ae931b73c59d7e0c089c0:::
DefaultAccount:503:aad3b435b51404eeaad3b435b51404ee:31d6cfe0d16ae931b73c59d7e0c089c0:::
WDAGUtilityAccount:504:aad3b435b51404eeaad3b435b51404ee:31d6cfe0d16ae931b73c59d7e0c089c0:::

[*] Dumping LSA secrets
LAB\\DC0$:aes256-cts-hmac-sha1-96:1626c12b06a74d1c43d1d3b6999a5e05cc6f099a184a96f2e31d6a5395854b64
LAB\\DC0$:aes128-cts-hmac-sha1-96:2bd3c51fa505ad3d3a13738eba86e3a6
LAB\\DC0$:des-cbc-md5:07fbe6e0cbd5d0f4
LAB\\DC0$:aad3b435b51404eeaad3b435b51404ee:b71998e6fd5e3597d4d1abae659f7e68:::`
  };

  // Fonction spécialisée pour extraire les usernames depuis les dumps NetExec
  function extractNetExecUsers(text: string): string[] {
    const users: string[] = [];
    const lines = text.split('\n');
    
    for (const line of lines) {
      // Chercher les lignes qui contiennent des usernames (après la ligne d'en-tête)
      // Format: SMB         192.168.144.175 445    RESOURCEDC       Administrator                 2022-02-11 17:21:20 0       Built-in account...
      const userMatch = line.match(/^SMB\s+[\d\.]+\s+\d+\s+\w+\s+([a-zA-Z0-9\._-]+)\s+(?:\d{4}-\d{2}-\d{2}|<never>)/);
      if (userMatch) {
        const username = userMatch[1].trim();
        // Filtrer les mots-clés qui ne sont pas des usernames
        if (username && 
            !username.includes('-Username-') && 
            !username.includes('-Last') &&
            !username.includes('-BadPW-') &&
            !username.includes('-Description-') &&
            username !== 'Username' &&
            username.length > 0) {
          users.push(username);
        }
      }
    }
    
    return Array.from(new Set(users)); // Déduplication
  }

  function extract(type: ExtractionType) {
    if (!raw.trim()) { setResults([]); setCurrentType(''); return; }
    let out: string[] = [];
    switch (type) {
      case 'users': {
        // Patterns améliorés pour différents types d'outputs
        const userPatterns = [
          // Mimikatz format
          /\*\s*Username\s*:\s*([a-zA-Z0-9_.-]+)/gi,
          // Secretsdump format (username:rid:...)
          /^([^:]+):\d+:[a-fA-F0-9]{32}:[a-fA-F0-9]{32}:::/gm,
          // LSASS dump format
          /Username:\s*([a-zA-Z0-9_.-]+)/gi,
          // NetExec format
          /-Username-([a-zA-Z0-9_.-]+)/gi,
          // Generic patterns
          /(?:user|username|login)[\s:=]+([a-zA-Z0-9_.-]+)/gi,
          // Domain\username format
          /([a-zA-Z0-9_.-]+)\\([a-zA-Z0-9_.-]+)/g,
          // Service accounts with $
          /([a-zA-Z0-9_.-]+\$)/g,
          // Credential format LAB\user
          /([a-zA-Z0-9_.-]+)\\([a-zA-Z0-9_.-]+)/g
        ];
        
        const users = new Set<string>();
        userPatterns.forEach(pattern => {
          const matches = raw.match(pattern);
          if (matches) {
            matches.forEach(match => {
              // Extract username from different formats
              let username = match;
              if (match.includes(':')) {
                username = match.split(':')[0];
              } else if (match.includes('\\')) {
                username = match.split('\\')[1] || match.split('\\')[0];
              } else if (match.includes('Username:')) {
                username = match.replace(/Username:\s*/i, '');
              } else if (match.includes('Username :')) {
                username = match.replace(/\*\s*Username\s*:\s*/i, '');
              }
              if (username && username.trim() && !username.match(/^\d+$/)) {
                users.add(username.trim());
              }
            });
          }
        });
        
        // Parser spécifique pour NetExec si détecté
        if (detected === 'netexec') {
          const netexecUsers = extractNetExecUsers(raw);
          netexecUsers.forEach(user => users.add(user));
        }
        
        out = Array.from(users);
        break;
      }
      case 'hashes': {
        // Patterns améliorés pour différents types de hashes
        const hashPatterns = [
          // NTLM hashes (32 hex chars)
          /[a-fA-F0-9]{32}/g,
          // SHA1 hashes (40 hex chars)
          /[a-fA-F0-9]{40}/g,
          // SHA256 hashes (64 hex chars)
          /[a-fA-F0-9]{64}/g,
          // Kerberos hashes
          /\$krb5\w+\$[^\s]+/gi,
          // Unix crypt hashes
          /\$(?:1|2[aby]?|5|6)\$[^\s:]{1,}\$[^\s:]{1,}/g,
          // AES keys (32-128 hex chars)
          /[a-fA-F0-9]{32,128}/g,
          // NTLM format from secretsdump
          /[a-fA-F0-9]{32}:[a-fA-F0-9]{32}/g
        ];
        
        const hashes = new Set<string>();
        hashPatterns.forEach(pattern => {
          const matches = raw.match(pattern);
          if (matches) {
            matches.forEach(hash => {
              // Filter out common empty/default hashes
              const lowerHash = hash.toLowerCase();
              if (lowerHash !== '31d6cfe0d16ae931b73c59d7e0c089c0' && 
                  lowerHash !== 'aad3b435b51404eeaad3b435b51404ee' &&
                  lowerHash !== '00000000000000000000000000000000' &&
                  hash.length >= 8) {
                hashes.add(hash);
              }
            });
          }
        });
        
        out = Array.from(hashes);
        break;
      }
      case 'passwords': {
        // Patterns améliorés pour les mots de passe
        const passwordPatterns = [
          // Mimikatz format
          /\*\s*Password\s*:\s*([^\r\n]+)/gi,
          // LSASS dump format
          /Password:\s*([^\r\n]+)/gi,
          // Generic password patterns
          /(?:password|pass|pwd)[\s:=]+([^\s\r\n]+)/gi,
          // Credential format with passwords
          /([^:]+):([^:]+)@/g,
          // DPAPI credentials
          /\[CREDENTIAL\]\s+[^:]+:\s*([^\s]+)/gi,
          // Plain text passwords in various formats
          /(?:plain_password|password_hex):\s*([^\s]+)/gi,
          // NetExec credential format
          /[^:]+:([^:]+)@[^\s]+/g
        ];
        
        const passwords = new Set<string>();
        passwordPatterns.forEach(pattern => {
          const matches = raw.match(pattern);
          if (matches) {
            matches.forEach(match => {
              let password = match;
              if (match.includes('Password:')) {
                password = match.replace(/Password:\s*/i, '');
              } else if (match.includes('Password :')) {
                password = match.replace(/\*\s*Password\s*:\s*/i, '');
              } else if (match.includes(':')) {
                password = match.split(':')[1];
              }
              if (password && password.trim() && 
                  password !== '(null)' && 
                  password !== 'null' && 
                  password.length > 0) {
                passwords.add(password.trim());
              }
            });
          }
        });
        
        out = Array.from(passwords);
        break;
      }
      case 'domains': {
        // Patterns améliorés pour les domaines
        const domainPatterns = [
          // Domain\username format
          /([a-zA-Z0-9\-.]+)\\[a-zA-Z0-9_.-]+/g,
          // Domain: format
          /\*\s*Domain\s*:\s*([a-zA-Z0-9\-.]+)/gi,
          // Generic domain patterns
          /(?:domain|realm)[\s:=]+([a-zA-Z0-9\-.]+)/gi,
          // FQDN patterns
          /([a-zA-Z0-9\-.]+\.(?:local|lan|corp|internal|domain))/gi,
          // NetExec domain format
          /[^\\]+\\([^:]+):/g
        ];
        
        const domains = new Set<string>();
        domainPatterns.forEach(pattern => {
          const matches = raw.match(pattern);
          if (matches) {
            matches.forEach(match => {
              let domain = match;
              if (match.includes('Domain:')) {
                domain = match.replace(/Domain:\s*/i, '');
              } else if (match.includes('Domain :')) {
                domain = match.replace(/\*\s*Domain\s*:\s*/i, '');
              } else if (match.includes('\\')) {
                domain = match.split('\\')[0];
              }
              if (domain && domain.trim() && domain.length > 1) {
                domains.add(domain.trim());
              }
            });
          }
        });
        
        out = Array.from(domains);
        break;
      }
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
      
      // Nouveaux types d'extraction spécialisés
      case 'ntlm': {
        // Extraction spécifique des hashes NTLM
        const ntlmPatterns = [
          // Format secretsdump: user:rid:lm:nt:::
          /[^:]+:\d+:[a-fA-F0-9]{32}:([a-fA-F0-9]{32}):::/g,
          // Format mimikatz: * NTLM : hash
          /\*\s*NTLM\s*:\s*([a-fA-F0-9]{32})/gi,
          // Format LSASS: Hash (NTLM): hash
          /Hash\s*\(NTLM\):\s*([a-fA-F0-9]{32})/gi,
          // Format NetExec: user:hash
          /[^:]+:([a-fA-F0-9]{32})/g
        ];
        
        const ntlmHashes = new Set<string>();
        ntlmPatterns.forEach(pattern => {
          const matches = raw.match(pattern);
          if (matches) {
            matches.forEach(match => {
              let hash = match;
              if (match.includes('NTLM :')) {
                hash = match.replace(/\*\s*NTLM\s*:\s*/i, '');
              } else if (match.includes('Hash (NTLM):')) {
                hash = match.replace(/Hash\s*\(NTLM\):\s*/i, '');
              } else if (match.includes(':')) {
                hash = match.split(':').pop() || match;
              }
              if (hash && hash.length === 32 && /^[a-fA-F0-9]{32}$/.test(hash)) {
                ntlmHashes.add(hash);
              }
            });
          }
        });
        
        out = Array.from(ntlmHashes);
        break;
      }
      
      case 'aes': {
        // Extraction des clés AES Kerberos
        const aesPatterns = [
          // Format: user:aes256-cts-hmac-sha1-96:key
          /[^:]+:aes256-cts-hmac-sha1-96:([a-fA-F0-9]{64})/g,
          // Format: user:aes128-cts-hmac-sha1-96:key
          /[^:]+:aes128-cts-hmac-sha1-96:([a-fA-F0-9]{32})/g,
          // Format: user:des-cbc-md5:key
          /[^:]+:des-cbc-md5:([a-fA-F0-9]{16})/g
        ];
        
        const aesKeys = new Set<string>();
        aesPatterns.forEach(pattern => {
          const matches = raw.match(pattern);
          if (matches) {
            matches.forEach(match => {
              const key = match.split(':').pop();
              if (key && /^[a-fA-F0-9]+$/.test(key)) {
                aesKeys.add(key);
              }
            });
          }
        });
        
        out = Array.from(aesKeys);
        break;
      }
      
      case 'sam': {
        // Extraction des hashes SAM (format complet)
        const samPatterns = [
          // Format complet: user:rid:lm:nt:::
          /([^:]+):\d+:[a-fA-F0-9]{32}:[a-fA-F0-9]{32}:::/g
        ];
        
        const samHashes = new Set<string>();
        samPatterns.forEach(pattern => {
          const matches = raw.match(pattern);
          if (matches) {
            matches.forEach(match => {
              if (match && !match.includes('31d6cfe0d16ae931b73c59d7e0c089c0')) {
                samHashes.add(match);
              }
            });
          }
        });
        
        out = Array.from(samHashes);
        break;
      }
      
      case 'lsass': {
        // Extraction des credentials LSASS
        const lsassPatterns = [
          // Format: [CREDENTIAL] Domain:user:password
          /\[CREDENTIAL\]\s+[^:]+:\s*([^:]+):([^\s]+)/gi,
          // Format: Username: user, Password: password
          /Username:\s*([^\r\n]+)[\s\S]*?Password:\s*([^\r\n]+)/gi,
          // Format: * Username : user, * Password : password
          /\*\s*Username\s*:\s*([^\r\n]+)[\s\S]*?\*\s*Password\s*:\s*([^\r\n]+)/gi
        ];
        
        const lsassCreds = new Set<string>();
        lsassPatterns.forEach(pattern => {
          const matches = raw.match(pattern);
          if (matches) {
            matches.forEach(match => {
              if (match.includes(':')) {
                const parts = match.split(':');
                if (parts.length >= 2) {
                  const user = parts[0].replace(/\[CREDENTIAL\]\s+|\*\s*Username\s*:\s*|Username:\s*/gi, '').trim();
                  const pass = parts[1].replace(/\*\s*Password\s*:\s*|Password:\s*/gi, '').trim();
                  if (user && pass && pass !== '(null)' && pass !== 'null') {
                    lsassCreds.add(`${user}:${pass}`);
                  }
                }
              }
            });
          }
        });
        
        out = Array.from(lsassCreds);
        break;
      }
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
          <div className="ml-auto flex gap-2">
            <Button variant="outline" className="bg-slate-800 border-slate-600 text-slate-200 hover:bg-slate-700" onClick={() => setShowTestData(true)}>🧪 Données de test</Button>
            <Button variant="outline" className="bg-slate-800 border-slate-600 text-slate-200 hover:bg-slate-700" onClick={() => setAbout(true)}>ℹ️ Comment ça marche</Button>
          </div>
        </div>

        {/* Alerte disclaimer */}
        <div className="mb-4 rounded-md border border-red-700 bg-red-900/30 px-3 py-2 text-red-200 text-sm">
          ⚠️ Avertissement regex: je suis nul en regex. Les extractions accélèrent le tri mais il faut toujours vérifier à la main. Si tu es chaud en regex et veux aider, contacte-moi en MP.
        </div>

      </div>

      <div className="main-content">
        <div className="content-area">
          <div className="content-main p-4 md:p-6 space-y-6 w-full max-w-none">
            {/* Données à analyser (déplacé dans le flux scrollable) */}
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
                  <Button onClick={() => {
                    // Analyser automatiquement selon le type détecté
                    if (detected === 'netexec') {
                      extract('users');
                    } else if (detected === 'secretsdump' || detected === 'mimikatz') {
                      extract('credentials');
                    } else if (detected === 'nmap') {
                      extract('ports');
                    } else {
                      // Pour les autres types, essayer d'extraire les utilisateurs par défaut
                      extract('users');
                    }
                  }} className="bg-blue-600 hover:bg-blue-700 text-white">Analyser</Button>
                  <Button variant="outline" onClick={() => setRaw('')} className="bg-slate-700 border-slate-600 text-slate-200 hover:bg-slate-600">Vider</Button>
                </div>
              </CardContent>
              )}
            </Card>
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
                  <Button
                    disabled={results.length === 0}
                    onClick={() => setShowHostSelection(true)}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    Sélectionner un host pour injection
                  </Button>
                  {results.length === 0 && (
                    <span className="text-xs text-slate-400">Aucun résultat à injecter</span>
                  )}
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
          <li><strong>Détection</strong>: tentative de détection d'output (secretsdump, mimikatz, nmap...).</li>
          <li><strong>Cracking</strong>: détection simple de types de hash et génération de commandes Hashcat/John.</li>
          <li><strong>Export</strong>: copie presse‑papiers, formats list/csv/json; à étoffer.</li>
        </ul>
        <p className="text-slate-400">Aucun backend. Tout tourne côté navigateur. Les regex sont simplistes: vérifiez toujours manuellement.</p>
      </InfoModal>

      {/* Modale de données de test */}
      <InfoModal open={showTestData} onClose={() => setShowTestData(false)} title="Données de test - Grep Master">
        <div className="space-y-4">
          <p className="text-slate-300 text-sm">
            Utilisez ces données fictives pour tester les fonctionnalités de parsing du Grep Master.
          </p>
          
          <div className="space-y-3">
            <div>
              <h4 className="text-slate-100 font-semibold mb-2">NetExec/CrackMapExec</h4>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setRaw(testData.netexec);
                  setOutputType('netexec');
                }}
                className="bg-slate-700 border-slate-600 text-slate-200 hover:bg-slate-600"
              >
                Charger l'output NetExec
              </Button>
            </div>
            
            <div>
              <h4 className="text-slate-100 font-semibold mb-2">Mimikatz</h4>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setRaw(testData.mimikatz);
                  setOutputType('mimikatz');
                }}
                className="bg-slate-700 border-slate-600 text-slate-200 hover:bg-slate-600"
              >
                Charger l'output Mimikatz
              </Button>
            </div>
            
            <div>
              <h4 className="text-slate-100 font-semibold mb-2">Secretsdump</h4>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setRaw(testData.secretsdump);
                  setOutputType('secretsdump');
                }}
                className="bg-slate-700 border-slate-600 text-slate-200 hover:bg-slate-600"
              >
                Charger l'output Secretsdump
              </Button>
            </div>
          </div>
          
          <div className="p-3 bg-slate-800/50 border border-slate-700 rounded">
            <p className="text-xs text-slate-400">
              <strong>Note :</strong> Ces données sont fictives et servent uniquement à tester les fonctionnalités de parsing. 
              Elles contiennent des patterns typiques d'outputs d'outils de pentest.
            </p>
          </div>
        </div>
      </InfoModal>

      {/* Modale de sélection de host */}
      <HostSelectionModal
        isOpen={showHostSelection}
        onClose={() => setShowHostSelection(false)}
        onConfirm={(hostId, modifiedOutput) => {
          if (!currentType) return;
          
          const host = hosts[hostId];
          if (!host) return;
          
          // Parser l'output modifié
          const lines = modifiedOutput.split('\n').filter(line => line.trim());
          
          if (currentType === 'users') {
            updateHost(hostId, { 
              usernames: Array.from(new Set([...(host.usernames || []), ...lines])) 
            });
          } else if (currentType === 'passwords') {
            updateHost(hostId, { 
              passwords: Array.from(new Set([...(host.passwords || []), ...lines])) 
            });
          } else if (currentType === 'hashes') {
            updateHost(hostId, { 
              hashes: Array.from(new Set([...(host.hashes || []), ...lines])) 
            });
          } else if (currentType === 'credentials') {
            // Pour les credentials, extraire les hashes
            const hashes = lines.map(r => r.split(':').pop() || '').filter(Boolean);
            updateHost(hostId, { 
              hashes: Array.from(new Set([...(host.hashes || []), ...hashes])) 
            });
          } else if (currentType === 'domains') {
            // Pour les domaines, on pourrait les ajouter comme tags ou dans un champ spécial
            const currentTags = host.tags || [];
            const newTags = lines.map(domain => `domain:${domain}`);
            updateHost(hostId, { 
              tags: Array.from(new Set([...currentTags, ...newTags])) 
            });
          } else if (currentType === 'ips') {
            // Pour les IPs, on pourrait les ajouter comme tags
            const currentTags = host.tags || [];
            const newTags = lines.map(ip => `ip:${ip}`);
            updateHost(hostId, { 
              tags: Array.from(new Set([...currentTags, ...newTags])) 
            });
          }
          
          setShowHostSelection(false);
        }}
        outputToInject={results}
        extractionType={currentType || ''}
      />
    </div>
  );
};

export default GrepMasterPage;


