import React, { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

function downloadText(filename: string, content: string) {
  const blob = new Blob([content], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
}

const ConfigGeneratorPage: React.FC = () => {
  type ConfigType = 'krb5' | 'hosts' | 'proxychains' | 'resolv';
  const [configType, setConfigType] = useState<ConfigType>('krb5');

  // Common context
  const [domain, setDomain] = useState('example.com');
  const [realm, setRealm] = useState('EXAMPLE.COM');
  const [dcFqdn, setDcFqdn] = useState('dc01.example.com');
  const [dcIp, setDcIp] = useState('10.10.40.10');
  const [searchSuffix, setSearchSuffix] = useState('example.com');

  // Proxychains
  const [socksHost, setSocksHost] = useState('127.0.0.1');
  const [socksPort, setSocksPort] = useState('1080');

  // /etc/hosts entries
  const [hostsText, setHostsText] = useState(`10.10.40.10 dc01.example.com dc01
10.10.40.20 ca01.example.com ca01
10.10.30.5 filesrv.example.com filesrv`);

  // resolv.conf
  const [dnsServers, setDnsServers] = useState('10.10.40.10,8.8.8.8');

  const krb5Conf = useMemo(() => {
    return `[libdefaults]
  default_realm = ${realm}
  dns_lookup_realm = false
  dns_lookup_kdc = false
  rdns = false
  ticket_lifetime = 24h
  forwardable = true

[realms]
  ${realm} = {
    kdc = ${dcFqdn}
    admin_server = ${dcFqdn}
  }

[domain_realm]
  .${domain} = ${realm}
  ${domain} = ${realm}
`;
  }, [realm, dcFqdn, domain]);

  const proxychainsConf = useMemo(() => {
    return `# Proxychains minimal config pour pivot
strict_chain
proxy_dns
tcp_read_time_out 15000
tcp_connect_time_out 8000

[ProxyList]
socks5 ${socksHost} ${socksPort}
`;
  }, [socksHost, socksPort]);

  const etcHosts = useMemo(() => {
    return hostsText
      .split(/\r?\n/)
      .map(l => l.trim())
      .filter(l => l && !l.startsWith('#'))
      .join('\n') + '\n';
  }, [hostsText]);

  const resolvConf = useMemo(() => {
    const servers = dnsServers.split(',').map(s => s.trim()).filter(Boolean);
    const lines = [
      `search ${searchSuffix}`,
      ...servers.map(s => `nameserver ${s}`),
    ];
    return lines.join('\n') + '\n';
  }, [dnsServers, searchSuffix]);

  return (
    <div className="app-layout">
      <div className="main-header p-6">
        <div className="flex-between mb-4">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="AuditMapper" className="w-8 h-8 rounded-lg opacity-80" />
            <div>
              <h1 className="text-2xl font-bold text-slate-100">Config Generator</h1>
              <p className="text-slate-400 text-sm">Génère des fichiers de configuration utiles pendant un audit (Kerberos, hosts, proxychains, DNS).</p>
            </div>
          </div>
          <div />
        </div>

        <Card className="border-slate-700 bg-slate-800">
          <CardHeader>
            <CardTitle className="text-slate-100">Sélectionner le type de configuration</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-5 gap-3">
            <div className="md:col-span-1">
              <label className="text-sm text-slate-400">Type</label>
              <select
                value={configType}
                onChange={(e) => setConfigType(e.target.value as ConfigType)}
                className="mt-1 w-full bg-slate-700 border border-slate-600 rounded text-slate-100 p-2"
              >
                <option value="krb5">krb5.conf</option>
                <option value="hosts">/etc/hosts</option>
                <option value="proxychains">proxychains.conf</option>
                <option value="resolv">resolv.conf</option>
              </select>
            </div>
            <div>
              <label className="text-sm text-slate-400">Domaine (dns)</label>
              <Input value={domain} onChange={e => setDomain(e.target.value)} disabled={configType!=='krb5'} className="mt-1 bg-slate-700 border-slate-600 text-slate-100 disabled:opacity-50" />
            </div>
            <div>
              <label className="text-sm text-slate-400">Realm (KERBEROS)</label>
              <Input value={realm} onChange={e => setRealm(e.target.value.toUpperCase())} disabled={configType!=='krb5'} className="mt-1 bg-slate-700 border-slate-600 text-slate-100 disabled:opacity-50" />
            </div>
            <div>
              <label className="text-sm text-slate-400">DC FQDN</label>
              <Input value={dcFqdn} onChange={e => setDcFqdn(e.target.value)} disabled={configType!=='krb5'} className="mt-1 bg-slate-700 border-slate-600 text-slate-100 disabled:opacity-50" />
            </div>
            <div>
              <label className="text-sm text-slate-400">DC IP</label>
              <Input value={dcIp} onChange={e => setDcIp(e.target.value)} disabled={configType==='proxychains'} className="mt-1 bg-slate-700 border-slate-600 text-slate-100 disabled:opacity-50" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="main-content">
        <div className="content-area">
          <div className="content-main p-6 space-y-6">
            {/* krb5.conf */}
            {configType==='krb5' && (
            <Card className="border-slate-700 bg-slate-800">
              <CardHeader>
                <CardTitle className="text-slate-100">krb5.conf (Linux/macOS)</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="text-sm text-slate-300">
                  Utilise le realm Kerberos en majuscules, le DC comme KDC/admin_server. Utile pour <code className="px-1 bg-slate-700 rounded">kinit</code>, <code className="px-1 bg-slate-700 rounded">kvno</code>, <code className="px-1 bg-slate-700 rounded">smbclient -k</code>, etc.
                </div>
                <pre className="p-3 bg-slate-900 border border-slate-700 rounded text-slate-100 text-sm overflow-auto"><code>{krb5Conf}</code></pre>
                <div className="flex gap-2">
                  <Button variant="outline" className="bg-slate-700 border-slate-600 text-slate-200 hover:bg-slate-600" onClick={() => navigator.clipboard.writeText(krb5Conf)}>Copier</Button>
                  <Button className="bg-blue-600 hover:bg-blue-700" onClick={() => downloadText('krb5.conf', krb5Conf)}>Télécharger</Button>
                </div>
              </CardContent>
            </Card>
            )}

            {/* /etc/hosts */}
            {configType==='hosts' && (
            <Card className="border-slate-700 bg-slate-800">
              <CardHeader>
                <CardTitle className="text-slate-100">/etc/hosts</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="text-sm text-slate-300">Ajoute des résolutions locales quand le DNS n’est pas fiable pendant l’audit (VPN, pivot, lab). Exemple: lier {dcIp} à {dcFqdn}.</div>
                <Textarea value={hostsText} onChange={e => setHostsText(e.target.value)} rows={5} className="bg-slate-900 border-slate-700 text-slate-100" />
                <pre className="p-3 bg-slate-900 border border-slate-700 rounded text-slate-100 text-sm overflow-auto"><code>{etcHosts}</code></pre>
                <div className="flex gap-2">
                  <Button variant="outline" className="bg-slate-700 border-slate-600 text-slate-200 hover:bg-slate-600" onClick={() => navigator.clipboard.writeText(etcHosts)}>Copier</Button>
                  <Button className="bg-blue-600 hover:bg-blue-700" onClick={() => downloadText('hosts', etcHosts)}>Télécharger</Button>
                </div>
              </CardContent>
            </Card>
            )}

            {/* proxychains */}
            {configType==='proxychains' && (
            <Card className="border-slate-700 bg-slate-800">
              <CardHeader>
                <CardTitle className="text-slate-100">proxychains.conf</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm text-slate-400">SOCKS Host</label>
                    <Input value={socksHost} onChange={e => setSocksHost(e.target.value)} className="mt-1 bg-slate-700 border-slate-600 text-slate-100" />
                  </div>
                  <div>
                    <label className="text-sm text-slate-400">SOCKS Port</label>
                    <Input value={socksPort} onChange={e => setSocksPort(e.target.value)} className="mt-1 bg-slate-700 border-slate-600 text-slate-100" />
                  </div>
                </div>
                <div className="text-sm text-slate-300">Pour router des outils via un pivot (chisel/ligolo/ssh -D). Utiliser avec <code className="px-1 bg-slate-700 rounded">proxychains nmap ...</code>.</div>
                <pre className="p-3 bg-slate-900 border border-slate-700 rounded text-slate-100 text-sm overflow-auto"><code>{proxychainsConf}</code></pre>
                <div className="flex gap-2">
                  <Button variant="outline" className="bg-slate-700 border-slate-600 text-slate-200 hover:bg-slate-600" onClick={() => navigator.clipboard.writeText(proxychainsConf)}>Copier</Button>
                  <Button className="bg-blue-600 hover:bg-blue-700" onClick={() => downloadText('proxychains.conf', proxychainsConf)}>Télécharger</Button>
                </div>
              </CardContent>
            </Card>
            )}

            {/* resolv.conf */}
            {configType==='resolv' && (
            <Card className="border-slate-700 bg-slate-800">
              <CardHeader>
                <CardTitle className="text-slate-100">resolv.conf</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm text-slate-400">DNS servers (séparés par des virgules)</label>
                    <Input value={dnsServers} onChange={e => setDnsServers(e.target.value)} className="mt-1 bg-slate-700 border-slate-600 text-slate-100" />
                  </div>
                  <div>
                    <label className="text-sm text-slate-400">Search suffix</label>
                    <Input value={searchSuffix} onChange={e => setSearchSuffix(e.target.value)} className="mt-1 bg-slate-700 border-slate-600 text-slate-100" />
                  </div>
                </div>
                <div className="text-sm text-slate-300">Pratique en labo/pivot si le DHCP ne fournit pas les bons DNS ou suffix.</div>
                <pre className="p-3 bg-slate-900 border border-slate-700 rounded text-slate-100 text-sm overflow-auto"><code>{resolvConf}</code></pre>
                <div className="flex gap-2">
                  <Button variant="outline" className="bg-slate-700 border-slate-600 text-slate-200 hover:bg-slate-600" onClick={() => navigator.clipboard.writeText(resolvConf)}>Copier</Button>
                  <Button className="bg-blue-600 hover:bg-blue-700" onClick={() => downloadText('resolv.conf', resolvConf)}>Télécharger</Button>
                </div>
              </CardContent>
            </Card>
            )}

            {/* Explications détaillées */}
            <Card className="border-slate-700 bg-slate-800">
              <CardHeader>
                <CardTitle className="text-slate-100">Quand / Pourquoi / Comment</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-slate-300">
                {configType==='krb5' && (
                  <div>
                    <p><strong>Quand</strong>: environnement AD ; besoin d’utiliser Kerberos côté client (kinit, tooling Impacket avec -k, smbclient -k).</p>
                    <p><strong>Pourquoi</strong>: éviter NTLM/LDAP simple; s’authentifier avec TGT/TGS pour attaques Kerberos (AS-REP, Kerberoasting, S4U, Pass‑the‑Ticket).</p>
                    <p><strong>Comment</strong>: définir REALM en MAJ, KDC = DC FQDN ; vérifier DNS ou /etc/hosts. Test: <code className="px-1 bg-slate-700 rounded">kinit user</code> puis <code className="px-1 bg-slate-700 rounded">kvno cifs/dc01.example.com</code>.</p>
                  </div>
                )}
                {configType==='hosts' && (
                  <div>
                    <p><strong>Quand</strong>: DNS défaillant (VPN, pivot, lab), besoin de forcer la résolution.</p>
                    <p><strong>Pourquoi</strong>: garantir la connectivité vers DC/CA/serveurs sans dépendre du DNS.</p>
                    <p><strong>Comment</strong>: ajouter IP↔FQDN/alias critiques; attention aux collisions avec DNS. Test: <code className="px-1 bg-slate-700 rounded">ping dc01</code>, <code className="px-1 bg-slate-700 rounded">ldapsearch</code>.</p>
                  </div>
                )}
                {configType==='proxychains' && (
                  <div>
                    <p><strong>Quand</strong>: pivot TCP via SSH -D / chisel / ligolo‑ng.</p>
                    <p><strong>Pourquoi</strong>: centraliser le routage des outils (nmap, crackmapexec, smbclient) vers la cible.</p>
                    <p><strong>Comment</strong>: <code className="px-1 bg-slate-700 rounded">strict_chain</code>, <code className="px-1 bg-slate-700 rounded">proxy_dns</code>, <code className="px-1 bg-slate-700 rounded">socks5 127.0.0.1 1080</code>. Test: <code className="px-1 bg-slate-700 rounded">proxychains nmap -sT -Pn 10.10.0.0/24</code>.</p>
                  </div>
                )}
                {configType==='resolv' && (
                  <div>
                    <p><strong>Quand</strong>: DHCP indisponible/erroné; besoin d’un DNS AD + fallback Internet.</p>
                    <p><strong>Pourquoi</strong>: résoudre les SPN/FQDN AD pour Kerberos, LDAP, etc.</p>
                    <p><strong>Comment</strong>: <code className="px-1 bg-slate-700 rounded">search example.com</code> puis <code className="px-1 bg-slate-700 rounded">nameserver 10.10.40.10</code> et public en backup. Test: <code className="px-1 bg-slate-700 rounded">nslookup _kerberos._tcp.example.com</code>.</p>
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

export default ConfigGeneratorPage;


