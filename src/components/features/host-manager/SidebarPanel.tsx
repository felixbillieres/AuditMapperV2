import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Server, 
  X, 
  Plus, 
  Edit, 
  Eye, 
  Shield, 
  Target, 
  FileText, 
  Camera,
  ChevronRight,
  ChevronLeft,
  Network,
  CheckCircle,
  Maximize2
} from 'lucide-react';
import { NotesEditor } from './NotesEditor';
import { ExploitationModal } from './ExploitationModal';
import { GlobalCredentialsView } from './GlobalCredentialsView';
import { GlobalVulnerabilitiesView } from './GlobalVulnerabilitiesView';
import { GlobalScreenshotsView } from './GlobalScreenshotsView';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useHostStore } from '@/stores/hostStore';
import { Host } from '@/types';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import InputDialog from '@/components/ui/InputDialog';

interface SidebarPanelProps {
  selectedHost: Host;
  onClose: () => void;
  onUpdateHost: (host: Host) => void;
  isExpanded?: boolean;
  onExpandChange?: (expanded: boolean) => void;
}

export const SidebarPanel: React.FC<SidebarPanelProps> = ({
  selectedHost,
  onClose,
  onUpdateHost,
  isExpanded = false,
  onExpandChange,
}) => {
  const { updateHost, hosts, categories } = useHostStore();
  // selectedHost vient maintenant directement des props
  const [activeTab, setActiveTab] = useState<'overview' | 'credentials' | 'exploitation' | 'notes' | 'screenshots'>('overview');
  const [showNotesEditor, setShowNotesEditor] = useState(false);
  const [showExploitationModal, setShowExploitationModal] = useState(false);
  const [editingExploitationStep, setEditingExploitationStep] = useState<any>(null);
  const [showVulnerabilitiesView, setShowVulnerabilitiesView] = useState(false);
  const [showScreenshotsView, setShowScreenshotsView] = useState(false);
  const [showGlobalCredentialsView, setShowGlobalCredentialsView] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [confirmRemoveAllConnsOpen, setConfirmRemoveAllConnsOpen] = useState(false);
  const [newUserOpen, setNewUserOpen] = useState(false);
  const [newPassOpen, setNewPassOpen] = useState(false);
  const [newHashOpen, setNewHashOpen] = useState(false);
  const [showPasswords, setShowPasswords] = useState(false);

  // Auto-actualiser la liste des connexions visuelles quand la sidebar s'ouvre
  useEffect(() => {
    const timer = setTimeout(() => {
      if ((window as any).updateConnectionsList) {
        (window as any).updateConnectionsList(selectedHost.id);
      }
    }, 200);
    
    return () => clearTimeout(timer);
  }, [selectedHost.id]);

  const handleUpdateHost = (hostId: string, updates: Partial<Host>) => {
    const updatedHost = { ...selectedHost, ...updates };
    updateHost(hostId, updates);
    onUpdateHost(updatedHost);
  };

  // Le selectedHost vient directement des props maintenant

  useEffect(() => {
    // setEditedNotes(selectedHost.notes || ''); // This line is removed as per the edit hint
  }, [selectedHost.notes]);

  const handleSaveExploitationStep = (stepData: any) => {
    if (editingExploitationStep) {
      // Modifier une étape existante
      const updatedSteps = selectedHost.exploitationSteps.map(step => 
        step.id === editingExploitationStep.id 
          ? { ...stepData, id: editingExploitationStep.id }
          : step
      );
      handleUpdateHost(selectedHost.id, { exploitationSteps: updatedSteps });
    } else {
      // Ajouter une nouvelle étape
      const newStep = {
        ...stepData,
        id: Date.now().toString(),
      };
      handleUpdateHost(selectedHost.id, { 
        exploitationSteps: [...selectedHost.exploitationSteps, newStep]
      });
    }
    setEditingExploitationStep(null);
    setShowExploitationModal(false);
  };

  const handleDeleteExploitationStep = (stepId: string) => {
    const updatedSteps = selectedHost.exploitationSteps.filter(step => step.id !== stepId);
    handleUpdateHost(selectedHost.id, { exploitationSteps: updatedSteps });
  };

  return (
    <motion.div
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '100%' }}
      className="h-full max-h-screen bg-slate-800 border-l border-slate-700 flex flex-col w-full overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-700 bg-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 rounded-full bg-green-500" />
          <div>
            <h2 className="text-lg font-semibold text-slate-100">{selectedHost.ip}</h2>
            <p className="text-sm text-slate-400">{selectedHost.hostname || 'Sans nom'}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onExpandChange?.(!isExpanded)}
            className="bg-slate-700 border-slate-600 text-slate-200 hover:bg-slate-600"
          >
            {isExpanded ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onClose}
            className="bg-slate-700 border-slate-600 text-slate-200 hover:bg-slate-600"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        <div className="p-4">
          {/* Basic Info */}
          <Card className="mb-4 border-slate-700 bg-slate-800">
            <CardHeader>
              <CardTitle className="text-slate-100 flex items-center justify-between">
                Informations de Base
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setConfirmDeleteOpen(true)}
                  className="bg-red-700 border-red-600 text-red-200 hover:bg-red-600"
                >
                  <X className="w-4 h-4 mr-1" />
                  Supprimer
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-slate-400">IP</label>
                  <Input
                    value={selectedHost.ip}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleUpdateHost(selectedHost.id, { ip: e.target.value })}
                    className="mt-1 bg-slate-700 border-slate-600 text-slate-100"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-400">Hostname</label>
                  <Input
                    value={selectedHost.hostname || ''}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleUpdateHost(selectedHost.id, { hostname: e.target.value })}
                    className="mt-1 bg-slate-700 border-slate-600 text-slate-100"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-400">OS</label>
                  <Input
                    value={selectedHost.os || ''}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleUpdateHost(selectedHost.id, { os: e.target.value })}
                    className="mt-1 bg-slate-700 border-slate-600 text-slate-100"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-400">Statut</label>
                  <Select
                    value={selectedHost.status}
                    onValueChange={(value: string) => handleUpdateHost(selectedHost.id, { status: value as any })}
                  >
                    <SelectTrigger className="mt-1 bg-slate-700 border-slate-600 text-slate-100">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-800 border-slate-600">
                      <SelectItem value="active">Actif</SelectItem>
                      <SelectItem value="inactive">Inactif</SelectItem>
                      <SelectItem value="compromised">Compromis</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-400">Priorité</label>
                  <Select
                    value={selectedHost.priority}
                    onValueChange={(value: string) => handleUpdateHost(selectedHost.id, { priority: value as any })}
                  >
                    <SelectTrigger className="mt-1 bg-slate-700 border-slate-600 text-slate-100">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-800 border-slate-600">
                      <SelectItem value="low">Faible</SelectItem>
                      <SelectItem value="medium">Moyenne</SelectItem>
                      <SelectItem value="high">Élevée</SelectItem>
                      <SelectItem value="critical">Critique</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-400">Niveau de compromission</label>
                  <Select
                    value={selectedHost.compromiseLevel}
                    onValueChange={(value: string) => handleUpdateHost(selectedHost.id, { compromiseLevel: value as any })}
                  >
                    <SelectTrigger className="mt-1 bg-slate-700 border-slate-600 text-slate-100">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-800 border-slate-600">
                      <SelectItem value="none">Aucun</SelectItem>
                      <SelectItem value="low">Faible</SelectItem>
                      <SelectItem value="medium">Moyen</SelectItem>
                      <SelectItem value="high">Élevé</SelectItem>
                      <SelectItem value="critical">Critique</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-400">Catégorie</label>
                  <Select
                    value={selectedHost.category && selectedHost.category !== '' ? selectedHost.category : '__none__'}
                    onValueChange={(value: string) => handleUpdateHost(selectedHost.id, { category: value === '__none__' ? '' : value })}
                  >
                    <SelectTrigger className="mt-1 bg-slate-700 border-slate-600 text-slate-100">
                      <SelectValue placeholder="Choisir une catégorie" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-800 border-slate-600">
                      <SelectItem value="__none__">Aucune</SelectItem>
                      {(categories || []).map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Network Connections */}
          <Card className="mb-4 border-slate-700 bg-slate-800">
            <CardHeader>
              <CardTitle className="text-slate-100 flex items-center gap-2">
                <Network className="w-4 h-4" />
                Connexions Réseau
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="text-sm font-medium text-slate-400">Connexions sortantes</label>
                  <div className="space-y-2">
                    {selectedHost.outgoingConnections?.map((conn, index) => (
                      <div key={index} className="flex gap-2 items-center p-2 bg-slate-700 rounded border border-slate-600">
                        <div className="flex-1">
                          <div className="text-xs text-slate-300 font-mono">{conn.toHostId}</div>
                          {conn.cause && (
                            <div className="text-xs text-slate-400 italic">"{conn.cause}"</div>
                          )}
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            if ((window as any).addNetworkConnection) {
                              (window as any).addNetworkConnection(selectedHost.id, conn.toHostId);
                            }
                          }}
                          className="bg-blue-600 hover:bg-blue-700 text-white border-blue-600 w-6 h-6 p-0"
                          title="Créer flèche visuelle"
                        >
                          <Network className="w-3 h-3" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const updatedConnections = selectedHost.outgoingConnections?.filter((_, i) => i !== index) || [];
                            handleUpdateHost(selectedHost.id, { outgoingConnections: updatedConnections });
                          }}
                          className="bg-red-600 hover:bg-red-700 text-white border-red-600 w-6 h-6 p-0"
                          title="Supprimer connexion"
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    ))}
                    
                    {/* Interface simple pour nouvelle connexion */}
                    <div className="bg-slate-700/30 rounded-lg p-3 border border-slate-600">
                      <h4 className="text-sm font-medium text-slate-200 mb-3">Nouvelle Connexion</h4>
                      
                      <div className="space-y-2">
                        <Select 
                          onValueChange={(value: string) => {
                            const causeInput = '' // simplifié; future modal dédiée si besoin
                            
                            console.log('🔥 Création connexion depuis sidebar:', {
                              from: selectedHost.id,
                              to: value,
                              cause: causeInput
                            });
                            
                            // Ajouter aux données
                            const newConnection = {
                              fromHostId: selectedHost.id,
                              toHostId: value,
                              type: 'outgoing' as const,
                              cause: causeInput || undefined,
                              method: 'manual',
                              timestamp: new Date().toISOString(),
                            };
                            const updatedConnections = [...(selectedHost.outgoingConnections || []), newConnection];
                            handleUpdateHost(selectedHost.id, { outgoingConnections: updatedConnections });
                            
                            // Créer la flèche visuelle avec un délai pour être sûr
                            setTimeout(() => {
                              console.log('🔥 Tentative création flèche visuelle...');
                              if ((window as any).addNetworkConnection) {
                                console.log('✅ Fonction addNetworkConnection trouvée, appel...');
                                (window as any).addNetworkConnection(selectedHost.id, value, causeInput || '');
                              } else {
                                console.error('❌ Fonction addNetworkConnection non trouvée!');
                              }
                            }, 100);
                          }}
                        >
                          <SelectTrigger className="bg-slate-800 border-slate-600 text-slate-200">
                            <SelectValue placeholder="Sélectionner l'host de destination..." />
                          </SelectTrigger>
                          <SelectContent className="bg-slate-800 border-slate-600">
                            {Object.values(hosts)
                              .filter(h => h.id !== selectedHost.id)
                              .map(host => (
                                <SelectItem key={host.id} value={host.id} className="text-slate-200">
                                  {host.ip} - {host.hostname || 'Sans nom'} ({host.os || 'Inconnu'})
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                        
                        {/* Affichage des connexions visuelles existantes */}
                        <div className="mt-3 space-y-2">
                          <h5 className="text-xs font-medium text-slate-300">Flèches visuelles actives:</h5>
                          <div id={`visual-connections-${selectedHost.id}`} className="space-y-1 max-h-32 overflow-y-auto">
                            {/* Sera rempli dynamiquement par JavaScript */}
                          </div>
                          

                        </div>
                      </div>
                    </div>
                  </div>
                </div>


              </div>
            </CardContent>
          </Card>



          {/* Tabs */}
          <div className="space-y-4">
            <div className="flex space-x-1 border-b border-slate-700">
              {[
                { id: 'overview', label: 'Vue d\'ensemble', icon: Eye },
                { id: 'credentials', label: 'Credentials', icon: Shield },
                { id: 'exploitation', label: 'Exploitation', icon: Target },
                { id: 'notes', label: 'Notes', icon: FileText },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
                    activeTab === tab.id
                      ? 'bg-slate-700 text-slate-100 border-b-2 border-blue-500'
                      : 'text-slate-400 hover:text-slate-300 hover:bg-slate-700/50'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Tab Content */}
            <div className="space-y-4">
              {/* Overview Tab */}
              {activeTab === 'overview' && (
                <div className="space-y-4">
                  {/* Host Summary Card */}
                  <Card className="border-slate-700 bg-gradient-to-br from-slate-800 to-slate-700">
                  <CardHeader>
                      <CardTitle className="text-slate-100 flex items-center gap-2">
                        <Server className="w-5 h-5 text-blue-400" />
                        Informations générales
                      </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                    <div>
                          <label className="text-xs font-medium text-slate-400 uppercase tracking-wide">IP Address</label>
                          <p className="text-lg font-mono text-blue-400">{selectedHost.ip}</p>
                        </div>
                        <div>
                          <label className="text-xs font-medium text-slate-400 uppercase tracking-wide">Hostname</label>
                          <p className="text-lg text-slate-100">{selectedHost.hostname || 'Non défini'}</p>
                        </div>
                        <div>
                          <label className="text-xs font-medium text-slate-400 uppercase tracking-wide">OS</label>
                          <p className="text-slate-200">{selectedHost.os || 'Non détecté'}</p>
                        </div>
                        <div>
                          <label className="text-xs font-medium text-slate-400 uppercase tracking-wide">Statut</label>
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            selectedHost.status === 'active' ? 'bg-green-900/50 text-green-400 border border-green-700' :
                            selectedHost.status === 'compromised' ? 'bg-orange-900/50 text-orange-400 border border-orange-700' :
                            'bg-slate-700 text-slate-400 border border-slate-600'
                          }`}>
                            {selectedHost.status === 'active' ? '✅ Actif' :
                             selectedHost.status === 'compromised' ? '⚠️ Compromis' :
                             '⚪ Inactif'}
                          </span>
                        </div>
                        <div>
                          <label className="text-xs font-medium text-slate-400 uppercase tracking-wide">Priorité</label>
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            selectedHost.priority === 'critical' ? 'bg-red-900/50 text-red-400 border border-red-700' :
                            selectedHost.priority === 'high' ? 'bg-orange-900/50 text-orange-400 border border-orange-700' :
                            selectedHost.priority === 'medium' ? 'bg-yellow-900/50 text-yellow-400 border border-yellow-700' :
                            'bg-green-900/50 text-green-400 border border-green-700'
                          }`}>
                            {selectedHost.priority === 'critical' ? '🔴 Critique' :
                             selectedHost.priority === 'high' ? '🟠 Élevée' :
                             selectedHost.priority === 'medium' ? '🟡 Moyenne' :
                             '🟢 Faible'}
                          </span>
                        </div>
                        <div>
                          <label className="text-xs font-medium text-slate-400 uppercase tracking-wide">Niveau de compromission</label>
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            selectedHost.compromiseLevel === 'full' ? 'bg-red-900/50 text-red-400 border border-red-700' :
                            selectedHost.compromiseLevel === 'partial' ? 'bg-orange-900/50 text-orange-400 border border-orange-700' :
                            selectedHost.compromiseLevel === 'initial' ? 'bg-yellow-900/50 text-yellow-400 border border-yellow-700' :
                            'bg-slate-700 text-slate-400 border border-slate-600'
                          }`}>
                            {selectedHost.compromiseLevel === 'full' ? '🔓 Complet' :
                             selectedHost.compromiseLevel === 'partial' ? '🔒 Partiel' :
                             selectedHost.compromiseLevel === 'initial' ? '🔑 Initial' :
                             '🛡️ Aucun'}
                          </span>
                        </div>
                      </div>

                      {/* Services résumés */}
                      <div className="mt-2">
                        <label className="text-xs font-medium text-slate-400 uppercase tracking-wide">Services détectés</label>
                        {(() => {
                          const svc = (selectedHost.services && selectedHost.services.length > 0)
                            ? selectedHost.services
                            : (selectedHost.ports || []).map(p => ({ name: p.service || '', port: p.port, status: p.status, version: p.version }));
                          if (!svc || svc.length === 0) {
                            return <div className="text-slate-400 text-sm">Aucun service.</div>;
                          }
                          return (
                            <div className="mt-1 max-h-40 overflow-auto rounded border border-slate-700 bg-slate-800/40">
                              <table className="w-full text-xs">
                                <thead>
                                  <tr className="text-slate-300 bg-slate-800">
                                    <th className="text-left px-3 py-1">Port</th>
                                    <th className="text-left px-3 py-1">Service</th>
                                    <th className="text-left px-3 py-1">Version</th>
                                    <th className="text-left px-3 py-1">Statut</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {svc.map((s, i) => (
                                    <tr key={`${s.port}-${s.name}-${i}`} className="border-t border-slate-700">
                                      <td className="px-3 py-1 font-mono text-slate-100">{s.port}</td>
                                      <td className="px-3 py-1 text-slate-200">{s.name || '-'}</td>
                                      <td className="px-3 py-1 text-slate-300">{s.version || '-'}</td>
                                      <td className="px-3 py-1 text-slate-300">{s.status || '-'}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          );
                        })()}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Quick Notes Preview */}
                  {selectedHost.notes && (
                    <Card className="border-slate-700 bg-slate-800">
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-slate-100 flex items-center gap-2">
                            <FileText className="w-5 h-5 text-blue-400" />
                            Aperçu des notes
                          </CardTitle>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setShowNotesEditor(true)}
                            className="bg-blue-600 hover:bg-blue-700 text-white border-blue-600"
                          >
                            <Maximize2 className="w-4 h-4 mr-2" />
                            Ouvrir l'éditeur
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="text-slate-300 whitespace-pre-wrap max-h-20 overflow-hidden relative">
                          {selectedHost.notes.substring(0, 150)}
                          {selectedHost.notes.length > 150 && (
                            <div className="absolute bottom-0 right-0 bg-gradient-to-l from-slate-800 to-transparent pl-8 text-slate-400">
                              ...
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              )}

              {/* Credentials Tab */}
              {activeTab === 'credentials' && (
                <div className="space-y-4">
                  {/* Summary */}
                  <Card className="border-slate-700 bg-gradient-to-br from-slate-800 to-slate-700">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Shield className="w-8 h-8 text-purple-400" />
                          <div>
                            <h3 className="text-lg font-semibold text-slate-100">Credentials collectés</h3>
                            <p className="text-sm text-slate-400">
                              {selectedHost.usernames.length + selectedHost.passwords.length + selectedHost.hashes.length} éléments au total
                            </p>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Usernames */}
                  <Card className="border-slate-700 bg-slate-800">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-slate-100 text-sm">👤 Usernames ({selectedHost.usernames.length})</CardTitle>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => { setNewUserOpen(true); }}
                          className="bg-slate-700 border-slate-600 text-slate-200 hover:bg-slate-600"
                        >
                          <Plus className="w-3 h-3" />
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-2 max-h-40 overflow-y-auto">
                      {selectedHost.usernames.length === 0 ? (
                        <p className="text-slate-500 text-sm italic">Aucun username collecté</p>
                      ) : (
                        selectedHost.usernames.map((username, index) => (
                          <div key={index} className="flex items-center gap-2 p-2 bg-slate-700/50 rounded">
                            <code className="flex-1 text-sm text-green-400 font-mono">{username}</code>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => navigator.clipboard.writeText(username)}
                              className="bg-slate-600 border-slate-500 text-slate-200 hover:bg-slate-500 p-1"
                            >
                              📋
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                const newUsernames = selectedHost.usernames.filter((_, i) => i !== index);
                                handleUpdateHost(selectedHost.id, { usernames: newUsernames });
                              }}
                              className="bg-red-600 hover:bg-red-700 text-white p-1"
                            >
                              <X className="w-3 h-3" />
                            </Button>
                          </div>
                        ))
                      )}
                    </CardContent>
                  </Card>

                    {/* Passwords */}
                  <Card className="border-slate-700 bg-slate-800">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-slate-100 text-sm">🔑 Passwords ({selectedHost.passwords.length})</CardTitle>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => { setNewPassOpen(true); }}
                          className="bg-slate-700 border-slate-600 text-slate-200 hover:bg-slate-600"
                        >
                          <Plus className="w-3 h-3" />
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-2 max-h-40 overflow-y-auto">
                      <div className="flex items-center gap-2 text-xs text-slate-400">
                        <label className="flex items-center gap-2"><input type="checkbox" checked={showPasswords} onChange={(e)=>setShowPasswords(e.target.checked)} /> Afficher les mots de passe</label>
                      </div>
                      {selectedHost.passwords.length === 0 ? (
                        <p className="text-slate-500 text-sm italic">Aucun password collecté</p>
                      ) : (
                        selectedHost.passwords.map((password, index) => (
                          <div key={index} className="flex items-center gap-2 p-2 bg-slate-700/50 rounded">
                            <code className="flex-1 text-sm text-yellow-400 font-mono break-words">{showPasswords ? password : '•'.repeat(password.length)}</code>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => navigator.clipboard.writeText(password)}
                              className="bg-slate-600 border-slate-500 text-slate-200 hover:bg-slate-500 p-1"
                            >
                              📋
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                const newPasswords = selectedHost.passwords.filter((_, i) => i !== index);
                                handleUpdateHost(selectedHost.id, { passwords: newPasswords });
                              }}
                              className="bg-red-600 hover:bg-red-700 text-white p-1"
                            >
                              <X className="w-3 h-3" />
                            </Button>
                          </div>
                        ))
                      )}
                    </CardContent>
                  </Card>

                    {/* Hashes */}
                  <Card className="border-slate-700 bg-slate-800">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-slate-100 text-sm">🔐 Hashes ({selectedHost.hashes.length})</CardTitle>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => { setNewHashOpen(true); }}
                          className="bg-slate-700 border-slate-600 text-slate-200 hover:bg-slate-600"
                        >
                          <Plus className="w-3 h-3" />
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-2 max-h-40 overflow-y-auto">
                      {selectedHost.hashes.length === 0 ? (
                        <p className="text-slate-500 text-sm italic">Aucun hash collecté</p>
                      ) : (
                        selectedHost.hashes.map((hash, index) => (
                          <div key={index} className="flex items-center gap-2 p-2 bg-slate-700/50 rounded">
                            <code className="flex-1 text-sm text-orange-400 font-mono truncate">{hash}</code>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => navigator.clipboard.writeText(hash)}
                              className="bg-slate-600 border-slate-500 text-slate-200 hover:bg-slate-500 p-1"
                            >
                              📋
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                const newHashes = selectedHost.hashes.filter((_, i) => i !== index);
                                handleUpdateHost(selectedHost.id, { hashes: newHashes });
                              }}
                              className="bg-red-600 hover:bg-red-700 text-white p-1"
                            >
                              <X className="w-3 h-3" />
                            </Button>
                          </div>
                        ))
                      )}
                  </CardContent>
                </Card>
                </div>
              )}

              {/* Exploitation Tab - Version compacte */}
              {activeTab === 'exploitation' && (
                <div className="space-y-4">
                  {/* Summary */}
                  <Card className="border-slate-700 bg-gradient-to-br from-slate-800 to-slate-700">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Target className="w-8 h-8 text-red-400" />
                          <div>
                            <h3 className="text-lg font-semibold text-slate-100">Exploitation</h3>
                            <p className="text-sm text-slate-400">
                              {selectedHost.exploitationSteps?.length || 0} étapes • {selectedHost.vulnerabilities?.length || 0} vulnérabilités
                            </p>
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setEditingExploitationStep(null);
                            setShowExploitationModal(true);
                          }}
                          className="bg-slate-700 border-slate-600 text-slate-200 hover:bg-slate-600"
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          Nouvelle étape
                        </Button>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Exploitation Steps - Aperçu compact */}
                  <Card className="border-slate-700 bg-slate-800">
                    <CardHeader>
                      <CardTitle className="text-slate-100 text-sm">🎯 Étapes d'exploitation</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 max-h-80 overflow-y-auto">
                      {selectedHost.exploitationSteps?.length === 0 ? (
                        <p className="text-slate-500 text-sm italic">Aucune étape d'exploitation</p>
                      ) : (
                        selectedHost.exploitationSteps?.map((step, index) => (
                          <div key={step.id} className="p-3 bg-slate-700/50 rounded border border-slate-600 hover:bg-slate-700/70 transition-colors">
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <h4 className="font-medium text-slate-100 text-sm truncate" title={step.title}>{index + 1}. {step.title}</h4>
                                  <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${
                                    step.severity === 'Critical' ? 'bg-red-900/50 text-red-400' :
                                    step.severity === 'High' ? 'bg-orange-900/50 text-orange-400' :
                                    step.severity === 'Medium' ? 'bg-yellow-900/50 text-yellow-400' :
                                    'bg-green-900/50 text-green-400'
                                  }`}>{step.severity}</span>
                                  <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${
                                    step.status === 'completed' ? 'bg-green-900/50 text-green-400' :
                                    step.status === 'in_progress' ? 'bg-blue-900/50 text-blue-400' :
                                    step.status === 'failed' ? 'bg-red-900/50 text-red-400' :
                                    'bg-slate-600 text-slate-400'
                                  }`}>
                                    {step.status === 'completed' ? 'Terminé' : step.status === 'in_progress' ? 'En cours' : step.status === 'failed' ? 'Échoué' : 'En attente'}
                                  </span>
                                </div>
                                <p className="text-xs text-slate-300 mt-1 line-clamp-2">{step.description}</p>
                              </div>
                              <div className="flex items-center gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                     onClick={() => { setEditingExploitationStep(step); setShowExploitationModal(true); }}
                                  className="bg-slate-600 border-slate-500 text-slate-200 hover:bg-slate-500 p-1"
                                >
                                  <Edit className="w-3 h-3" />
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleDeleteExploitationStep(step.id)}
                                  className="bg-red-600 hover:bg-red-700 text-white p-1"
                                >
                                  <X className="w-3 h-3" />
                                </Button>
                                {/* Reorder simple */}
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    if (index === 0) return;
                                    const steps = [...selectedHost.exploitationSteps];
                                    const tmp = steps[index - 1];
                                    steps[index - 1] = steps[index];
                                    steps[index] = tmp;
                                    handleUpdateHost(selectedHost.id, { exploitationSteps: steps });
                                  }}
                                  className="bg-slate-600 border-slate-500 text-slate-200 hover:bg-slate-500 p-1"
                                  title="Monter"
                                >
                                  ↑
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    const steps = [...selectedHost.exploitationSteps];
                                    if (index >= steps.length - 1) return;
                                    const tmp = steps[index + 1];
                                    steps[index + 1] = steps[index];
                                    steps[index] = tmp;
                                    handleUpdateHost(selectedHost.id, { exploitationSteps: steps });
                                  }}
                                  className="bg-slate-600 border-slate-500 text-slate-200 hover:bg-slate-500 p-1"
                                  title="Descendre"
                                >
                                  ↓
                                </Button>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </CardContent>
                  </Card>
                </div>
              )}



              {/* Notes Tab */}
              {activeTab === 'notes' && (
                <Card className="border-slate-700 bg-slate-800">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-slate-100">Notes</CardTitle>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowNotesEditor(true)}
                        className="bg-blue-600 hover:bg-blue-700 text-white border-blue-600"
                      >
                        <Maximize2 className="w-4 h-4 mr-2" />
                        Ouvrir l'éditeur de notes
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-slate-400 italic">Cliquez sur le bouton pour ouvrir l'éditeur de notes pentest complet.</div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Notes Editor Modal */}
      {showNotesEditor && (
        <NotesEditor
          host={selectedHost}
          onClose={() => setShowNotesEditor(false)}
          onSave={(notes) => {
            handleUpdateHost(selectedHost.id, { notes });
            // Mettre à jour l'état local pour cohérence instantanée
            const updated = { ...selectedHost, notes };
            onUpdateHost(updated);
            setShowNotesEditor(false);
          }}
        />
      )}

      {/* Exploitation Modal */}
      {showExploitationModal && (
        <ExploitationModal
          isOpen={showExploitationModal}
          onClose={() => {
            setShowExploitationModal(false);
            setEditingExploitationStep(null);
          }}
          onSave={handleSaveExploitationStep}
          editingStep={editingExploitationStep}
        />
      )}

      {/* Global Credentials View */}
      {showGlobalCredentialsView && (
        <GlobalCredentialsView
          isOpen={showGlobalCredentialsView}
          onClose={() => setShowGlobalCredentialsView(false)}
        />
      )}

      {/* Global Vulnerabilities View */}
      {showVulnerabilitiesView && (
        <GlobalVulnerabilitiesView
          isOpen={showVulnerabilitiesView}
          onClose={() => setShowVulnerabilitiesView(false)}
        />
      )}

      {/* Global Screenshots View */}
      {showScreenshotsView && (
        <GlobalScreenshotsView
          isOpen={showScreenshotsView}
          onClose={() => setShowScreenshotsView(false)}
        />
      )}

      {/* Confirm Delete Host */}
      <ConfirmDialog
        open={confirmDeleteOpen}
        title={`Supprimer l'hôte ${selectedHost.ip} ?`}
        description={selectedHost.hostname || ''}
        confirmText="Supprimer"
        onConfirm={() => {
          const { deleteHost } = useHostStore.getState();
          deleteHost(selectedHost.id);
          setConfirmDeleteOpen(false);
          onClose();
        }}
        onCancel={() => setConfirmDeleteOpen(false)}
      />

      {/* Confirm Remove All Connections */}
      <ConfirmDialog
        open={confirmRemoveAllConnsOpen}
        title={`Supprimer toutes les flèches de ${selectedHost.ip} ?`}
        confirmText="Supprimer"
        onConfirm={() => {
          if ((window as any).removeHostConnections) {
            (window as any).removeHostConnections(selectedHost.id);
          }
          setConfirmRemoveAllConnsOpen(false);
        }}
        onCancel={() => setConfirmRemoveAllConnsOpen(false)}
      />

      <InputDialog
        open={newUserOpen}
        title="Ajouter un username"
        placeholder="username"
        onCancel={()=>setNewUserOpen(false)}
        onConfirm={(val)=>{ handleUpdateHost(selectedHost.id,{ usernames:[...selectedHost.usernames, val]}); setNewUserOpen(false); }}
      />
      <InputDialog
        open={newPassOpen}
        title="Ajouter un password"
        placeholder="password"
        type="text"
        onCancel={()=>setNewPassOpen(false)}
        onConfirm={(val)=>{ handleUpdateHost(selectedHost.id,{ passwords:[...selectedHost.passwords, val]}); setNewPassOpen(false); }}
      />
      <InputDialog
        open={newHashOpen}
        title="Ajouter un hash"
        placeholder="hash"
        onCancel={()=>setNewHashOpen(false)}
        onConfirm={(val)=>{ handleUpdateHost(selectedHost.id,{ hashes:[...selectedHost.hashes, val]}); setNewHashOpen(false); }}
      />
    </motion.div>
  );
};
