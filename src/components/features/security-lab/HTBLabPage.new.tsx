import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Button } from '../../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Download, Upload } from 'lucide-react';
import { useHTBStore, type HTBService } from '../../../stores/htbStore';
import { Dashboard } from './Dashboard';
import { Reconnaissance } from './Reconnaissance';
import { InitialAccess } from './InitialAccess';
import { PrivilegeEscalation } from './PrivilegeEscalation';
import { PostExploitation } from './PostExploitation';
import { Writeup } from './Writeup';
import { Modals } from './Modals';

// Fonction utilitaire pour parser les scans nmap
function parsePortScanOutput(text: string): HTBService[] {
  if (!text.trim()) return [];
  
  const services: HTBService[] = [];
  const lines = text.split('\n').filter(line => line.trim());
  
  for (const line of lines) {
    // Format nmap standard: "22/tcp   open  ssh     OpenSSH 8.2p1"
    const nmapMatch = line.match(/(\d+)\/(tcp|udp)\s+open\s+(\S+)(?:\s+(.+?))?$/);
    if (nmapMatch) {
      services.push({
        port: nmapMatch[1],
        proto: nmapMatch[2] as 'tcp' | 'udp',
        service: nmapMatch[3],
        version: nmapMatch[4]?.trim() || undefined,
        notes: ''
      });
      continue;
    }
    
    // Format rustscan: "22 -> ssh"
    const rustScanMatch = line.match(/(\d+)\s*->\s*(\S+)/);
    if (rustScanMatch) {
      services.push({
        port: rustScanMatch[1],
        proto: 'tcp',
        service: rustScanMatch[2],
        notes: ''
      });
      continue;
    }
    
    // Format simple: "80/tcp" ou "443"
    const simpleMatch = line.match(/(\d+)(?:\/(tcp|udp))?/);
    if (simpleMatch && !line.includes('closed') && !line.includes('filtered')) {
      services.push({
        port: simpleMatch[1],
        proto: (simpleMatch[2] as 'tcp' | 'udp') || 'tcp',
        service: 'unknown',
        notes: ''
      });
    }
  }
  
  return services;
}

// Fonction pour obtenir la couleur selon la difficulté
function getDifficultyColor(difficulty: string): string {
  switch (difficulty) {
    case 'Easy': return 'border-green-500 text-green-400';
    case 'Medium': return 'border-yellow-500 text-yellow-400';
    case 'Hard': return 'border-red-500 text-red-400';
    case 'Insane': return 'border-purple-500 text-purple-400';
    default: return 'border-slate-500 text-slate-400';
  }
}

export default function StandalonePlaygroundPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { profile, addProject, updateProject, deleteProject, selectProject, exportProfile, importProfile, exportProject, importProject, closeProject } = useHTBStore();
  const projectParam = searchParams.get('project') || undefined;
  const selected = projectParam ? profile.projects[projectParam] : undefined;
  const [detailTab, setDetailTab] = useState<'recon'|'initial'|'privesc'|'post'|'writeup'>('recon');
  
  // Modal states
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [newProjName, setNewProjName] = useState('Nouvelle Box');
  const [newProjUrl, setNewProjUrl] = useState('');
  const [newProjPlatform, setNewProjPlatform] = useState<'HackTheBox' | 'Offsec' | 'TryHackMe' | 'VulnLab' | 'Autre'>('HackTheBox');
  const [newProjDifficulty, setNewProjDifficulty] = useState<'Easy' | 'Medium' | 'Hard' | 'Insane'>('Medium');
  
  const [serviceNotesOpen, setServiceNotesOpen] = useState(false);
  const [serviceIdx, setServiceIdx] = useState(0);
  const [servicePageIdx, setServicePageIdx] = useState(0);
  const [serviceNotesDraft, setServiceNotesDraft] = useState('');
  const [renamingPageIdx, setRenamingPageIdx] = useState<number | null>(null);
  const [pageNameDraft, setPageNameDraft] = useState('');
  
  const [exploitModalOpen, setExploitModalOpen] = useState(false);
  const [editingStep, setEditingStep] = useState<any>(null);
  const [stepTitle, setStepTitle] = useState('');
  const [stepCommand, setStepCommand] = useState('');
  const [stepOutput, setStepOutput] = useState('');
  
  // Service form
  const [showAddService, setShowAddService] = useState(false);
  const [newService, setNewService] = useState({ port: '', proto: 'tcp', service: '', version: '' });

  // Fonctions utilitaires
  const resetCreateForm = () => {
    setNewProjName('Nouvelle Box');
    setNewProjUrl('');
    setNewProjPlatform('HackTheBox');
    setNewProjDifficulty('Medium');
  };

  // Données pour le dashboard
  const projects = Object.values(profile.projects).filter(p => !p.pwnedAt);
  const stats = {
    total: Object.keys(profile.projects).length,
    pwned: Object.values(profile.projects).filter(p => p.pwnedAt).length,
    active: projects.length,
    cumulative: Object.values(profile.projects)
      .filter(p => p.pwnedAt)
      .sort((a, b) => new Date(a.pwnedAt!).getTime() - new Date(b.pwnedAt!).getTime())
      .reduce((acc, p, i) => {
        acc.push({ date: new Date(p.pwnedAt!).toLocaleDateString('fr-FR'), count: i + 1 });
        return acc;
      }, [] as Array<{ date: string; count: number }>),
    byDifficulty: [
      { name: 'Easy', value: Object.values(profile.projects).filter(p => p.difficultyLabel === 'Easy').length, color: '#22c55e' },
      { name: 'Medium', value: Object.values(profile.projects).filter(p => p.difficultyLabel === 'Medium').length, color: '#eab308' },
      { name: 'Hard', value: Object.values(profile.projects).filter(p => p.difficultyLabel === 'Hard').length, color: '#ef4444' },
      { name: 'Insane', value: Object.values(profile.projects).filter(p => p.difficultyLabel === 'Insane').length, color: '#8b5cf6' }
    ]
  };

  // Génération automatique du writeup
  const generatedMarkdown = selected ? `# ${selected.name}

## Informations
- **Plateforme**: ${selected.platform}
- **Difficulté**: ${selected.difficultyLabel}
- **IP**: ${selected.ip || 'N/A'}
- **OS**: ${selected.os || 'N/A'}

## Reconnaissance

### Scan de ports
\`\`\`
${selected.nmapRaw || 'Aucun scan disponible'}
\`\`\`

### Services découverts
${selected.services.map(s => `- **${s.port}/${s.proto}**: ${s.service}${s.version ? ` (${s.version})` : ''}`).join('\n')}

## Initial Access
${selected.serviceExploits?.map(e => `
### ${e.serviceName} (${e.servicePort}/${e.serviceProto})
- **Type**: ${e.exploitType}
- **Statut**: ${e.status === 'working' ? '✅ Fonctionnel' : e.status === 'failed' ? '❌ Échec' : '🧪 Test'}

**Détails**:
${e.details}

**Commandes**:
\`\`\`bash
${e.commands}
\`\`\`
`).join('\n') || 'Aucun exploit documenté'}

## Privilege Escalation
${selected.privescChecklist?.filter(t => t.status === 'done').map(t => `- ✅ ${t.text}`).join('\n') || 'Aucune escalade documentée'}

## Journal d'exploitation
${selected.exploitLog.map(step => `
### ${step.title}
*${new Date(step.timestamp).toLocaleString('fr-FR')}*

${step.command ? `**Commande**: \`${step.command}\`` : ''}

${step.result ? `**Résultat**:\n\`\`\`\n${step.result}\n\`\`\`` : ''}
`).join('\n')}
` : '';

  const writeupEffective = selected?.writeupMarkdown || generatedMarkdown;

  // Synchronisation des états d'édition
  React.useEffect(() => {
    if (editingStep) {
      setStepTitle(editingStep.title || '');
      setStepCommand(editingStep.command || '');
      setStepOutput(editingStep.result || '');
      setExploitModalOpen(true);
    } else {
      setStepTitle('');
      setStepCommand('');
      setStepOutput('');
    }
  }, [editingStep]);

  return (
    <>
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
                + Nouveau Projet
              </Button>
              <Button
                variant="outline"
                className="bg-slate-700 border-slate-600 text-slate-200 hover:bg-slate-600"
                onClick={async () => {
                  const input = document.createElement('input');
                  input.type = 'file';
                  input.accept = '.project.json';
                  input.onchange = async (e) => {
                    const file = (e.target as HTMLInputElement).files?.[0];
                    if (file) {
                      const text = await file.text();
                      const data = JSON.parse(text);
                      importProject(data);
                    }
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
                  input.accept = '.json';
                  input.onchange = async (e) => {
                    const file = (e.target as HTMLInputElement).files?.[0];
                    if (file) {
                      const text = await file.text();
                      const data = JSON.parse(text);
                      importProfile(data);
                    }
                  };
                  input.click();
                }}
              >
                <Upload className="w-4 h-4 mr-2" /> Import Profil
              </Button>
            </div>
          </div>

          {selected && (
            <div className="flex items-center gap-2 border-b border-slate-700">
            </div>
          )}

          <div className="flex items-center justify-between border-b border-slate-700">
            <div className="flex items-center gap-2">
              <button onClick={() => { setSearchParams({}); }} className="text-slate-300 hover:text-white text-sm">← Retour</button>
              <div className="text-slate-200 font-semibold">{selected?.name}</div>
            </div>
            <div className="flex items-center gap-2">
              {(['recon','initial','privesc','post','writeup'] as const).map(t => (
                <button key={t} onClick={() => setDetailTab(t)} className={`px-3 py-2 text-sm ${detailTab === t ? 'text-slate-100 border-b-2 border-blue-500' : 'text-slate-400'}`}>{t === 'recon' ? 'Recon' : t === 'initial' ? 'Accès' : t === 'privesc' ? 'Privesc' : t === 'post' ? 'Post-Exploitation' : 'Writeup'}</button>
              ))}
            </div>
          </div>
        </div>

        <div className="main-content">
          <div className="content-area">
            <div className="content-main p-6 space-y-6">
              {/* Dashboard */}
              {!selected && (
                <Dashboard 
                  projects={projects}
                  stats={stats}
                  getDifficultyColor={getDifficultyColor}
                  onSetCreateModalOpen={setCreateModalOpen}
                />
              )}

              {/* Recon & Enumeration */}
              {selected && detailTab === 'recon' && (
                <Reconnaissance 
                  selected={selected}
                  parsePortScanOutput={parsePortScanOutput}
                  setServiceIdx={setServiceIdx}
                  setServicePageIdx={setServicePageIdx}
                  setServiceNotesDraft={setServiceNotesDraft}
                  setServiceNotesOpen={setServiceNotesOpen}
                  setDetailTab={setDetailTab}
                  showAddService={showAddService}
                  setShowAddService={setShowAddService}
                  newService={newService}
                  setNewService={setNewService}
                />
              )}

              {/* Initial Access */}
              {selected && detailTab === 'initial' && (
                <InitialAccess 
                  selected={selected}
                  setEditingStep={setEditingStep}
                  setExploitModalOpen={setExploitModalOpen}
                />
              )}

              {/* Privesc */}
              {selected && detailTab === 'privesc' && (
                <PrivilegeEscalation 
                  selected={selected}
                  setEditingStep={setEditingStep}
                  setExploitModalOpen={setExploitModalOpen}
                />
              )}

              {/* Post-Exploitation */}
              {selected && detailTab === 'post' && (
                <PostExploitation selected={selected} />
              )}

              {/* Writeup / Template */}
              {selected && detailTab === 'writeup' && (
                <Writeup 
                  selected={selected}
                  generatedMarkdown={generatedMarkdown}
                  writeupEffective={writeupEffective}
                />
              )}
            </div>
          </div>
        </div>
      </div>

      <Modals 
        createModalOpen={createModalOpen}
        setCreateModalOpen={setCreateModalOpen}
        newProjName={newProjName}
        setNewProjName={setNewProjName}
        newProjUrl={newProjUrl}
        setNewProjUrl={setNewProjUrl}
        newProjPlatform={newProjPlatform}
        setNewProjPlatform={setNewProjPlatform}
        newProjDifficulty={newProjDifficulty}
        setNewProjDifficulty={setNewProjDifficulty}
        resetCreateForm={resetCreateForm}
        serviceNotesOpen={serviceNotesOpen}
        setServiceNotesOpen={setServiceNotesOpen}
        serviceIdx={serviceIdx}
        servicePageIdx={servicePageIdx}
        setServicePageIdx={setServicePageIdx}
        serviceNotesDraft={serviceNotesDraft}
        setServiceNotesDraft={setServiceNotesDraft}
        selected={selected}
        renamingPageIdx={renamingPageIdx}
        setRenamingPageIdx={setRenamingPageIdx}
        pageNameDraft={pageNameDraft}
        setPageNameDraft={setPageNameDraft}
        exploitModalOpen={exploitModalOpen}
        setExploitModalOpen={setExploitModalOpen}
        editingStep={editingStep}
        setEditingStep={setEditingStep}
        stepTitle={stepTitle}
        setStepTitle={setStepTitle}
        stepCommand={stepCommand}
        setStepCommand={setStepCommand}
        stepOutput={stepOutput}
        setStepOutput={setStepOutput}
      />
    </>
  );
};
