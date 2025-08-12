import React, { useMemo, useRef, useState } from 'react';
import { useHostStore } from '@/stores/hostStore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Download, FileText, Users, CalendarDays, Eye, Code, Copy } from 'lucide-react';
import JSZip from 'jszip';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import html2pdf from 'html2pdf.js';

const LiveReportPage: React.FC = () => {
  const { hosts, categories } = useHostStore();
  const hostsArray = Object.values(hosts);

  const [pentester, setPentester] = useState('Pentester');
  const [client, setClient] = useState('Client');
  const [engagementDate, setEngagementDate] = useState<string>(new Date().toISOString().slice(0,10));
  const [executiveSummary, setExecutiveSummary] = useState<string>('');
  const [previewMode, setPreviewMode] = useState<'preview' | 'markdown'>('preview');
  const previewRef = useRef<HTMLDivElement | null>(null);
  // Personnalisation rapport
  const [orgLogo, setOrgLogo] = useState<string>('');
  const [accentColor, setAccentColor] = useState<string>('#2563eb');
  const [fontScale, setFontScale] = useState<number>(1);
  const [includeNotes, setIncludeNotes] = useState<boolean>(true);
  const [includeCommands, setIncludeCommands] = useState<boolean>(true);
  const [includeOutputs, setIncludeOutputs] = useState<boolean>(true);
  const [includeScreenshots, setIncludeScreenshots] = useState<boolean>(true);

  const stats = useMemo(() => {
    const zones = categories.length;
    const totalHosts = hostsArray.length;
    const steps = hostsArray.reduce((acc, h) => acc + (h.exploitationSteps?.length || 0), 0);
    const withExploitation = hostsArray.filter(h => (h.exploitationSteps?.length || 0) > 0).length;
    const connections = hostsArray.reduce((acc, h) => acc + (h.outgoingConnections?.length || 0), 0);
    const compromised = hostsArray.filter(h => h.status === 'compromised').length;
    return { zones, totalHosts, steps, withExploitation, connections, compromised };
  }, [hostsArray, categories]);

  const hostsByCategory = useMemo(() => {
    const map: Record<string, any[]> = {};
    categories.forEach(c => (map[c.id] = []));
    hostsArray.forEach(h => {
      const key = h.category || categories[0]?.id || 'default';
      if (!map[key]) map[key] = [];
      map[key].push(h);
    });
    return map;
  }, [hostsArray, categories]);

  const generateExecutiveSummary = () => {
    const lines: string[] = [];
    lines.push(`Ce rapport préliminaire couvre ${stats.totalHosts} hôte(s) répartis sur ${stats.zones} zone(s) réseau.`);
    if (stats.compromised > 0) {
      lines.push(`Nous avons identifié ${stats.compromised} hôte(s) compromis nécessitant des actions immédiates.`);
    } else {
      lines.push(`Aucun hôte n'a été catégorisé comme compromis à ce stade.`);
    }
    if (stats.steps > 0) {
      lines.push(`Un total de ${stats.steps} étape(s) d'exploitation ont été documentées sur ${stats.withExploitation} hôte(s).`);
    } else {
      lines.push(`Aucune exploitation n'a été réalisée pour le moment; les travaux se concentrent sur la reconnaissance et l'énumération.`);
    }
    if (stats.connections > 0) {
      lines.push(`La topologie réseau montre ${stats.connections} connexion(s) sortante(s) explicitement tracées, permettant d'illustrer des chemins potentiels de pivot.`);
    }
    lines.push(`Les sections suivantes détaillent la kill chain par zone, puis par hôte, avec les preuves (commandes, outputs, captures) et les recommandations provisoires.`);
    setExecutiveSummary(lines.join('\n'));
  };

  const toc = (): string[] => {
    const rows: string[] = [];
    rows.push(`## Sommaire`);
    categories.forEach(cat => {
      const catHosts = hostsByCategory[cat.id] || [];
      rows.push(`- [Zone: ${cat.name}](#zone-${cat.name.replace(/\s+/g,'-')})`);
      catHosts.forEach(h => {
        rows.push(`  - [${h.hostname || h.ip} (${h.ip})](#${(h.hostname || h.ip).replace(/\s+/g,'-')}-${h.ip.replace(/\./g,'-')})`);
      });
    });
    return rows;
  };

  const renderMarkdown = (): string => {
    const md: string[] = [];
    md.push(`# Rapport Préliminaire - Audit de Sécurité`);
    md.push(`- Pentester: ${pentester}`);
    md.push(`- Client: ${client}`);
    md.push(`- Date: ${new Date(engagementDate).toLocaleDateString('fr-FR')}`);
    md.push('');
    md.push(...toc());
    md.push('');
    if ((executiveSummary || '').trim().length > 0) {
      md.push(`## Résumé Exécutif`);
      md.push((executiveSummary || '').trim());
      md.push('');
    }
    md.push(`## Contexte & Méthodologie`);
    md.push(`Les activités ont suivi une approche itérative: reconnaissance, énumération, exploitation et post-exploitation. Les résultats décrits ci-dessous sont préliminaires et sujets à évolution au fur et à mesure de l'engagement.`);
    md.push('');
    md.push(`## Topologie & Kill Chain (Synthèse)`);
    md.push(`La topologie s'appuie sur les connexions inter-hôtes documentées. Les pivots potentiels sont détaillés dans les sections hôtes lorsque des connexions sortantes sont observées.`);

    categories.forEach(cat => {
      const catHosts = hostsByCategory[cat.id] || [];
      if (catHosts.length === 0) return;
      md.push('');
      md.push(`### Zone: ${cat.name}`);
      const zoneSteps = catHosts.reduce((a:number,h:any)=>a+(h.exploitationSteps?.length||0),0);
      md.push(`Cette zone contient ${catHosts.length} hôte(s) et ${zoneSteps} étape(s) d'exploitation documentée(s).`);
      catHosts.forEach((h:any) => {
        md.push('');
        md.push(`#### ${h.hostname || h.ip} (${h.ip})`);
        md.push(`- OS: ${h.os || 'Unknown'} | Statut: ${h.status} | Priorité: ${h.priority} | Compromise: ${h.compromiseLevel}`);
        const out = (h.outgoingConnections || []).map((c:any) => `→ ${c.toHostId}${c.cause ? ` (${c.cause})` : ''}`).join(', ');
        if (out) md.push(`- Connexions sortantes: ${out}`);
        if (includeNotes && h.notes) { md.push(`- Notes:`); md.push(h.notes.split('\n').map((l:string)=>`  ${l}`).join('\n')); }
        if (h.exploitationSteps?.length) {
          md.push(`- Étapes d'exploitation:`);
          h.exploitationSteps.forEach((step:any, idx:number) => {
            md.push('');
            md.push(`##### ${idx + 1}. ${step.title}`);
            if (step.cve) md.push(`- CVE: ${step.cve}`);
            if (step.cvss !== undefined) md.push(`- CVSS: ${step.cvss}`);
            md.push(`- Sévérité: ${step.severity} | Statut: ${step.status}`);
            if (step.description) { md.push(`- Description:`); md.push(step.description.split('\n').map((l:string)=>`  ${l}`).join('\n')); }
            if (includeCommands && step.command) { md.push(`- Commande:\n\n\`\`\`bash\n${step.command}\n\`\`\``); }
            if (includeOutputs && step.output) { md.push(`- Output:\n\n\`\`\`\n${step.output}\n\`\`\``); }
            if (includeScreenshots && step.screenshots?.length) { md.push(`- Captures:`); step.screenshots.forEach((s:string,i:number)=> md.push(`  ![screenshot-${i+1}](${s})`)); }
            if (includeNotes && step.notes) { md.push(`- Notes:`); md.push(step.notes.split('\n').map((l:string)=>`  ${l}`).join('\n')); }
          });
        } else {
          md.push(`- Aucune exploitation réalisée pour cet hôte à ce stade.`);
        }
      });
    });

    md.push('');
    md.push(`## Recommandations Provisoires`);
    if (stats.compromised > 0) md.push(`1. Isoler immédiatement les hôtes compromis (${stats.compromised}).`);
    md.push(`2. Prioriser la remédiation des vulnérabilités associées aux CVE les plus critiques.`);
    md.push(`3. Restreindre les flux inter-zones identifiés comme pivots potentiels (${stats.connections} connexion(s) tracée(s)).`);
    md.push(`4. Mettre en place une surveillance accrue sur les hôtes avec activités d'exploitation (${stats.withExploitation}).`);

    return md.join('\n');
  };

  const exportPdf = async () => {
    const element = previewRef.current;
    if (!element) return;
    // Appliquer un thème print temporaire
    element.classList.add('report-print');
    const opt = {
      margin: [10, 12, 10, 12],
      filename: `rapport_preliminaire_${new Date().toISOString().slice(0,10)}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, backgroundColor: '#ffffff' },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    } as any;
    try {
      await (html2pdf() as any).set(opt).from(element).save();
    } finally {
      element.classList.remove('report-print');
    }
  };

  const exportMarkdown = async () => {
    const md = renderMarkdown();
    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `rapport_preliminaire_${new Date().toISOString().slice(0,10)}.md`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
  };

  const exportZip = async () => {
    const zip = new JSZip();
    zip.file('report.md', renderMarkdown());
    Object.values(hosts).forEach(h => {
      (h.exploitationSteps || []).forEach((step, idx) => {
        (step.screenshots || []).forEach((src, si) => {
          if (src.startsWith('data:image')) {
            const base64 = src.split(',')[1];
            zip.file(`screenshots/${h.ip}/step-${idx+1}-${si+1}.jpg`, base64, { base64: true });
          }
        });
      });
    });
    const blob = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `rapport_preliminaire_${new Date().toISOString().slice(0,10)}.zip`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
  };

  const copyToClipboard = async () => {
    const md = renderMarkdown();
    await navigator.clipboard.writeText(md);
  };

  return (
    <div className="min-h-screen bg-dark-950 text-dark-100 overflow-x-hidden overflow-y-auto report-layout">
      <div className="main-header p-6">
        <div className="flex-between mb-6">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="AuditMapper" className="w-8 h-8 rounded-lg opacity-80" />
            <div>
              <h1 className="text-2xl font-bold text-slate-100">Rapport Préliminaire</h1>
              <p className="text-slate-400">Suivi temps réel des données du Host Manager</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={generateExecutiveSummary} variant="outline" className="bg-slate-700 border-slate-600 text-slate-200 hover:bg-slate-600">Générer un résumé type</Button>
            <Button onClick={exportMarkdown} className="bg-blue-600 hover:bg-blue-700"><Download className="w-4 h-4 mr-2" /> Export .md</Button>
            <Button onClick={exportZip} variant="outline" className="bg-slate-700 border-slate-600 text-slate-200 hover:bg-slate-600"><Download className="w-4 h-4 mr-2" /> Export .zip</Button>
            <Button onClick={exportPdf} className="bg-emerald-600 hover:bg-emerald-700"><Download className="w-4 h-4 mr-2" /> Export .pdf</Button>
          </div>
        </div>
      </div>

      <div className="main-content">
        {/* Sidebar gauche: méta rapport */}
        <div className="sidebar-left p-4 space-y-4">
          <Card className="border-slate-700 bg-slate-800">
            <CardHeader>
              <CardTitle className="text-slate-100 flex items-center gap-2"><FileText className="w-5 h-5" /> Paramètres du Rapport</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm text-slate-300 mb-1">Logo (URL base64 ou http)</label>
                <Input value={orgLogo} onChange={(e) => setOrgLogo(e.target.value)} className="bg-slate-700 border-slate-600" placeholder="data:image/png;base64,... ou https://..." />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm text-slate-300 mb-1">Couleur d'accent</label>
                  <Input type="color" value={accentColor} onChange={(e) => setAccentColor(e.target.value)} className="bg-slate-700 border-slate-600 h-10 p-1" />
                </div>
                <div>
                  <label className="text-sm text-slate-300 mb-1">Échelle de police</label>
                  <Input type="number" step="0.05" min="0.8" max="1.4" value={fontScale} onChange={(e) => setFontScale(parseFloat(e.target.value || '1'))} className="bg-slate-700 border-slate-600" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <label className="flex items-center gap-2 text-sm text-slate-300"><input type="checkbox" checked={includeNotes} onChange={(e)=>setIncludeNotes(e.target.checked)} /> Inclure Notes</label>
                <label className="flex items-center gap-2 text-sm text-slate-300"><input type="checkbox" checked={includeCommands} onChange={(e)=>setIncludeCommands(e.target.checked)} /> Inclure Commandes</label>
                <label className="flex items-center gap-2 text-sm text-slate-300"><input type="checkbox" checked={includeOutputs} onChange={(e)=>setIncludeOutputs(e.target.checked)} /> Inclure Outputs</label>
                <label className="flex items-center gap-2 text-sm text-slate-300"><input type="checkbox" checked={includeScreenshots} onChange={(e)=>setIncludeScreenshots(e.target.checked)} /> Inclure Captures</label>
              </div>
              <div>
                <label className="text-sm text-slate-300 mb-1 flex items-center gap-2"><Users className="w-4 h-4" /> Pentester</label>
                <Input value={pentester} onChange={(e) => setPentester(e.target.value)} className="bg-slate-700 border-slate-600" />
              </div>
              <div>
                <label className="text-sm text-slate-300 mb-1 flex items-center gap-2"><Users className="w-4 h-4" /> Client</label>
                <Input value={client} onChange={(e) => setClient(e.target.value)} className="bg-slate-700 border-slate-600" />
              </div>
              <div>
                <label className="text-sm text-slate-300 mb-1 flex items-center gap-2"><CalendarDays className="w-4 h-4" /> Date</label>
                <Input type="date" value={engagementDate} onChange={(e) => setEngagementDate(e.target.value)} className="bg-slate-700 border-slate-600" />
              </div>
              <div className="flex gap-2 flex-wrap">
                <Button onClick={generateExecutiveSummary} variant="outline" className="bg-slate-700 border-slate-600 text-slate-200 hover:bg-slate-600">Générer un résumé type</Button>
                <Button onClick={() => setPreviewMode('preview')} variant={previewMode==='preview' ? 'default' : 'outline'} className={previewMode==='preview' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-slate-700 border-slate-600 text-slate-200 hover:bg-slate-600'}><Eye className="w-4 h-4 mr-1" /> Aperçu</Button>
                <Button onClick={() => setPreviewMode('markdown')} variant={previewMode==='markdown' ? 'default' : 'outline'} className={previewMode==='markdown' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-slate-700 border-slate-600 text-slate-200 hover:bg-slate-600'}><Code className="w-4 h-4 mr-1" /> Markdown</Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Zone centrale: grand aperçu */}
        <div className="content-main p-6">
          <Card className="border-slate-700 bg-slate-800">
            <CardHeader>
              <CardTitle className="text-slate-100">Aperçu du Rapport</CardTitle>
            </CardHeader>
            <CardContent>
              {previewMode === 'preview' ? (
                <div
                  ref={previewRef}
                  className="report-pro"
                  style={{
                    // appliquer préférences de style
                    ['--report-accent' as any]: accentColor,
                    ['--report-font-scale' as any]: String(fontScale),
                  }}
                >
                  {orgLogo && (
                    <div className="mb-4 flex items-center gap-3">
                      <img src={orgLogo} alt="Logo" className="h-10 w-auto object-contain" />
                      <div className="text-slate-300 text-sm">{client}</div>
                    </div>
                  )}
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    rehypePlugins={[rehypeHighlight]}
                  >
                    {renderMarkdown()}
                  </ReactMarkdown>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <Button onClick={copyToClipboard} variant="outline" className="bg-slate-700 border-slate-600 text-slate-200 hover:bg-slate-600"><Copy className="w-4 h-4 mr-1" /> Copier</Button>
                  </div>
                  <Textarea value={renderMarkdown()} readOnly className="min-h-[60vh] bg-slate-900 border-slate-700 text-slate-100 font-mono text-sm" />
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default LiveReportPage;
