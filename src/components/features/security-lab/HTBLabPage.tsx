import React, { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useHTBStore, HTBProject, HTBService } from '@/stores/htbStore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Upload, Download, FileText, ListTodo, Network, Target, Shield, ClipboardPaste, Trash2, Trophy, Timer, Filter } from 'lucide-react';
import { ExploitationModal } from '@/components/features/host-manager/ExploitationModal';
import { ResponsiveContainer, LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip, Legend, PieChart, Pie, Cell } from 'recharts';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import { saveImageBlob, getImageObjectURL } from '@/utils/imgStore';
import 'highlight.js/styles/github-dark.css';

function parseNmapSimple(nmapText: string): HTBService[] {
  const lines = nmapText.split(/\r?\n/);
  const services: HTBService[] = [];
  const re = /^(\d+)\/(tcp|udp)\s+(open|closed|filtered|open\|filtered)\s+([\w\-\?\._]+)(?:\s+(.*))?$/i;
  for (const line of lines) {
    const m = line.match(re);
    if (m) services.push({ port: Number(m[1]), proto: m[2] as any, service: m[4], version: m[5]?.trim() });
  }
  return services.sort((a, b) => a.port - b.port);
}

function generateMarkdownFromProject(p: HTBProject): string {
  const servicesMd = (p.services || []).map((s) => `### ${s.port}/${s.proto} - ${s.service}\n\n- Version: ${s.version || 'N/A'}\n- Notes:\n${s.notes || ''}\n`).join('\n');
  return `# ${p.name}\n\n- IP: ${p.ip || ''}\n- OS: ${p.os || ''}\n- Gravité: ${p.severity || 'medium'}\n- Tags: ${p.tags?.join(', ') || ''}\n\n## Résumé Exécutif\n\nObjectifs: ${p.objectives || ''}\n\n## Reconnaissance\n\n${servicesMd || '_Aucun service parsé._'}\n\n## Accès Initial\n\n${p.potentialVectors.map(v=>`- ${v.level === 'red' ? '🔴' : v.level === 'yellow' ? '🟡' : '🟢'} ${v.label}${v.note ? ` — ${v.note}`:''}`).join('\n')}\n\n### Credentials\n\n- Users: ${p.usernames.length}\n- Passwords: ${p.passwords.length}\n- Hashes: ${p.hashes.length}\n\n## Élévation de Privilèges\n\n${p.privescChecklist.filter(c=>c.done).map(c=>`- [x] ${c.label}`).join('\n')}\n\n## Post-Exploitation\n\n- Persistance:\n${p.persistenceNotes || ''}\n\n- Mouvement latéral:\n${p.lateralMoves.map(m=>`- ${m.target} (${m.method || ''}) ${m.note? '— '+m.note:''}`).join('\n')}\n`;
}

export const StandalonePlaygroundPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { profile, addProject, updateProject, deleteProject, selectProject, exportProfile, importProfile, exportProject, importProject, closeProject } = useHTBStore();
  const projectParam = searchParams.get('project') || undefined;
  const selected = projectParam ? profile.projects[projectParam] : undefined;
  const [detailTab, setDetailTab] = useState<'recon'|'initial'|'privesc'|'post'|'writeup'>('recon');
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [newProjName, setNewProjName] = useState('Nouvelle Box');
  const [newProjUrl, setNewProjUrl] = useState('');
  const [exploitModalOpen, setExploitModalOpen] = useState(false);
  const [editingStep, setEditingStep] = useState<any>(null);
  const [serviceNotesOpen, setServiceNotesOpen] = useState(false);
  const [serviceIdx, setServiceIdx] = useState<number | null>(null);
  const [serviceNotesDraft, setServiceNotesDraft] = useState('');
  const [servicePageIdx, setServicePageIdx] = useState<number>(0); // 0 = page principale (notes), >=1 = notesPages[idx-1]
  const [serviceNotesLayout, setServiceNotesLayout] = useState<'split'|'edit'|'preview'>('split');
  const [serviceNotesFullscreen, setServiceNotesFullscreen] = useState(false);

  // Dashboard helpers
  const projects = Object.values(profile.projects);
  const stats = useMemo(() => {
    const total = projects.length;
    const linux = projects.filter(p=> (p.os||'').toLowerCase().includes('linux')).length;
    const windows = projects.filter(p=> (p.os||'').toLowerCase().includes('win')).length;
    const pwnedByDate = projects
      .filter(p=>p.pwnedAt)
      .map(p=> ({ date: (p.pwnedAt as string).slice(0,10) }))
      .sort((a,b)=> a.date.localeCompare(b.date));
    const cumulative: Array<{ date: string; count: number }> = [];
    let acc = 0; let last='';
    for (const d of pwnedByDate) {
      if (d.date !== last) { acc += projects.filter(p=> p.pwnedAt?.slice(0,10) === d.date).length; cumulative.push({ date: d.date, count: acc }); last = d.date; }
    }
    return { total, linux, windows, cumulative };
  }, [projects]);

  // Writeup content
  const generatedMarkdown = useMemo(() => selected ? generateMarkdownFromProject(selected) : '', [selected]);
  const writeupEffective = selected?.writeupMarkdown || generatedMarkdown;

  async function handleCreateProject() {
    const id = addProject({ name: newProjName });
    selectProject(id);
    setSearchParams({ project: id });
    setCreateModalOpen(false);
    if (newProjUrl) {
      try {
        const resp = await fetch(newProjUrl, { mode: 'cors' });
        const html = await resp.text();
        const avatarRegex = /https?:\/\/htb-mp-prod-public-storage[^\s"']+avatars[^\s"']+\.png/ig;
        const avatarUrl = (html.match(avatarRegex) || [])[0] || '';
        const osMatch = html.match(/Operating\s*System[^<]*<[^>]*>\s*([A-Za-z]+)/i);
        const diffMatch = html.match(/Difficulty[^<]*<[^>]*>\s*([A-Za-z]+)/i);
        const summaryMatch = html.match(/<meta\s+name=\"description\"\s+content=\"([^\"]+)/i);
        let avatarDataUrl = '';
        if (avatarUrl) {
          const imgResp = await fetch(avatarUrl);
          const blob = await imgResp.blob();
          avatarDataUrl = await new Promise<string>((resolve) => { const r = new FileReader(); r.onloadend = () => resolve(r.result as string); r.readAsDataURL(blob); });
        }
        updateProject(id, { htbUrl: newProjUrl, avatarUrl, avatarDataUrl, os: osMatch?.[1] || undefined, difficultyLabel: diffMatch?.[1] || undefined, summary: summaryMatch?.[1] || undefined });
      } catch {
        updateProject(id, { htbUrl: newProjUrl });
      }
    }
    setNewProjName('Nouvelle Box');
    setNewProjUrl('');
  }

  return (
    <div className="app-layout">
      <div className="main-header p-6">
        <div className="flex-between mb-6">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="AuditMapper" className="w-8 h-8 rounded-lg opacity-80" />
            <div>
              <h1 className="text-2xl font-bold text-slate-100">Standalone Playground</h1>
              <p className="text-slate-400 text-sm">Tableau de bord et espace de travail orienté CTF</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              className="bg-slate-700 border-slate-600 text-slate-200 hover:bg-slate-600"
              onClick={() => {
                const data = exportProfile();
                const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url; a.download = `htb_profile_${new Date().toISOString().slice(0,10)}.json`;
                document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
              }}
            >
              <Download className="w-4 h-4 mr-2" /> Export Profil
            </Button>
            <Button
              variant="outline"
              className="bg-slate-700 border-slate-600 text-slate-200 hover:bg-slate-600"
              onClick={() => setCreateModalOpen(true)}
            >
              <Plus className="w-4 h-4 mr-2" /> Nouveau Projet
            </Button>
            <Button
              variant="outline"
              className="bg-slate-700 border-slate-600 text-slate-200 hover:bg-slate-600"
              onClick={async () => {
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = 'application/json';
                input.onchange = async () => {
                  const file = input.files?.[0];
                  if (!file) return;
                  const text = await file.text();
                  try { importProject(JSON.parse(text)); } catch { alert('JSON invalide'); }
                };
                input.click();
              }}
            >
              <Upload className="w-4 h-4 mr-2" /> Import Projet (.project.json)
            </Button>
            <Button
              variant="outline"
              className="bg-slate-700 border-slate-600 text-slate-200 hover:bg-slate-600"
              onClick={async () => {
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = 'application/json';
                input.onchange = async () => {
                  const file = input.files?.[0];
                  if (!file) return;
                  const text = await file.text();
                  try { importProfile(JSON.parse(text)); } catch { alert('JSON invalide'); }
                };
                input.click();
              }}
            >
              <Upload className="w-4 h-4 mr-2" /> Import Profil
            </Button>
          </div>
        </div>

        {!selected && (
          <div className="flex items-center gap-2 border-b border-slate-700">
            <span className="text-slate-400 text-sm">Dashboard</span>
          </div>
        )}
        {selected && (
          <div className="flex items-center justify-between border-b border-slate-700">
            <div className="flex items-center gap-2">
              <button onClick={() => { setSearchParams({}); }} className="text-slate-300 hover:text-white text-sm">← Retour</button>
              <div className="text-slate-200 font-semibold">{selected.name}</div>
            </div>
            <div className="flex items-center gap-2">
              {(['recon','initial','privesc','post','writeup'] as const).map(t => (
                <button key={t} onClick={() => setDetailTab(t)} className={`px-3 py-2 text-sm ${detailTab === t ? 'text-slate-100 border-b-2 border-blue-500' : 'text-slate-400'}`}>{t === 'recon' ? 'Recon' : t === 'initial' ? 'Accès' : t === 'privesc' ? 'Privesc' : t === 'post' ? 'Post-Exploitation' : 'Writeup'}</button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="main-content">
        <div className="content-area">
          <div className="content-main p-6 space-y-6">
            {/* Dashboard */}
            {!selected && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <Card className="lg:col-span-2 border-slate-700 bg-slate-800">
                  <CardHeader>
                    <CardTitle className="text-slate-100">Projets</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {projects.length === 0 ? (
                      <div className="text-slate-400">Aucun projet. Créez votre première box HTB.</div>
                    ) : (
                      <div className="grid md:grid-cols-2 gap-3">
                        {projects.map((p) => (
                          <div key={p.id} className="p-3 rounded border border-slate-700 bg-slate-900/40 hover:border-slate-500 transition-colors">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                {p.avatarDataUrl ? (
                                  <img src={p.avatarDataUrl} alt={p.name} className="w-10 h-10 rounded" />
                                ) : (
                                  <div className="w-10 h-10 rounded bg-slate-700 flex items-center justify-center text-slate-300">HTB</div>
                                )}
                                <div className="text-slate-100 font-semibold">{p.name}</div>
                                <div className="text-xs text-slate-400">{p.ip || '—'} {p.os ? `• ${p.os}`: ''} {p.difficultyLabel ? `• ${p.difficultyLabel}`: ''}</div>
                              </div>
                              <div className="flex gap-2">
                                <Button size="sm" variant="outline" className="bg-slate-700 border-slate-600 text-slate-200 hover:bg-slate-600" onClick={() => setSearchParams({ project: p.id })}>Ouvrir</Button>
                                {!p.closed && <Button size="sm" variant="outline" className="bg-emerald-700 border-emerald-600 text-emerald-100 hover:bg-emerald-600" onClick={() => closeProject(p.id)}><Trophy className="w-3 h-3 mr-1" /> Clôturer</Button>}
                                <Button size="sm" variant="outline" className="bg-slate-700 border-slate-600 text-slate-200 hover:bg-slate-600" onClick={() => {
                                  const data = exportProject(p.id);
                                  if (!data) return;
                                  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                                  const url = URL.createObjectURL(blob);
                                  const a = document.createElement('a');
                                  a.href = url; a.download = `${p.name.replace(/\s+/g,'_')}.project.json`;
                                  document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
                                }}>Export</Button>
                                <Button size="sm" variant="outline" className="bg-red-700 border-red-600 text-red-200 hover:bg-red-600" onClick={() => deleteProject(p.id)}><Trash2 className="w-3 h-3" /></Button>
                              </div>
                            </div>
                            <div className="mt-2 text-xs text-slate-300 flex items-center gap-4">
                              <span className="flex items-center gap-1"><ListTodo className="w-3 h-3" /> {p.tasks.filter(t=>t.status!=='done').length} tâches en cours</span>
                              {p.pwnedAt && <span className="flex items-center gap-1"><Trophy className="w-3 h-3 text-yellow-400" /> pwned {new Date(p.pwnedAt).toLocaleDateString('fr-FR')}</span>}
                              <span className="flex items-center gap-1"><Timer className="w-3 h-3" /> {(Math.round((p.timeSpentSeconds||0)/3600))}h</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
                {/* Mood of the day card */}
                <Card className="border-slate-700 bg-slate-800">
                  <CardHeader>
                    <CardTitle className="text-slate-100">Mood of the day</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="w-full flex flex-col items-center">
                      <div className="relative w-full aspect-square max-w-[220px] rounded-md border border-slate-700 bg-slate-900/40 overflow-hidden">
                        <img
                          src={(() => {
                            const now = new Date();
                            const start = new Date(now); start.setDate(now.getDate() - 7);
                            const doneLast7 = projects.filter(p => p.createdAt >= start.toISOString()).length;
                            if (doneLast7 >= 3) return '/4.png';
                            if (doneLast7 === 2) return '/3.png';
                            if (doneLast7 === 1) return '/1.png';
                            return '/2.png';
                          })()}
                          alt="mood"
                          className="absolute inset-0 w-full h-full object-contain p-2"
                        />
                      </div>
                      <div className="text-center mt-2 text-slate-300 text-sm">
                        {(() => {
                          const now = new Date();
                          const start = new Date(now); start.setDate(now.getDate() - 7);
                          const count = projects.filter(p => p.createdAt >= start.toISOString()).length;
                          if (count >= 3) return 'God Mode: 3+ projets cette semaine';
                          if (count === 2) return 'On Fire: 2 projets cette semaine';
                          if (count === 1) return 'Happy: 1 projet cette semaine';
                          return 'Sad: 0 projet cette semaine';
                        })()}
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="lg:col-span-3 border-slate-700 bg-slate-800">
                  <CardHeader>
                    <CardTitle className="text-slate-100">Statistiques</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid md:grid-cols-3 gap-4">
                      <div className="p-3 rounded border border-slate-700 bg-slate-900/40">
                        <div className="text-slate-400 text-sm">Total</div>
                        <div className="text-2xl text-slate-100 font-semibold">{stats.total}</div>
                      </div>
                      <div className="p-3 rounded border border-slate-700 bg-slate-900/40">
                        <div className="text-slate-400 text-sm">Linux</div>
                        <div className="text-2xl text-slate-100 font-semibold">{stats.linux}</div>
                      </div>
                      <div className="p-3 rounded border border-slate-700 bg-slate-900/40">
                        <div className="text-slate-400 text-sm">Windows</div>
                        <div className="text-2xl text-slate-100 font-semibold">{stats.windows}</div>
                      </div>
                    </div>
                    <div className="grid md:grid-cols-2 gap-4 mt-4">
                      <div className="h-64 bg-slate-900/40 rounded border border-slate-700 p-2">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={stats.cumulative} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                            <XAxis dataKey="date" stroke="#94a3b8" />
                            <YAxis stroke="#94a3b8" allowDecimals={false} />
                            <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #334155', color: '#e2e8f0' }} />
                            <Legend />
                            <Line type="monotone" dataKey="count" name="Boxes pwnées" stroke="#60a5fa" strokeWidth={2} dot={{ r: 2 }} />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="h-64 bg-slate-900/40 rounded border border-slate-700 p-2 flex items-center justify-center">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie data={[{name:'Linux', value: stats.linux},{name:'Windows', value: stats.windows}]} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                              <Cell fill="#22c55e" />
                              <Cell fill="#60a5fa" />
                            </Pie>
                            <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #334155', color: '#e2e8f0' }} />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Historique des boxes */}
                <Card className="lg:col-span-3 border-slate-700 bg-slate-800">
                  <CardHeader>
                    <CardTitle className="text-slate-100 flex items-center gap-2"><Filter className="w-4 h-4" /> Historique</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap items-end gap-3 mb-3">
                      <div>
                        <label className="text-sm text-slate-400">Filtrer par OS</label>
                        <Select onValueChange={(v)=> setSearchParams(prev=>{ const np=new URLSearchParams(prev); if(v==='all') np.delete('os'); else np.set('os', v); return np; })}>
                          <SelectTrigger className="bg-slate-700 border-slate-600 text-slate-100"><SelectValue placeholder="Tous" /></SelectTrigger>
                          <SelectContent className="bg-slate-800 border-slate-600">
                            <SelectItem value="all">Tous</SelectItem>
                            <SelectItem value="linux">Linux</SelectItem>
                            <SelectItem value="windows">Windows</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <label className="text-sm text-slate-400">Par difficulté</label>
                        <Select onValueChange={(v)=> setSearchParams(prev=>{ const np=new URLSearchParams(prev); if(v==='all') np.delete('diff'); else np.set('diff', v); return np; })}>
                          <SelectTrigger className="bg-slate-700 border-slate-600 text-slate-100"><SelectValue placeholder="Toutes" /></SelectTrigger>
                          <SelectContent className="bg-slate-800 border-slate-600">
                            <SelectItem value="all">Toutes</SelectItem>
                            <SelectItem value="Easy">Easy</SelectItem>
                            <SelectItem value="Medium">Medium</SelectItem>
                            <SelectItem value="Hard">Hard</SelectItem>
                            <SelectItem value="Insane">Insane</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <label className="text-sm text-slate-400">Par nom</label>
                        <Input placeholder="Rechercher..." className="bg-slate-700 border-slate-600 text-slate-100" onChange={(e)=> setSearchParams(prev=>{ const np=new URLSearchParams(prev); const v=e.target.value.trim(); if(!v) np.delete('q'); else np.set('q', v); return np; })} />
                      </div>
                    </div>
                    <div className="grid md:grid-cols-3 gap-3">
                      {projects
                        .filter(p=> p.closed)
                        .filter(p=> {
                          const q = searchParams.get('q')?.toLowerCase() || '';
                          return !q || p.name.toLowerCase().includes(q);
                        })
                        .filter(p=> {
                          const os = (searchParams.get('os')||'').toLowerCase();
                          if (!os) return true;
                          return (p.os||'').toLowerCase().includes(os);
                        })
                        .filter(p=> {
                          const d = searchParams.get('diff');
                          if (!d) return true;
                          if (d==='all') return true;
                          return (p.difficultyLabel||'') === d;
                        })
                        .sort((a,b)=> (b.closedAt||'').localeCompare(a.closedAt||''))
                        .map(p=> (
                        <div key={p.id} className="p-3 rounded border border-slate-700 bg-slate-900/40">
                          <div className="flex items-center gap-3">
                            {p.avatarDataUrl ? <img src={p.avatarDataUrl} className="w-8 h-8 rounded" /> : <div className="w-8 h-8 bg-slate-700 rounded" />}
                            <div className="flex-1">
                              <div className="text-slate-100 text-sm font-medium">{p.name}</div>
                              <div className="text-xs text-slate-400">{p.os || '—'} {p.difficultyLabel ? `• ${p.difficultyLabel}` : ''} {p.closedAt ? `• ${new Date(p.closedAt).toLocaleDateString('fr-FR')}` : ''}</div>
                            </div>
                            <Button size="sm" variant="outline" className="bg-slate-700 border-slate-600 text-slate-200 hover:bg-slate-600" onClick={()=> setSearchParams({ project: p.id })}>Voir</Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Recon & Enumeration */}
            {selected && detailTab === 'recon' && (
              <div className="space-y-4">
                <Card className="border-slate-700 bg-slate-800">
                  <CardHeader>
                    <CardTitle className="text-slate-100 flex items-center gap-2"><Target className="w-4 h-4" /> Projet</CardTitle>
                  </CardHeader>
                  <CardContent className="grid md:grid-cols-3 gap-3">
                    <div>
                      <label className="text-sm text-slate-400">Nom</label>
                      <Input value={selected.name} onChange={(e)=>updateProject(selected.id,{ name: e.target.value })} className="mt-1 bg-slate-700 border-slate-600 text-slate-100" />
                    </div>
                    <div>
                      <label className="text-sm text-slate-400">IP</label>
                      <Input value={selected.ip||''} onChange={(e)=>updateProject(selected.id,{ ip: e.target.value })} className="mt-1 bg-slate-700 border-slate-600 text-slate-100" />
                    </div>
                    <div>
                      <label className="text-sm text-slate-400">OS</label>
                      <Input value={selected.os||''} onChange={(e)=>updateProject(selected.id,{ os: e.target.value })} className="mt-1 bg-slate-700 border-slate-600 text-slate-100" />
                    </div>
                  </CardContent>
                </Card>
                <div className="grid lg:grid-cols-2 gap-4">
                  <Card className="border-slate-700 bg-slate-800">
                    <CardHeader>
                      <CardTitle className="text-slate-100">Reconnaissance passive</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid md:grid-cols-2 gap-3">
                        <Textarea rows={8} value={selected.passiveNotes} onChange={(e)=>updateProject(selected.id,{ passiveNotes: e.target.value })} className="w-full bg-slate-700 border-slate-600 text-slate-100" placeholder="Domaines, emails, infos publiques…" />
                        <div className="space-y-2 text-sm text-slate-300">
                          <div className="text-slate-200 font-medium">Raccourcis utiles</div>
                          <code className="block bg-slate-900 border border-slate-700 rounded px-2 py-1">whatweb http://{selected.ip || 'TARGET'}</code>
                          <code className="block bg-slate-900 border border-slate-700 rounded px-2 py-1">curl -I http://{selected.ip || 'TARGET'}</code>
                          <code className="block bg-slate-900 border border-slate-700 rounded px-2 py-1">theHarvester -d example.com -b all</code>
                          <code className="block bg-slate-900 border border-slate-700 rounded px-2 py-1">shodan host {selected.ip || 'TARGET'}</code>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="border-slate-700 bg-slate-800">
                    <CardHeader>
                      <CardTitle className="text-slate-100">Nmap</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="grid md:grid-cols-2 gap-3">
                        <Textarea rows={8} value={selected.nmapRaw} onChange={(e)=>updateProject(selected.id,{ nmapRaw: e.target.value })} className="w-full bg-slate-700 border-slate-600 text-slate-100" placeholder="Collez la section PORT STATE SERVICE VERSION" />
                        <div className="space-y-2 text-sm text-slate-300">
                          <div className="text-slate-200 font-medium">Scans rapides</div>
                          <code className="block bg-slate-900 border border-slate-700 rounded px-2 py-1">nmap -sV -sC {selected.ip || 'TARGET'}</code>
                          <code className="block bg-slate-900 border border-slate-700 rounded px-2 py-1">nmap -p- --min-rate 2000 -sS {selected.ip || 'TARGET'}</code>
                          <code className="block bg-slate-900 border border-slate-700 rounded px-2 py-1">nmap --script vuln {selected.ip || 'TARGET'}</code>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button className="bg-blue-600 hover:bg-blue-700" onClick={()=>{
                          const parsed = parseNmapSimple(selected.nmapRaw);
                          updateProject(selected.id,{ services: parsed });
                        }}>Analyser</Button>
                        <Button variant="outline" className="bg-slate-700 border-slate-600 text-slate-200 hover:bg-slate-600" onClick={()=>updateProject(selected.id,{ nmapRaw: '', services: [] })}>Effacer</Button>
                      </div>
                    </CardContent>
                  </Card>
                </div>
                <Card className="border-slate-700 bg-slate-800">
                  <CardHeader>
                    <CardTitle className="text-slate-100 flex items-center gap-2"><Network className="w-4 h-4" /> Services détectés</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {selected.services.length === 0 ? (
                      <div className="text-slate-400 text-sm">Aucun service.</div>
                    ) : (
                      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {selected.services.map((s, idx) => (
                          <div key={`${s.port}/${s.proto}-${idx}`} className="p-3 rounded border border-slate-700 bg-slate-900/40 hover:border-slate-500 transition-colors">
                            <div className="flex items-center justify-between mb-1">
                              <div className="text-slate-100 font-semibold">{s.port}/{s.proto} • {s.service}</div>
                              <Button size="sm" variant="outline" className="bg-slate-700 border-slate-600 text-slate-200 hover:bg-slate-600" onClick={() => {
                                const copy = [...selected.services]; copy.splice(idx,1); updateProject(selected.id,{ services: copy });
                              }}>Supprimer</Button>
                            </div>
                            <div className="text-xs text-slate-400">{s.version || '—'}</div>
                            {/* Preview & notes modal trigger */}
                            <div className="mt-2 flex items-center justify-between gap-2">
                              <div className="text-xs text-slate-300 line-clamp-2 flex-1 min-h-[2rem]">
                                {(s.notes && s.notes.trim()) ? s.notes : <span className="italic text-slate-500">Aucune note</span>}
                              </div>
                              <Button size="sm" variant="outline" className="bg-slate-700 border-slate-600 text-slate-200 hover:bg-slate-600" onClick={() => { setServiceIdx(idx); setServicePageIdx(0); setServiceNotesDraft(s.notes || ''); setServiceNotesOpen(true); }}>Ouvrir les notes</Button>
                            </div>
                            {s.service.toLowerCase().includes('http') && (
                              <div className="mt-2 text-xs text-slate-300 space-y-1">
                                <div className="font-medium">Suggestions:</div>
                                <code className="block bg-slate-900 border border-slate-700 rounded px-2 py-1">nikto -h http://{selected.ip || 'TARGET'}:{s.port}</code>
                                <code className="block bg-slate-900 border border-slate-700 rounded px-2 py-1">gobuster dir -u http://{selected.ip || 'TARGET'}:{s.port} -w /usr/share/wordlists/dirb/common.txt</code>
                              </div>
                            )}
                            {/* HackTricks links for common services */}
                            {(() => {
                              const map: Record<string,string> = {
                                smb: 'https://hacktricks.boitatech.com.br/pentesting/pentesting-smb',
                                ftp: 'https://hacktricks.boitatech.com.br/pentesting/pentesting-ftp',
                                ssh: 'https://hacktricks.boitatech.com.br/pentesting/pentesting-ssh',
                                rsh: 'https://hacktricks.boitatech.com.br/pentesting/pentesting-rsh',
                                rusersd: 'https://hacktricks.boitatech.com.br/pentesting/1026-pentesting-rusersd',
                                telnet: 'https://hacktricks.boitatech.com.br/pentesting/pentesting-telnet',
                                smtp: 'https://hacktricks.boitatech.com.br/pentesting/pentesting-smtp',
                                pop3: 'https://hacktricks.boitatech.com.br/pentesting/pentesting-pop',
                                imap: 'https://hacktricks.boitatech.com.br/pentesting/pentesting-imap',
                                ldap: 'https://hacktricks.boitatech.com.br/pentesting/pentesting-ldap',
                                http: 'https://hacktricks.boitatech.com.br/pentesting/pentesting-web',
                                https: 'https://hacktricks.boitatech.com.br/pentesting/pentesting-web',
                                mysql: 'https://hacktricks.boitatech.com.br/pentesting/pentesting-mysql',
                                mssql: 'https://hacktricks.boitatech.com.br/pentesting/pentesting-mssql-microsoft-sql-server',
                                postgres: 'https://hacktricks.boitatech.com.br/pentesting/postgres',
                                rdp: 'https://hacktricks.boitatech.com.br/pentesting/pentesting-rdp',
                                vnc: 'https://hacktricks.boitatech.com.br/pentesting/pentesting-vnc',
                                snmp: 'https://hacktricks.boitatech.com.br/pentesting/pentesting-snmp',
                                nfs: 'https://hacktricks.boitatech.com.br/pentesting/nfs-service',
                              };
                              const key = (s.service || '').toLowerCase();
                              const url = map[key];
                              return url ? (
                                <div className="mt-2 text-xs">
                                  <a className="text-sky-400 underline" href={url} target="_blank" rel="noreferrer">HackTricks: {key.toUpperCase()}</a>
                                </div>
                              ) : null;
                            })()}
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Initial Access */}
            {selected && detailTab === 'initial' && (
              <div className="grid lg:grid-cols-2 gap-4">
                <Card className="border-slate-700 bg-slate-800">
                  <CardHeader>
                    <CardTitle className="text-slate-100">Vecteurs d'attaque potentiels</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid md:grid-cols-4 gap-2">
                      <Input placeholder="Label" className="bg-slate-700 border-slate-600 text-slate-100" id="vecLabel" />
                      <Select defaultValue="yellow" onValueChange={(v:any)=>{ (document.getElementById('vecLevel') as any).value = v; }}>
                        <SelectTrigger className="bg-slate-700 border-slate-600 text-slate-100"><SelectValue /></SelectTrigger>
                        <SelectContent className="bg-slate-800 border-slate-600">
                          <SelectItem value="red">Rouge</SelectItem>
                          <SelectItem value="yellow">Jaune</SelectItem>
                          <SelectItem value="green">Vert</SelectItem>
                        </SelectContent>
                      </Select>
                      <Input placeholder="Note (optionnel)" className="bg-slate-700 border-slate-600 text-slate-100" id="vecNote" />
                      <input id="vecLevel" defaultValue="yellow" hidden />
                      <Button className="bg-blue-600 hover:bg-blue-700" onClick={()=>{
                        const label = (document.getElementById('vecLabel') as HTMLInputElement).value.trim();
                        const note = (document.getElementById('vecNote') as HTMLInputElement).value.trim();
                        const level = ((document.getElementById('vecLevel') as HTMLInputElement).value || 'yellow') as any;
                        if (!label) return;
                        updateProject(selected.id,{ potentialVectors: [...selected.potentialVectors, { label, level, note }] });
                        (document.getElementById('vecLabel') as HTMLInputElement).value='';
                        (document.getElementById('vecNote') as HTMLInputElement).value='';
                      }}>Ajouter</Button>
                    </div>
                    <div className="space-y-2">
                      {selected.potentialVectors.map((v, i) => (
                        <div key={i} className="flex items-center justify-between p-2 rounded bg-slate-700/40 border border-slate-600 text-sm">
                          <div className="flex items-center gap-2">
                            <span>{v.level === 'red' ? '🔴' : v.level === 'yellow' ? '🟡' : '🟢'}</span>
                            <span className="text-slate-100">{v.label}</span>
                            {v.note && <span className="text-slate-400">— {v.note}</span>}
                          </div>
                          <Button size="sm" variant="outline" className="bg-red-700 border-red-600 text-red-200 hover:bg-red-600" onClick={()=>{
                            const copy = [...selected.potentialVectors]; copy.splice(i,1); updateProject(selected.id,{ potentialVectors: copy });
                          }}><Trash2 className="w-3 h-3" /></Button>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
                <Card className="border-slate-700 bg-slate-800">
                  <CardHeader>
                    <CardTitle className="text-slate-100 flex items-center gap-2"><Shield className="w-4 h-4" /> Credentials</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid md:grid-cols-3 gap-2">
                      <Textarea rows={5} placeholder="usernames" className="bg-slate-700 border-slate-600 text-slate-100" value={selected.usernames.join('\n')} onChange={(e)=>updateProject(selected.id,{ usernames: e.target.value.split(/\r?\n/).filter(Boolean) })} />
                      <Textarea rows={5} placeholder="passwords" className="bg-slate-700 border-slate-600 text-slate-100" value={selected.passwords.join('\n')} onChange={(e)=>updateProject(selected.id,{ passwords: e.target.value.split(/\r?\n/).filter(Boolean) })} />
                      <Textarea rows={5} placeholder="hashes" className="bg-slate-700 border-slate-600 text-slate-100" value={selected.hashes.join('\n')} onChange={(e)=>updateProject(selected.id,{ hashes: e.target.value.split(/\r?\n/).filter(Boolean) })} />
                    </div>
                    {/* Journal supprimé ici car un container dédié se trouve plus bas */}
                  </CardContent>
                </Card>
                {/* Journal des exploits */}
                <Card className="lg:col-span-2 border-slate-700 bg-slate-800">
                  <CardHeader>
                    <CardTitle className="text-slate-100">Journal des exploits</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex justify-end mb-2">
                      <Button variant="outline" className="bg-slate-700 border-slate-600 text-slate-200 hover:bg-slate-600" onClick={()=> { setEditingStep(null); setExploitModalOpen(true); }}>+ Nouvelle étape</Button>
                    </div>
                    {selected.exploitLog.length === 0 ? (
                      <div className="text-slate-400 text-sm">Aucune entrée d'exploit.</div>
                    ) : (
                      <div className="space-y-2">
                        {selected.exploitLog.map((en, idx) => (
                          <div key={en.id} className="p-3 bg-slate-700/40 border border-slate-600 rounded">
                            <div className="flex items-center justify-between">
                              <div>
                                <div className="text-xs text-slate-400">{new Date(en.timestamp).toLocaleString('fr-FR')}</div>
                                <div className="text-slate-100 text-sm font-medium">{en.title}</div>
                              </div>
                              <div className="flex gap-2">
                                <Button size="sm" variant="outline" className="bg-slate-700 border-slate-600 text-slate-200 hover:bg-slate-600" onClick={()=> { setEditingStep({ ...en, severity: 'Medium', status: 'completed', createdAt: en.timestamp, updatedAt: en.timestamp, notes: '', screenshots: [] }); setExploitModalOpen(true); }}>Modifier</Button>
                                <Button size="sm" variant="outline" className="bg-red-700 border-red-600 text-red-200 hover:bg-red-600" onClick={()=>{
                                  const copy = [...selected.exploitLog]; copy.splice(idx,1); updateProject(selected.id,{ exploitLog: copy });
                                }}>Supprimer</Button>
                              </div>
                            </div>
                            {en.command && <pre className="mt-2 text-xs bg-slate-900 border border-slate-700 rounded p-2 text-slate-200 whitespace-pre-wrap">{en.command}</pre>}
                            {en.result && <pre className="mt-2 text-xs bg-slate-900 border border-slate-700 rounded p-2 text-slate-200 whitespace-pre-wrap">{en.result}</pre>}
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Privesc */}
            {selected && detailTab === 'privesc' && (
              <div className="grid lg:grid-cols-2 gap-4">
                <Card className="border-slate-700 bg-slate-800">
                  <CardHeader>
                    <CardTitle className="text-slate-100">Checklist Privesc</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex gap-2">
                      <Input placeholder="Nouvel item" className="bg-slate-700 border-slate-600 text-slate-100" id="peItem" />
                      <Button className="bg-blue-600 hover:bg-blue-700" onClick={()=>{
                        const val = (document.getElementById('peItem') as HTMLInputElement).value.trim(); if(!val) return;
                        updateProject(selected.id, { privescChecklist: [...selected.privescChecklist, { id: `${Date.now()}`, label: val, done: false }] });
                        (document.getElementById('peItem') as HTMLInputElement).value='';
                      }}>Ajouter</Button>
                    </div>
                    <div className="space-y-1">
                      {selected.privescChecklist.map((it, idx) => (
                        <div key={it.id} className="flex items-center justify-between p-2 bg-slate-700/40 border border-slate-600 rounded">
                          <label className="flex items-center gap-2 text-slate-100 text-sm">
                            <input type="checkbox" checked={it.done} onChange={(e)=>{
                              const next = [...selected.privescChecklist]; next[idx] = { ...next[idx], done: e.target.checked }; updateProject(selected.id,{ privescChecklist: next });
                            }} /> {it.label}
                          </label>
                          <Button size="sm" variant="outline" className="bg-red-700 border-red-600 text-red-200 hover:bg-red-600" onClick={()=>{
                            const copy = [...selected.privescChecklist]; copy.splice(idx,1); updateProject(selected.id,{ privescChecklist: copy });
                          }}><Trash2 className="w-3 h-3" /></Button>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
                <Card className="border-slate-700 bg-slate-800">
                  <CardHeader>
                    <CardTitle className="text-slate-100">Journal des exploits (Privesc)</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex justify-end mb-2">
                      <Button variant="outline" className="bg-slate-700 border-slate-600 text-slate-200 hover:bg-slate-600" onClick={()=> { setEditingStep(null); setExploitModalOpen(true); }}>+ Nouvelle étape</Button>
                    </div>
                    {selected.exploitLog.length === 0 ? (
                      <div className="text-slate-400 text-sm">Aucune entrée d'exploit.</div>
                    ) : (
                      <div className="space-y-2">
                        {selected.exploitLog.map((en, idx) => (
                          <div key={en.id} className="p-3 bg-slate-700/40 border border-slate-600 rounded">
                            <div className="flex items-center justify-between">
                              <div>
                                <div className="text-xs text-slate-400">{new Date(en.timestamp).toLocaleString('fr-FR')}</div>
                                <div className="text-slate-100 text-sm font-medium">{en.title}</div>
                              </div>
                              <div className="flex gap-2">
                                <Button size="sm" variant="outline" className="bg-slate-700 border-slate-600 text-slate-200 hover:bg-slate-600" onClick={()=> { setEditingStep({ ...en, severity: 'Medium', status: 'completed', createdAt: en.timestamp, updatedAt: en.timestamp, notes: '', screenshots: [] }); setExploitModalOpen(true); }}>Modifier</Button>
                                <Button size="sm" variant="outline" className="bg-red-700 border-red-600 text-red-200 hover:bg-red-600" onClick={()=>{
                                  const copy = [...selected.exploitLog]; copy.splice(idx,1); updateProject(selected.id,{ exploitLog: copy });
                                }}>Supprimer</Button>
                              </div>
                            </div>
                            {en.command && <pre className="mt-2 text-xs bg-slate-900 border border-slate-700 rounded p-2 text-slate-200 whitespace-pre-wrap">{en.command}</pre>}
                            {en.result && <pre className="mt-2 text-xs bg-slate-900 border border-slate-700 rounded p-2 text-slate-200 whitespace-pre-wrap">{en.result}</pre>}
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Post-Exploitation */}
            {selected && detailTab === 'post' && (
              <div className="grid lg:grid-cols-2 gap-4">
                <Card className="border-slate-700 bg-slate-800">
                  <CardHeader>
                    <CardTitle className="text-slate-100">Mouvement latéral</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex gap-2">
                      <Input placeholder="Cible (ip/host)" className="bg-slate-700 border-slate-600 text-slate-100" id="latTarget" />
                      <Input placeholder="Méthode (psexec, winrm, ssh...)" className="bg-slate-700 border-slate-600 text-slate-100" id="latMethod" />
                      <Button className="bg-blue-600 hover:bg-blue-700" onClick={()=>{
                        const target = (document.getElementById('latTarget') as HTMLInputElement).value.trim();
                        const method = (document.getElementById('latMethod') as HTMLInputElement).value.trim();
                        if (!target) return;
                        updateProject(selected.id,{ lateralMoves: [...selected.lateralMoves, { id: `${Date.now()}`, target, method }] });
                        (document.getElementById('latTarget') as HTMLInputElement).value='';
                        (document.getElementById('latMethod') as HTMLInputElement).value='';
                      }}>Ajouter</Button>
                    </div>
                    <div className="space-y-1">
                      {selected.lateralMoves.map((m, idx) => (
                        <div key={m.id} className="flex items-center justify-between p-2 bg-slate-700/40 border border-slate-600 rounded text-sm text-slate-100">
                          <span>{m.target} {m.method ? `• ${m.method}` : ''}</span>
                          <Button size="sm" variant="outline" className="bg-red-700 border-red-600 text-red-200 hover:bg-red-600" onClick={()=>{ const copy=[...selected.lateralMoves]; copy.splice(idx,1); updateProject(selected.id,{ lateralMoves: copy }); }}><Trash2 className="w-3 h-3" /></Button>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
                <Card className="border-slate-700 bg-slate-800">
                  <CardHeader>
                    <CardTitle className="text-slate-100 flex items-center justify-between">
                      <span>Persistance</span>
                      <span className="flex items-center gap-2">
                        {!selected.pwnedAt ? (
                          <Button size="sm" className="bg-emerald-700 hover:bg-emerald-600" onClick={()=> updateProject(selected.id,{ progress: { ...selected.progress, root: true } })}><Trophy className="w-3 h-3 mr-1" /> Pwned</Button>
                        ) : (
                          <Button size="sm" className="bg-amber-700 hover:bg-amber-600" onClick={()=> updateProject(selected.id,{ progress: { ...selected.progress, root: false }, pwnedAt: undefined })}>Ré-ouvrir</Button>
                        )}
                        {!selected.closed ? (
                          <Button size="sm" variant="outline" className="bg-slate-700 border-slate-600 text-slate-200 hover:bg-slate-600" onClick={()=> closeProject(selected.id)}>Clôturer le projet</Button>
                        ) : (
                          <Button size="sm" variant="outline" className="bg-slate-700 border-slate-600 text-slate-200 hover:bg-slate-600" onClick={()=> updateProject(selected.id,{ closed: false, closedAt: undefined })}>Ré-ouvrir le projet</Button>
                        )}
                      </span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Textarea rows={8} value={selected.persistenceNotes} onChange={(e)=>updateProject(selected.id,{ persistenceNotes: e.target.value })} className="w-full bg-slate-700 border-slate-600 text-slate-100" placeholder="Backdoors, utilisateurs, tâches planifiées…" />
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Writeup / Template */}
            {selected && detailTab === 'writeup' && (
              <div className="grid lg:grid-cols-2 gap-4">
                <Card className="border-slate-700 bg-slate-800">
                  <CardHeader>
                    <CardTitle className="text-slate-100 flex items-center gap-2"><FileText className="w-4 h-4" /> Rédaction</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <Textarea rows={20} value={selected.writeupMarkdown || generatedMarkdown} onChange={(e)=>updateProject(selected.id,{ writeupMarkdown: e.target.value })} className="w-full bg-slate-900 border-slate-700 text-slate-100 font-mono" />
                    <div className="flex gap-2">
                      <Button className="bg-slate-700 border border-slate-600 text-slate-200 hover:bg-slate-600" variant="outline" onClick={() => navigator.clipboard.writeText(writeupEffective)}>
                        <ClipboardPaste className="w-4 h-4 mr-2" /> Copier
                      </Button>
                      <Button className="bg-slate-700 border border-slate-600 text-slate-200 hover:bg-slate-600" variant="outline" onClick={()=>{
                        const blob = new Blob([writeupEffective], { type: 'text/markdown;charset=utf-8' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url; a.download = `${selected.name.replace(/\s+/g,'_')}.md`;
                        document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
                      }}>Télécharger .md</Button>
                    </div>
                  </CardContent>
                </Card>
                <Card className="border-slate-700 bg-slate-800">
                  <CardHeader>
                    <CardTitle className="text-slate-100">Aperçu</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="prose prose-invert max-w-none">
                      <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]}>
                        {writeupEffective}
                      </ReactMarkdown>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal: Créer un projet */}
      {createModalOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-lg rounded-lg border border-slate-700 bg-slate-900 shadow-xl">
            <div className="p-4 border-b border-slate-700 text-slate-100 font-semibold">Nouveau Projet HTB</div>
            <div className="p-4 space-y-3">
              <div>
                <label className="text-sm text-slate-300">Nom</label>
                <Input value={newProjName} onChange={(e)=>setNewProjName(e.target.value)} className="mt-1 bg-slate-700 border-slate-600 text-slate-100" />
              </div>
              <div>
                <label className="text-sm text-slate-300">URL HTB (optionnel)</label>
                <Input value={newProjUrl} onChange={(e)=>setNewProjUrl(e.target.value)} placeholder="https://app.hackthebox.com/machines/661" className="mt-1 bg-slate-700 border-slate-600 text-slate-100" />
                <div className="text-xs text-slate-400 mt-1">Si possible, l'avatar/OS/difficulté seront récupérés automatiquement.</div>
              </div>
            </div>
            <div className="p-4 border-t border-slate-700 flex justify-end gap-2">
              <Button variant="outline" className="bg-slate-700 border-slate-600 text-slate-200 hover:bg-slate-600" onClick={()=>setCreateModalOpen(false)}>Annuler</Button>
              <Button className="bg-blue-600 hover:bg-blue-700" onClick={handleCreateProject}>Créer</Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Notes de service */}
      {serviceNotesOpen && selected && serviceIdx !== null && (
        <div className="fixed inset-0 z-[130] flex items-center justify-center bg-black/60 p-4" onClick={(e)=> e.target === e.currentTarget && setServiceNotesOpen(false)}>
          <div className={`${serviceNotesFullscreen ? 'w-full h-full rounded-none' : 'w-full max-w-5xl h-[85vh] rounded-lg'} border border-slate-700 bg-slate-900 shadow-xl flex flex-col`}>
            <div className="p-4 border-b border-slate-700 flex items-center justify-between gap-2">
              <div className="text-slate-100 font-semibold">Notes — Service {selected.services[serviceIdx].port}/{selected.services[serviceIdx].proto} • {selected.services[serviceIdx].service}</div>
              <div className="flex items-center gap-2">
                <div className="hidden sm:flex items-center gap-1">
                  <Button size="sm" variant="outline" className={`${serviceNotesLayout==='edit' ? 'bg-blue-700 border-blue-600 text-white' : 'bg-slate-800 border-slate-600 text-slate-200 hover:bg-slate-700'}`} onClick={()=> setServiceNotesLayout('edit')}>Édition</Button>
                  <Button size="sm" variant="outline" className={`${serviceNotesLayout==='preview' ? 'bg-blue-700 border-blue-600 text-white' : 'bg-slate-800 border-slate-600 text-slate-200 hover:bg-slate-700'}`} onClick={()=> setServiceNotesLayout('preview')}>Aperçu</Button>
                  <Button size="sm" variant="outline" className={`${serviceNotesLayout==='split' ? 'bg-blue-700 border-blue-600 text-white' : 'bg-slate-800 border-slate-600 text-slate-200 hover:bg-slate-700'}`} onClick={()=> setServiceNotesLayout('split')}>Split</Button>
                </div>
                <Button size="sm" variant="outline" className="bg-slate-800 border-slate-600 text-slate-200 hover:bg-slate-700" onClick={()=> setServiceNotesFullscreen(v=>!v)}>{serviceNotesFullscreen ? 'Fenêtré' : 'Plein écran'}</Button>
                <Button variant="outline" className="bg-slate-800 border-slate-600 text-slate-200 hover:bg-slate-700" onClick={()=> setServiceNotesOpen(false)}>Fermer</Button>
              </div>
            </div>
            <div className="p-4 border-b border-slate-700 flex items-center gap-2 overflow-x-auto">
              <button onClick={()=>{ setServicePageIdx(0); setServiceNotesDraft(selected.services[serviceIdx!].notes || ''); }} className={`px-3 py-1 rounded text-sm ${servicePageIdx===0? 'bg-slate-700 text-slate-100':'bg-slate-800 text-slate-300 border border-slate-600'}`}>Page principale</button>
              {(selected.services[serviceIdx].notesPages || []).map((_, i)=> (
                <button key={i} onClick={()=>{ setServicePageIdx(i+1); setServiceNotesDraft(selected.services[serviceIdx!].notesPages?.[i] || ''); }} className={`px-3 py-1 rounded text-sm ${servicePageIdx===i+1? 'bg-slate-700 text-slate-100':'bg-slate-800 text-slate-300 border border-slate-600'}`}>Page {i+1}</button>
              ))}
              <Button size="sm" variant="outline" className="ml-2 bg-slate-800 border-slate-600 text-slate-200 hover:bg-slate-700" onClick={()=>{
                const clone = [...selected.services];
                const pages = clone[serviceIdx!].notesPages ? [...(clone[serviceIdx!].notesPages as string[])] : [];
                pages.push('');
                clone[serviceIdx!] = { ...(clone[serviceIdx!]), notesPages: pages } as HTBService;
                updateProject(selected.id,{ services: clone });
                setServicePageIdx(pages.length); // focus new page
                setServiceNotesDraft('');
              }}>+ Ajouter une page</Button>
            </div>
            <div className="flex-1 overflow-hidden p-4">
              {serviceNotesLayout === 'split' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 h-full">
                  <div className="flex flex-col h-full">
                    <div className="flex items-center gap-2 mb-2">
                      <Button size="sm" variant="outline" className="bg-slate-800 border-slate-600 text-slate-200 hover:bg-slate-700" onClick={()=> setServiceNotesDraft(v => v + "\n```bash\n# code\n```\n")}>+ Code block</Button>
                      <div className="text-xs text-slate-400">Astuce: collez des images (Ctrl+V) — pour éviter le base64, utilisez la zone ci-dessous pour attacher l'image en local</div>
                    </div>
                    <Textarea
                      value={serviceNotesDraft}
                      onChange={(e)=> setServiceNotesDraft(e.target.value)}
                      className="flex-1 bg-slate-900 border-slate-700 text-slate-100 font-mono"
                    />
                  </div>
                  <div className="h-full overflow-auto border border-slate-700 rounded p-3 bg-slate-900">
                    <div className="prose prose-invert max-w-none">
                      <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]}>
                        {serviceNotesDraft}
                      </ReactMarkdown>
                    </div>
                    <div className="mt-3 p-3 bg-slate-800/50 border border-slate-700 rounded">
                      <div className="text-xs text-slate-400 mb-2">Attacher une image (stockée en local, pas dans le texte)</div>
                      <input type="file" accept="image/*" onChange={async (e)=>{
                        const file = e.target.files?.[0]; if (!file) return; const id = await saveImageBlob(file);
                        const url = await getImageObjectURL(id);
                        if (serviceIdx===null || !url) return;
                        const next = [...selected.services];
                        const imgs = next[serviceIdx].images ? [...(next[serviceIdx].images as string[])] : [];
                        imgs.push(id);
                        next[serviceIdx] = { ...(next[serviceIdx]), images: imgs } as HTBService;
                        updateProject(selected.id,{ services: next });
                      }} />
                      <div className="mt-2 grid grid-cols-3 gap-2">
                        {(selected.services[serviceIdx!].images || []).map((id, i) => (
                          <img key={i} src={''} data-id={id} className="w-full h-16 object-cover rounded border border-slate-700" onLoad={async (ev)=>{
                            const el = ev.currentTarget as HTMLImageElement; const blobUrl = await getImageObjectURL(el.dataset.id || ''); if (blobUrl) el.src = blobUrl;
                          }} />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
              {serviceNotesLayout === 'edit' && (
                <div className="flex flex-col h-full">
                  <div className="flex items-center gap-2 mb-2">
                    <Button size="sm" variant="outline" className="bg-slate-800 border-slate-600 text-slate-200 hover:bg-slate-700" onClick={()=> setServiceNotesDraft(v => v + "\n```bash\n# code\n```\n")}>+ Code block</Button>
                    <div className="text-xs text-slate-400">Astuce: collez des images (Ctrl+V) — utilisez l'aperçu pour voir le rendu</div>
                  </div>
                  <Textarea
                    value={serviceNotesDraft}
                    onChange={(e)=> setServiceNotesDraft(e.target.value)}
                    className="flex-1 bg-slate-900 border-slate-700 text-slate-100 font-mono"
                  />
                </div>
              )}
              {serviceNotesLayout === 'preview' && (
                <div className="h-full overflow-auto border border-slate-700 rounded p-3 bg-slate-900">
                  <div className="prose prose-invert max-w-none">
                    <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]}>
                      {serviceNotesDraft}
                    </ReactMarkdown>
                  </div>
                </div>
              )}
            </div>
            <div className="p-4 border-t border-slate-700 flex justify-end gap-2">
              <Button variant="outline" className="bg-slate-800 border-slate-600 text-slate-200 hover:bg-slate-700" onClick={()=> setServiceNotesOpen(false)}>Annuler</Button>
              <Button className="bg-blue-600 hover:bg-blue-700" onClick={()=> {
                if (serviceIdx === null) return;
                const next = [...selected.services];
                if (servicePageIdx === 0) {
                  next[serviceIdx] = { ...next[serviceIdx], notes: serviceNotesDraft } as HTBService;
                } else {
                  const pages = next[serviceIdx].notesPages ? [...(next[serviceIdx].notesPages as string[])] : [];
                  pages[servicePageIdx-1] = serviceNotesDraft;
                  next[serviceIdx] = { ...next[serviceIdx], notesPages: pages } as HTBService;
                }
                updateProject(selected.id,{ services: next });
                setServiceNotesOpen(false);
              }}>Sauvegarder</Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Ajouter au journal d'exploit */}
      {exploitModalOpen && selected && (
        <ExploitationModal
          isOpen={exploitModalOpen}
          onClose={()=>{ setExploitModalOpen(false); setEditingStep(null); }}
          editingStep={editingStep || undefined}
          onSave={(step) => {
            if (editingStep) {
              const idx = selected.exploitLog.findIndex(e => e.id === editingStep.id);
              const copy = [...selected.exploitLog];
              copy[idx] = { id: editingStep.id, timestamp: editingStep.timestamp, title: step.title, command: step.command, result: step.output };
              updateProject(selected.id,{ exploitLog: copy });
            } else {
              updateProject(selected.id,{ exploitLog: [...selected.exploitLog, { id: `${Date.now()}`, timestamp: new Date().toISOString(), title: step.title, command: step.command, result: step.output }] });
            }
            setExploitModalOpen(false); setEditingStep(null);
          }}
        />
      )}
    </div>
  );
};

export default StandalonePlaygroundPage;


