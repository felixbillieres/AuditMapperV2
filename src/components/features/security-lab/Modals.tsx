import React from 'react';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Textarea } from '../../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';
import { useHTBStore, type HTBProject } from '../../../stores/htbStore';

interface ModalsProps {
  // Create Project Modal
  createModalOpen: boolean;
  setCreateModalOpen: (open: boolean) => void;
  newProjName: string;
  setNewProjName: (name: string) => void;
  newProjUrl: string;
  setNewProjUrl: (url: string) => void;
  newProjPlatform: 'HackTheBox' | 'Offsec' | 'TryHackMe' | 'VulnLab' | 'Autre';
  setNewProjPlatform: (platform: 'HackTheBox' | 'Offsec' | 'TryHackMe' | 'VulnLab' | 'Autre') => void;
  newProjDifficulty: 'Easy' | 'Medium' | 'Hard' | 'Insane';
  setNewProjDifficulty: (difficulty: 'Easy' | 'Medium' | 'Hard' | 'Insane') => void;
  resetCreateForm: () => void;

  // Service Notes Modal
  serviceNotesOpen: boolean;
  setServiceNotesOpen: (open: boolean) => void;
  serviceIdx: number;
  servicePageIdx: number;
  setServicePageIdx: (idx: number) => void;
  serviceNotesDraft: string;
  setServiceNotesDraft: (notes: string) => void;
  selected?: HTBProject;
  renamingPageIdx: number | null;
  setRenamingPageIdx: (idx: number | null) => void;
  pageNameDraft: string;
  setPageNameDraft: (name: string) => void;

  // Exploit Modal
  exploitModalOpen: boolean;
  setExploitModalOpen: (open: boolean) => void;
  editingStep: any;
  setEditingStep: (step: any) => void;
  stepTitle: string;
  setStepTitle: (title: string) => void;
  stepCommand: string;
  setStepCommand: (command: string) => void;
  stepOutput: string;
  setStepOutput: (output: string) => void;
}

export const Modals: React.FC<ModalsProps> = ({
  createModalOpen,
  setCreateModalOpen,
  newProjName,
  setNewProjName,
  newProjUrl,
  setNewProjUrl,
  newProjPlatform,
  setNewProjPlatform,
  newProjDifficulty,
  setNewProjDifficulty,
  resetCreateForm,
  serviceNotesOpen,
  setServiceNotesOpen,
  serviceIdx,
  servicePageIdx,
  setServicePageIdx,
  serviceNotesDraft,
  setServiceNotesDraft,
  selected,
  renamingPageIdx,
  setRenamingPageIdx,
  pageNameDraft,
  setPageNameDraft,
  exploitModalOpen,
  setExploitModalOpen,
  editingStep,
  setEditingStep,
  stepTitle,
  setStepTitle,
  stepCommand,
  setStepCommand,
  stepOutput,
  setStepOutput
}) => {
  const { addProject, updateProject } = useHTBStore();

  return (
    <>
      {/* Modal: Créer un projet */}
      {createModalOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-2xl rounded-lg border border-slate-700 bg-slate-900 shadow-xl">
            <div className="p-4 border-b border-slate-700 text-slate-100 font-semibold">Nouveau Projet</div>
            <div className="p-4 space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-slate-400">Nom du projet</label>
                  <Input value={newProjName} onChange={(e) => setNewProjName(e.target.value)} className="mt-1 bg-slate-700 border-slate-600 text-slate-100" placeholder="Ma nouvelle box" />
                </div>
                <div>
                  <label className="text-sm text-slate-400">URL (optionnel)</label>
                  <Input value={newProjUrl} onChange={(e) => setNewProjUrl(e.target.value)} className="mt-1 bg-slate-700 border-slate-600 text-slate-100" placeholder="https://app.hackthebox.com/machines/..." />
                </div>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-slate-400">Plateforme</label>
                  <Select value={newProjPlatform} onValueChange={setNewProjPlatform}>
                    <SelectTrigger className="mt-1 bg-slate-700 border-slate-600 text-slate-100">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-800 border-slate-600 z-[10000]">
                      <SelectItem value="HackTheBox">🟢 HackTheBox</SelectItem>
                      <SelectItem value="Offsec">🔴 Offsec (PWK/OSCP)</SelectItem>
                      <SelectItem value="TryHackMe">🟠 TryHackMe</SelectItem>
                      <SelectItem value="VulnLab">🔵 VulnLab</SelectItem>
                      <SelectItem value="Autre">⚪ Autre</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm text-slate-400">Difficulté</label>
                  <Select value={newProjDifficulty} onValueChange={setNewProjDifficulty}>
                    <SelectTrigger className="mt-1 bg-slate-700 border-slate-600 text-slate-100">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-800 border-slate-600 z-[10000]">
                      <SelectItem value="Easy">🟢 Easy</SelectItem>
                      <SelectItem value="Medium">🟡 Medium</SelectItem>
                      <SelectItem value="Hard">🔴 Hard</SelectItem>
                      <SelectItem value="Insane">🟣 Insane</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <div className="p-4 border-t border-slate-700 flex justify-end gap-2">
              <Button variant="outline" className="bg-slate-700 border-slate-600 text-slate-200 hover:bg-slate-600" onClick={() => { setCreateModalOpen(false); resetCreateForm(); }}>
                Annuler
              </Button>
              <Button className="bg-blue-600 hover:bg-blue-700" onClick={() => {
                if (newProjName.trim()) {
                  addProject({
                    name: newProjName.trim(),
                    url: newProjUrl.trim() || undefined,
                    platform: newProjPlatform,
                    difficultyLabel: newProjDifficulty
                  });
                  setCreateModalOpen(false);
                  resetCreateForm();
                }
              }}>
                Créer
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Notes de service */}
      {serviceNotesOpen && selected && selected.services[serviceIdx] && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-4xl h-[80vh] rounded-lg border border-slate-700 bg-slate-900 shadow-xl flex flex-col">
            <div className="p-4 border-b border-slate-700 flex items-center justify-between">
              <div className="text-slate-100 font-semibold">
                Notes: {selected.services[serviceIdx].service} ({selected.services[serviceIdx].port}/{selected.services[serviceIdx].proto})
              </div>
              <Button variant="outline" className="bg-slate-700 border-slate-600 text-slate-200 hover:bg-slate-600" onClick={() => setServiceNotesOpen(false)}>
                ✕
              </Button>
            </div>
            
            <div className="flex-1 flex">
              <div className="w-48 border-r border-slate-700 p-2">
                <div className="text-xs text-slate-400 mb-2">Pages de notes</div>
                <div className="space-y-1">
                  {(selected.services[serviceIdx].pageNames || ['Notes principales']).map((pageName, i) => {
                    const isRenaming = renamingPageIdx === i;
                    return (
                      <div key={i} className="flex items-center gap-1">
                        {isRenaming ? (
                          <div className="flex items-center gap-1">
                            <Input 
                              value={pageNameDraft} 
                              onChange={(e) => setPageNameDraft(e.target.value)}
                              className="h-7 text-xs w-24 bg-slate-700 border-slate-600 text-slate-100"
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  const updatedServices = [...selected.services];
                                  if (!updatedServices[serviceIdx].pageNames) updatedServices[serviceIdx].pageNames = ['Notes principales'];
                                  updatedServices[serviceIdx].pageNames![i] = pageNameDraft;
                                  updateProject(selected.id, { services: updatedServices });
                                  setRenamingPageIdx(null);
                                } else if (e.key === 'Escape') {
                                  setRenamingPageIdx(null);
                                }
                              }}
                              autoFocus
                            />
                            <Button size="sm" className="h-7 w-7 p-0 bg-green-600 hover:bg-green-700" onClick={() => {
                              const updatedServices = [...selected.services];
                              if (!updatedServices[serviceIdx].pageNames) updatedServices[serviceIdx].pageNames = ['Notes principales'];
                              updatedServices[serviceIdx].pageNames![i] = pageNameDraft;
                              updateProject(selected.id, { services: updatedServices });
                              setRenamingPageIdx(null);
                            }}>✓</Button>
                          </div>
                        ) : (
                          <>
                            <button 
                              className={`flex-1 text-left px-2 py-1 text-xs rounded ${servicePageIdx === i ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-700'}`}
                              onClick={() => {
                                // Sauvegarder les notes actuelles avant de changer de page
                                const updatedServices = [...selected.services];
                                if (!updatedServices[serviceIdx].pageNotes) updatedServices[serviceIdx].pageNotes = [''];
                                updatedServices[serviceIdx].pageNotes![servicePageIdx] = serviceNotesDraft;
                                updateProject(selected.id, { services: updatedServices });
                                
                                // Changer de page
                                setServicePageIdx(i);
                                setServiceNotesDraft(updatedServices[serviceIdx].pageNotes![i] || '');
                              }}
                            >
                              {pageName}
                            </button>
                            <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-slate-400 hover:text-white" onClick={() => {
                              setPageNameDraft(pageName);
                              setRenamingPageIdx(i);
                            }}>✏️</Button>
                          </>
                        )}
                      </div>
                    );
                  })}
                  <Button size="sm" className="w-full h-7 text-xs bg-slate-700 border-slate-600 text-slate-200 hover:bg-slate-600" onClick={() => {
                    const updatedServices = [...selected.services];
                    if (!updatedServices[serviceIdx].pageNames) updatedServices[serviceIdx].pageNames = ['Notes principales'];
                    if (!updatedServices[serviceIdx].pageNotes) updatedServices[serviceIdx].pageNotes = [''];
                    
                    updatedServices[serviceIdx].pageNames!.push(`Page ${updatedServices[serviceIdx].pageNames!.length + 1}`);
                    updatedServices[serviceIdx].pageNotes!.push('');
                    
                    updateProject(selected.id, { services: updatedServices });
                  }}>+ Page</Button>
                </div>
              </div>
              
              <div className="flex-1 p-4">
                <Textarea 
                  value={serviceNotesDraft}
                  onChange={(e)=> setServiceNotesDraft(e.target.value)}
                  className="flex-1 bg-slate-900 border-slate-700 text-slate-100 font-mono"
                  style={{ height: 'calc(100% - 60px)' }}
                  placeholder="Vos notes pour ce service..."
                />
                <div className="mt-3 flex justify-end gap-2">
                  <Button className="bg-blue-600 hover:bg-blue-700" onClick={() => {
                    const updatedServices = [...selected.services];
                    if (!updatedServices[serviceIdx].pageNotes) updatedServices[serviceIdx].pageNotes = [''];
                    updatedServices[serviceIdx].pageNotes![servicePageIdx] = serviceNotesDraft;
                    updateProject(selected.id, { services: updatedServices });
                    setServiceNotesOpen(false);
                  }}>
                    Sauvegarder
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Ajouter au journal d'exploit */}
      {exploitModalOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-2xl rounded-lg border border-slate-700 bg-slate-900 shadow-xl">
            <div className="p-4 border-b border-slate-700 text-slate-100 font-semibold">
              {editingStep ? 'Modifier l\'étape' : 'Nouvelle étape d\'exploitation'}
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="text-sm text-slate-400">Titre de l'étape</label>
                <Input 
                  value={stepTitle} 
                  onChange={(e) => setStepTitle(e.target.value)} 
                  className="mt-1 bg-slate-700 border-slate-600 text-slate-100" 
                  placeholder="ex: Test SQLi sur /login.php" 
                />
              </div>
              <div>
                <label className="text-sm text-slate-400">Commande utilisée</label>
                <Textarea 
                  rows={3}
                  value={stepCommand} 
                  onChange={(e) => setStepCommand(e.target.value)} 
                  className="mt-1 bg-slate-700 border-slate-600 text-slate-100 font-mono" 
                  placeholder="sqlmap -u 'http://target/login.php' --data 'username=admin&password=test' --dbs" 
                />
              </div>
              <div>
                <label className="text-sm text-slate-400">Résultat / Output</label>
                <Textarea 
                  rows={8}
                  value={stepOutput} 
                  onChange={(e) => setStepOutput(e.target.value)} 
                  className="mt-1 bg-slate-700 border-slate-600 text-slate-100 font-mono" 
                  placeholder="Résultat de la commande, découvertes, erreurs..." 
                />
              </div>
            </div>
            <div className="p-4 border-t border-slate-700 flex justify-end gap-2">
              <Button variant="outline" className="bg-slate-700 border-slate-600 text-slate-200 hover:bg-slate-600" onClick={() => {
                setExploitModalOpen(false);
                setEditingStep(null);
              }}>
                Annuler
              </Button>
              <Button className="bg-blue-600 hover:bg-blue-700" onClick={() => {
                if (!selected) return;
                
                const step = {
                  title: stepTitle,
                  command: stepCommand,
                  output: stepOutput
                };
                
                if (editingStep) {
                  // Modification d'une étape existante
                  const updatedLog = selected.exploitLog.map(s => 
                    s.id === editingStep.id ? { ...s, ...step } : s
                  );
                  updateProject(selected.id, { exploitLog: updatedLog });
                } else {
                  // Nouvelle étape
                  updateProject(selected.id,{ exploitLog: [...selected.exploitLog, { id: `${Date.now()}`, timestamp: new Date().toISOString(), title: step.title, command: step.command, result: step.output }] });
                }
                setExploitModalOpen(false); 
                setEditingStep(null);
              }}>
                {editingStep ? 'Modifier' : 'Ajouter'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
