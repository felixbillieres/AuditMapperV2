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
  const re = /^(\d+)\/(tcp|udp)\s+(open|closed|filtered|open\|filtered)\s+([\w\-\?\._]+)(?:\s+(.*))?$/i;
  for (const line of lines) {
    const m = line.match(re);
    if (m) services.push({ port: Number(m[1]), proto: m[2], state: m[3], service: m[4], version: m[5]?.trim() });
  }
  return services.sort((a, b) => a.port - b.port);
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

  const [editorMode, setEditorMode] = useState<'edit' | 'preview'>('preview');
  const [markdownDraft, setMarkdownDraft] = useState('');
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
          </div>
        </div>
      </div>
    </div>
  );
};

export default TemplateGeneratorPage;
