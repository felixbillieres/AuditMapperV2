import React, { useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import InfoModal from '@/components/ui/InfoModal';
import { Copy, ChevronDown, ChevronUp, Network, Shield, RouteIcon as Route, Settings, HelpCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';

type OSEnum = 'linux' | 'windows' | 'macos';

interface PivotNode {
  label: string;
  ip: string;
  os: OSEnum;
  hasSSH: boolean;
  canRunAgent: boolean;
  sshUser: string;
}

interface PivotScenario {
  attacker: { ip: string; socksPort: string };
  pivot1: PivotNode | null;
  pivot2: PivotNode | null; // optionnel (double pivot)
  target: { ip: string; subnet: string };
  strategy: 'auto' | 'ssh' | 'ligolo' | 'chisel' | 'sshuttle' | 'socat';
}

function copy(cmd: string) {
  navigator.clipboard.writeText(cmd).then(() => toast.success('Commande copiée'));
}

function safeWin(p: string) { return p.replace(/\\/g, '\\\\'); }

const SectionHeader: React.FC<{ title: string; onToggle?: () => void; open?: boolean }>
  = ({ title, onToggle, open }) => (
  <div className="flex items-center justify-between mb-3">
    <h3 className="text-lg font-semibold text-slate-100">{title}</h3>
    {onToggle && (
      <Button variant="outline" size="sm" className="bg-slate-700 border-slate-600 text-slate-200 hover:bg-slate-600" onClick={onToggle}>
        {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </Button>
    )}
  </div>
);

export const PivotMasterPage: React.FC = () => {
  const [scenario, setScenario] = useState<PivotScenario>({
    attacker: { ip: '10.10.14.1', socksPort: '1080' },
    pivot1: { label: 'Pivot-1', ip: '10.10.11.10', os: 'linux', hasSSH: true, canRunAgent: true, sshUser: 'user' },
    pivot2: null,
    target: { ip: '10.10.20.20', subnet: '10.10.20.0/24' },
    strategy: 'auto',
  });
  const [expanded, setExpanded] = useState<{scenario: boolean; cmds: boolean; tips: boolean}>(
    { scenario: true, cmds: true, tips: false }
  );
  const [about, setAbout] = useState(false);

  const isDoublePivot = Boolean(scenario.pivot1 && scenario.pivot2);

  // Choix de stratégie recommandé
  const recommended = useMemo(() => {
    if (scenario.strategy !== 'auto') return scenario.strategy;
    const p1 = scenario.pivot1; const p2 = scenario.pivot2;
    if (isDoublePivot) {
      if (p1?.hasSSH && p2?.hasSSH) return 'ssh';
      if (p1?.canRunAgent && p2?.canRunAgent) return 'ligolo';
      return 'chisel';
    } else {
      if (p1?.hasSSH) return 'ssh';
      if (p1?.canRunAgent) return 'ligolo';
      return 'chisel';
    }
  }, [scenario]);

  // Génération des commandes selon stratégie et nb de pivots
  const cmds = useMemo(() => {
    const a = scenario.attacker; const p1 = scenario.pivot1; const p2 = scenario.pivot2; const t = scenario.target;
    const out: { title: string; blocks: { label: string; lines: string[] }[] }[] = [];
    const socksPort = a.socksPort || '1080';

    if (!p1) return out;

    if (recommended === 'ssh') {
      if (isDoublePivot && p2) {
        out.push({ title: 'SSH ProxyJump (double pivot)', blocks: [
          { label: 'Connexion ProxyJump', lines: [
            `ssh -J ${p1.sshUser}@${p1.ip},${p2.sshUser}@${p2.ip} ${p2.sshUser}@${t.ip}`,
          ]},
          { label: 'SOCKS dynamique (depuis attaquant)', lines: [
            `ssh -J ${p1.sshUser}@${p1.ip},${p2.sshUser}@${p2.ip} -D ${socksPort} -N ${p2.sshUser}@${p2.ip}`,
            `# proxychains: socks5 127.0.0.1 ${socksPort}`,
          ]},
          { label: 'Port forwarding vers un service de la cible', lines: [
            `ssh -J ${p1.sshUser}@${p1.ip},${p2.sshUser}@${p2.ip} -L 0.0.0.0:9001:${t.ip}:22 -N ${p2.sshUser}@${p2.ip}`,
          ]},
          { label: 'sshuttle (routage IP via SSH)', lines: [
            `sshuttle -r ${p1.sshUser}@${p1.ip} ${t.subnet}`,
            `# ou: sshuttle -r ${p2.sshUser}@${p2.ip} ${t.subnet} --ssh-cmd 'ssh -J ${p1.sshUser}@${p1.ip}'`,
          ]},
        ]});
      } else {
        out.push({ title: 'SSH (simple pivot)', blocks: [
          { label: 'SOCKS dynamique', lines: [
            `ssh -D ${socksPort} -N ${p1.sshUser}@${p1.ip}`,
            `# proxychains: socks5 127.0.0.1 ${socksPort}`,
          ]},
          { label: 'Port forwarding (ex: SSH cible)', lines: [
            `ssh -L 0.0.0.0:9001:${t.ip}:22 -N ${p1.sshUser}@${p1.ip}`,
          ]},
          { label: 'sshuttle (routage IP via SSH)', lines: [
            `sshuttle -r ${p1.sshUser}@${p1.ip} ${t.subnet}`,
          ]},
        ]});
      }
    } else if (recommended === 'ligolo') {
      if (isDoublePivot && p2) {
        out.push({ title: 'Ligolo-ng (double pivot)', blocks: [
          { label: 'Attaquant (proxy)', lines: [
            `./proxy -l 0.0.0.0:11601 -p PASSWORD -selfcert`,
            `sudo ip tuntap add user $(whoami) mode tun ligolo`,
            `sudo ip link set ligolo up`,
            `# Dans l'interface proxy: select session puis 'tun start'`,
            `sudo ip route add ${t.subnet} dev ligolo`,
          ]},
          { label: 'Pivot-1 (agent)', lines: [
            `./agent -connect ${a.ip}:11601 -ignore-cert -password PASSWORD`,
          ]},
          { label: 'Pivot-2 (agent)', lines: [
            `./agent -connect ${a.ip}:11601 -ignore-cert -password PASSWORD`,
            `# Option: utiliser pivot1 comme relai si nécessaire (SOCKS ligolo)`,
          ]},
        ]});
      } else {
        out.push({ title: 'Ligolo-ng (simple pivot)', blocks: [
          { label: 'Attaquant (proxy)', lines: [
            `./proxy -l 0.0.0.0:11601 -p PASSWORD -selfcert`,
            `sudo ip tuntap add user $(whoami) mode tun ligolo`,
            `sudo ip link set ligolo up`,
            `# Dans l'interface proxy: select session puis 'tun start'`,
            `sudo ip route add ${t.subnet} dev ligolo`,
          ]},
          { label: 'Pivot-1 (agent)', lines: [
            `./agent -connect ${a.ip}:11601 -ignore-cert -password PASSWORD`,
          ]},
        ]});
      }
      out.push({ title: 'Utilisation via proxy/socks', blocks: [
        { label: 'Scanning via route', lines: [
          `nmap -Pn -sT ${t.ip} -v`,
        ]},
        { label: 'Exemple via proxychains', lines: [
          `proxychains nmap -sT -Pn ${t.ip} -v`,
        ]},
      ]});
    } else if (recommended === 'chisel') {
      if (isDoublePivot && p2) {
        out.push({ title: 'Chisel (double pivot, socks inversé)', blocks: [
          { label: 'Attaquant (serveur)', lines: [
            `chisel server -p 8000 --reverse`,
          ]},
          { label: 'Pivot-1 (client)', lines: [
            `chisel client ${a.ip}:8000 R:${socksPort}:socks`,
          ]},
          { label: 'Pivot-2 (utilise le socks via proxychains)', lines: [
            `# proxychains.conf: socks5 127.0.0.1 ${socksPort}`,
            `proxychains nmap -sT ${t.ip} -Pn`,
          ]},
        ]});
      } else {
        out.push({ title: 'Chisel (simple pivot, socks inversé)', blocks: [
          { label: 'Attaquant (serveur)', lines: [
            `chisel server -p 8000 --reverse`,
          ]},
          { label: 'Pivot-1 (client)', lines: [
            `chisel client ${a.ip}:8000 R:${socksPort}:socks`,
          ]},
          { label: 'Utilisation', lines: [
            `# proxychains.conf: socks5 127.0.0.1 ${socksPort}`,
            `proxychains nmap -sT ${t.ip} -Pn`,
          ]},
        ]});
      }
    } else if (recommended === 'sshuttle') {
      out.push({ title: 'sshuttle (routage IP)', blocks: [
        { label: 'Routage', lines: [
          `sshuttle -r ${scenario.pivot1?.sshUser}@${scenario.pivot1?.ip} ${t.subnet}`,
        ]},
      ]});
    } else if (recommended === 'socat') {
      out.push({ title: 'socat (port-forward simple)', blocks: [
        { label: 'Pivot-1', lines: [
          `socat TCP-LISTEN:9001,fork TCP:${t.ip}:22`,
        ]},
        { label: 'Attaquant', lines: [
          `ssh ${scenario.pivot1?.sshUser}@${p1.ip} -L 0.0.0.0:9001:${t.ip}:22 -N`,
        ]},
      ]});
    }

    // Conseils généraux
    out.push({ title: 'Conseils rapides', blocks: [
      { label: 'Proxychains (exemple)', lines: [
        `[ProxyList]`,
        `socks5 127.0.0.1 ${socksPort}`,
      ]},
      { label: 'Nmap via SOCKS', lines: [
        `proxychains nmap -sT -Pn ${t.ip} -v`,
      ]},
      { label: 'Routes IP (ligolo)', lines: [
        `sudo ip route add ${t.subnet} dev ligolo`,
      ]},
    ]});

    return out;
  }, [scenario, recommended, isDoublePivot]);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  return (
    <div className="app-layout">
      {/* Header */}
      <div className="main-header p-6">
        <div className="flex-between mb-4">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="AuditMapper" className="w-8 h-8 rounded-lg opacity-80" />
            <div>
              <h1 className="text-2xl font-bold text-slate-100">Pivot Master</h1>
              <p className="text-slate-400">Planifiez vos sauts, générez des tunnels et surmontez la segmentation</p>
            </div>
          </div>
          <div className="ml-auto">
            <Button variant="outline" className="bg-slate-800 border-slate-600 text-slate-200 hover:bg-slate-700" onClick={() => setAbout(true)}>ℹ️ Comment ça marche</Button>
          </div>
        </div>

        {/* Scenario */}
        <Card className="border-slate-700 bg-slate-800">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-slate-100 flex items-center gap-2"><Network className="w-5 h-5" /> Scénario</CardTitle>
              <div className="flex items-center gap-2">
                <div className="hidden md:block text-xs text-slate-400 mr-2">
                  {scenario.attacker.ip}:{scenario.attacker.socksPort} → {scenario.pivot1?.ip || '—'} {scenario.pivot2 ? `→ ${scenario.pivot2.ip}` : ''} → {scenario.target.ip} ({scenario.target.subnet})
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="bg-blue-600 hover:bg-blue-700 text-white border-blue-600"
                  onClick={() => toast.success('Commandes générées')}
                >
                  🚀 Générer les commandes
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="bg-slate-700 border-slate-600 text-slate-200 hover:bg-slate-600"
                  onClick={() => setExpanded((e) => ({...e, scenario: !e.scenario}))}
                >
                  {expanded.scenario ? 'Masquer' : 'Modifier'}
                </Button>
              </div>
            </div>
          </CardHeader>
          {expanded.scenario && (
          <CardContent>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Attacker */}
              <Card className="border-slate-700 bg-slate-800">
                <CardHeader>
                  <CardTitle className="text-slate-100">Attaquant</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div>
                    <label className="text-sm text-slate-400">IP</label>
                    <Input value={scenario.attacker.ip} onChange={(e) => setScenario((s) => ({...s, attacker: {...s.attacker, ip: e.target.value}}))} className="mt-1 h-9 bg-slate-700 border-slate-600 text-slate-100" />
                  </div>
                  <div>
                    <label className="text-sm text-slate-400">SOCKS port</label>
                    <Input value={scenario.attacker.socksPort} onChange={(e) => setScenario((s) => ({...s, attacker: {...s.attacker, socksPort: e.target.value}}))} className="mt-1 h-9 bg-slate-700 border-slate-600 text-slate-100" />
                  </div>
                </CardContent>
              </Card>

              {/* Pivot-1 */}
              <Card className="border-slate-700 bg-slate-800">
                <CardHeader>
                  <CardTitle className="text-slate-100">Pivot-1</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    <div>
                      <label className="text-sm text-slate-400">IP</label>
                      <Input value={scenario.pivot1?.ip || ''} onChange={(e) => setScenario((s) => ({...s, pivot1: s.pivot1 ? {...s.pivot1, ip: e.target.value} : null}))} className="mt-1 h-9 bg-slate-700 border-slate-600 text-slate-100" />
                    </div>
                    <div>
                      <label className="text-sm text-slate-400">Utilisateur SSH</label>
                      <Input value={scenario.pivot1?.sshUser || ''} onChange={(e) => setScenario((s) => ({...s, pivot1: s.pivot1 ? {...s.pivot1, sshUser: e.target.value} : null}))} className="mt-1 h-9 bg-slate-700 border-slate-600 text-slate-100" />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 items-end">
                    <div>
                      <label className="text-sm text-slate-400">OS</label>
                      <Select value={scenario.pivot1?.os || 'linux'} onValueChange={(v: OSEnum) => setScenario((s) => ({...s, pivot1: s.pivot1 ? {...s.pivot1, os: v} : null}))}>
                        <SelectTrigger className="mt-1 h-9 bg-slate-700 border-slate-600 text-slate-100"><SelectValue /></SelectTrigger>
                        <SelectContent className="bg-slate-800 border-slate-600">
                          <SelectItem value="linux">Linux</SelectItem>
                          <SelectItem value="windows">Windows</SelectItem>
                          <SelectItem value="macos">macOS</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-sm text-slate-400">SSH</label>
                      <Select value={scenario.pivot1?.hasSSH ? 'yes' : 'no'} onValueChange={(v: 'yes'|'no') => setScenario((s) => ({...s, pivot1: s.pivot1 ? {...s.pivot1, hasSSH: v==='yes'} : null}))}>
                        <SelectTrigger className="mt-1 h-9 bg-slate-700 border-slate-600 text-slate-100"><SelectValue /></SelectTrigger>
                        <SelectContent className="bg-slate-800 border-slate-600">
                          <SelectItem value="yes">Oui</SelectItem>
                          <SelectItem value="no">Non</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-sm text-slate-400">Agent (ligolo/chisel)</label>
                      <Select value={scenario.pivot1?.canRunAgent ? 'yes' : 'no'} onValueChange={(v: 'yes'|'no') => setScenario((s) => ({...s, pivot1: s.pivot1 ? {...s.pivot1, canRunAgent: v==='yes'} : null}))}>
                        <SelectTrigger className="mt-1 h-9 bg-slate-700 border-slate-600 text-slate-100"><SelectValue /></SelectTrigger>
                        <SelectContent className="bg-slate-800 border-slate-600">
                          <SelectItem value="yes">Oui</SelectItem>
                          <SelectItem value="no">Non</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Pivot-2 (optionnel) */}
              <Card className="border-slate-700 bg-slate-800">
                <CardHeader>
                  <CardTitle className="text-slate-100">Pivot-2 (optionnel)</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    <div>
                      <label className="text-sm text-slate-400">IP</label>
                      <Input value={scenario.pivot2?.ip || ''} onChange={(e) => setScenario((s) => ({...s, pivot2: s.pivot2 ? {...s.pivot2, ip: e.target.value} : { label: 'Pivot-2', ip: e.target.value, os: 'linux', hasSSH: true, canRunAgent: true, sshUser: 'user' }}))} className="mt-1 h-9 bg-slate-700 border-slate-600 text-slate-100" />
                    </div>
                    <div>
                      <label className="text-sm text-slate-400">Utilisateur SSH</label>
                      <Input value={scenario.pivot2?.sshUser || ''} onChange={(e) => setScenario((s) => ({...s, pivot2: s.pivot2 ? {...s.pivot2, sshUser: e.target.value} : { label: 'Pivot-2', ip: '', os: 'linux', hasSSH: true, canRunAgent: true, sshUser: e.target.value }}))} className="mt-1 h-9 bg-slate-700 border-slate-600 text-slate-100" />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 items-end">
                    <div>
                      <label className="text-sm text-slate-400">OS</label>
                      <Select value={scenario.pivot2?.os || 'linux'} onValueChange={(v: OSEnum) => setScenario((s) => ({...s, pivot2: s.pivot2 ? {...s.pivot2, os: v} : { label: 'Pivot-2', ip: '', os: v, hasSSH: true, canRunAgent: true, sshUser: 'user' }}))}>
                        <SelectTrigger className="mt-1 h-9 bg-slate-700 border-slate-600 text-slate-100"><SelectValue /></SelectTrigger>
                        <SelectContent className="bg-slate-800 border-slate-600">
                          <SelectItem value="linux">Linux</SelectItem>
                          <SelectItem value="windows">Windows</SelectItem>
                          <SelectItem value="macos">macOS</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-sm text-slate-400">SSH</label>
                      <Select value={scenario.pivot2?.hasSSH ? 'yes' : 'no'} onValueChange={(v: 'yes'|'no') => setScenario((s) => ({...s, pivot2: s.pivot2 ? {...s.pivot2, hasSSH: v==='yes'} : { label: 'Pivot-2', ip: '', os: 'linux', hasSSH: v==='yes', canRunAgent: true, sshUser: 'user' }}))}>
                        <SelectTrigger className="mt-1 h-9 bg-slate-700 border-slate-600 text-slate-100"><SelectValue /></SelectTrigger>
                        <SelectContent className="bg-slate-800 border-slate-600">
                          <SelectItem value="yes">Oui</SelectItem>
                          <SelectItem value="no">Non</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-sm text-slate-400">Agent (ligolo/chisel)</label>
                      <Select value={scenario.pivot2?.canRunAgent ? 'yes' : 'no'} onValueChange={(v: 'yes'|'no') => setScenario((s) => ({...s, pivot2: s.pivot2 ? {...s.pivot2, canRunAgent: v==='yes'} : { label: 'Pivot-2', ip: '', os: 'linux', hasSSH: true, canRunAgent: v==='yes', sshUser: 'user' }}))}>
                        <SelectTrigger className="mt-1 h-9 bg-slate-700 border-slate-600 text-slate-100"><SelectValue /></SelectTrigger>
                        <SelectContent className="bg-slate-800 border-slate-600">
                          <SelectItem value="yes">Oui</SelectItem>
                          <SelectItem value="no">Non</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Target */}
              <Card className="border-slate-700 bg-slate-800">
                <CardHeader>
                  <CardTitle className="text-slate-100">Cible</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    <div>
                      <label className="text-sm text-slate-400">IP</label>
                      <Input value={scenario.target.ip} onChange={(e) => setScenario((s) => ({...s, target: {...s.target, ip: e.target.value}}))} className="mt-1 h-9 bg-slate-700 border-slate-600 text-slate-100" />
                    </div>
                    <div>
                      <label className="text-sm text-slate-400">Sous-réseau</label>
                      <Input value={scenario.target.subnet} onChange={(e) => setScenario((s) => ({...s, target: {...s.target, subnet: e.target.value}}))} className="mt-1 h-9 bg-slate-700 border-slate-600 text-slate-100" />
                    </div>
                  </div>
                  <div>
                    <label className="text-sm text-slate-400">Stratégie</label>
                    <Select value={scenario.strategy} onValueChange={(v: any) => setScenario((s) => ({...s, strategy: v}))}>
                      <SelectTrigger className="mt-1 h-9 bg-slate-700 border-slate-600 text-slate-100"><SelectValue /></SelectTrigger>
                      <SelectContent className="bg-slate-800 border-slate-600">
                        <SelectItem value="auto">Auto (recommandé)</SelectItem>
                        <SelectItem value="ssh">SSH</SelectItem>
                        <SelectItem value="ligolo">Ligolo-ng</SelectItem>
                        <SelectItem value="chisel">Chisel</SelectItem>
                        <SelectItem value="sshuttle">sshuttle</SelectItem>
                        <SelectItem value="socat">socat</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>
            </div>
          </CardContent>
          )}
        </Card>
      </div>

      <InfoModal open={about} onClose={() => setAbout(false)} title="Pivot Master – principes techniques">
        <ul className="list-disc ml-5 space-y-1">
          <li><strong>UI</strong>: React + Tailwind; cartes pour scénarios et commandes.</li>
          <li><strong>Génération</strong>: commandes SSH, ligolo, chisel, etc., construites à partir des champs.</li>
          <li><strong>État</strong>: React state; pas de backend.</li>
          <li><strong>Export</strong>: simple copie et affichage; à compléter avec templates.</li>
        </ul>
      </InfoModal>

      {/* Commandes */}
      <div className="main-content">
        <div className="content-area">
          <div className="content-main p-6 space-y-6">
            <SectionHeader title="🧰 Commandes & Chaîne de pivot" onToggle={() => setExpanded((e) => ({...e, cmds: !e.cmds}))} open={expanded.cmds} />
            {expanded.cmds && (
              <div className="space-y-6">
                {cmds.map((group, gi) => (
                  <Card key={gi} className="border-slate-700 bg-slate-800">
                    <CardHeader>
                      <CardTitle className="text-slate-100">{group.title}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {group.blocks.map((blk, bi) => (
                        <div key={bi} className="bg-slate-700/30 rounded border border-slate-600">
                          <div className="flex items-center justify-between px-2 py-1 border-b border-slate-700">
                            <span className="text-xs text-slate-400">{blk.label}</span>
                          </div>
                          {blk.lines.map((line, li) => (
                            <div key={li} className="flex items-center justify-between gap-2 px-2">
                              <pre className="flex-1 p-2 text-xs text-slate-200 overflow-x-auto"><code>{line}</code></pre>
                              <Button variant="outline" size="sm" className="px-2 h-7 bg-slate-700 border-slate-600 text-slate-200" onClick={() => copy(line)}><Copy className="w-3 h-3" /></Button>
                            </div>
                          ))}
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {/* Conseils & Aide */}
            <SectionHeader title="🧭 Aide & Conseils" onToggle={() => setExpanded((e) => ({...e, tips: !e.tips}))} open={expanded.tips} />
            {expanded.tips && (
              <Card className="border-slate-700 bg-slate-800">
                <CardContent className="p-4 space-y-2 text-sm text-slate-300">
                  <ul className="list-disc ml-5 space-y-1">
                    <li>SSH: préférez ProxyJump (<code>-J</code>) pour chaîner les bastions; <code>-D</code> pour un SOCKS dynamique; <code>-L</code>/<code>-R</code> pour du port-forward.</li>
                    <li>Ligolo-ng: démarrez le proxy sur l’attaquant, l’agent sur le pivot; activez <code>tun</code> dans le proxy puis ajoutez une route vers le sous-réseau cible.</li>
                    <li>Chisel: utilisez un serveur côté attaquant avec <code>--reverse</code> et un client côté pivot pour exposer un SOCKS sur la machine d’attaque.</li>
                    <li>sshuttle: pratique pour le routage IP “transparent” quand SSH est dispo, sans config iptables côté pivot.</li>
                    <li>Proxychains: placez <code>socks5 127.0.0.1 {scenario.attacker.socksPort}</code> dans la section <code>[ProxyList]</code>.</li>
                    <li>Segmentation: testez ICMP/TCP/UDP; si DNS bloqué, utilisez IP directes; pensez aux MTU/TUN et à la fragmentation.</li>
                  </ul>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PivotMasterPage;


