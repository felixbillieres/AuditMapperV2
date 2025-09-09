import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Server, 
  X, 
  Plus, 
  Eye, 
  Shield, 
  Target, 
  FileText, 
  Camera,
  Network,
  CheckCircle,
  AlertTriangle,
  Edit,
  Save,
  Trash2,
  Link,
  Monitor
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useHostStore } from '@/stores/hostStore';
import { Host } from '@/types';
import { NotesEditor } from './NotesEditor';
import { ExploitationModal } from './ExploitationModal';
import { GlobalCredentialsView } from './GlobalCredentialsView';
import { GlobalVulnerabilitiesView } from './GlobalVulnerabilitiesView';
import { GlobalScreenshotsView } from './GlobalScreenshotsView';
import InputDialog from '@/components/ui/InputDialog';

interface ExpandedHostModalProps {
  currentHost: Host;
  isOpen: boolean;
  onClose: () => void;
  onUpdateHost: (host: Host) => void;
}

export const ExpandedHostModal: React.FC<ExpandedHostModalProps> = ({
  currentHost: selectedHost,
  isOpen,
  onClose,
  onUpdateHost,
}) => {
  const { updateHost, hosts, categories } = useHostStore();
  
  // Vérification de sécurité
  if (!selectedHost || !isOpen) {
    return null;
  }
  
  // Utiliser les données du store pour s'assurer d'avoir les dernières données
  const currentHost = hosts[selectedHost.id] || selectedHost;
  
  // Mettre à jour les états d'édition quand currentHost change
  useEffect(() => {
    setEditingHostname(currentHost.hostname || '');
    setEditingOs(currentHost.os || '');
    setEditingStatus(currentHost.status || 'up');
    setEditingPriority(currentHost.priority || 'medium');
    setEditingCompromiseLevel(currentHost.compromiseLevel || 'none');
    setEditingCategory(currentHost.category || '');
  }, [currentHost]);
  const [activeTab, setActiveTab] = useState<'overview' | 'credentials' | 'exploitation' | 'notes' | 'screenshots' | 'connections' | 'ports' | 'services' | 'vulnerabilities'>('overview');
  const [showNotesEditor, setShowNotesEditor] = useState(false);
  const [showExploitationModal, setShowExploitationModal] = useState(false);
  const [showVulnerabilitiesView, setShowVulnerabilitiesView] = useState(false);
  const [showScreenshotsView, setShowScreenshotsView] = useState(false);
  const [newUserOpen, setNewUserOpen] = useState(false);
  const [newPassOpen, setNewPassOpen] = useState(false);
  const [newHashOpen, setNewHashOpen] = useState(false);
  const [editingExploitationStep, setEditingExploitationStep] = useState<any>(null);

  
  // États pour l'édition des informations de base
  const [isEditingBasicInfo, setIsEditingBasicInfo] = useState(false);
  const [editingHostname, setEditingHostname] = useState(currentHost.hostname || '');
  const [editingOs, setEditingOs] = useState(currentHost.os || '');
  const [editingStatus, setEditingStatus] = useState(currentHost.status || 'up');
  const [editingPriority, setEditingPriority] = useState(currentHost.priority || 'medium');
  const [editingCompromiseLevel, setEditingCompromiseLevel] = useState(currentHost.compromiseLevel || 'none');
  const [editingCategory, setEditingCategory] = useState(currentHost.category || '');
  
  // États pour l'ajout de connexions
  const [showAddConnection, setShowAddConnection] = useState(false);
  const [newConnection, setNewConnection] = useState({
    targetHost: '',
    connectionType: 'lateral',
    description: ''
  });
  
  // États pour l'édition des ports
  const [showAddPort, setShowAddPort] = useState(false);
  const [newPort, setNewPort] = useState({
    port: '',
    protocol: 'tcp',
    status: 'open',
    service: '',
    description: ''
  });
  
  // États pour l'édition des services
  const [showAddService, setShowAddService] = useState(false);
  const [newService, setNewService] = useState({
    name: '',
    port: '',
    status: 'open',
    description: '',
    version: ''
  });
  
  // États pour l'édition des vulnérabilités
  const [showAddVulnerability, setShowAddVulnerability] = useState(false);
  const [newVulnerability, setNewVulnerability] = useState({
    title: '',
    description: '',
    severity: 'Medium',
    cve: '',
    status: 'open'
  });

  const handleUpdateHost = (hostId: string, updates: Partial<Host>) => {
    const updatedHost = { ...currentHost, ...updates };
    updateHost(hostId, updates);
    onUpdateHost(updatedHost);
  };

  const handleRemoveUsername = (index: number) => {
    const newUsernames = currentHost.usernames?.filter((_, i) => i !== index) || [];
    handleUpdateHost(currentHost.id, { usernames: newUsernames });
  };

  const handleRemovePassword = (index: number) => {
    const newPasswords = currentHost.passwords?.filter((_, i) => i !== index) || [];
    handleUpdateHost(currentHost.id, { passwords: newPasswords });
  };

  const handleRemoveHash = (index: number) => {
    const newHashes = currentHost.hashes?.filter((_, i) => i !== index) || [];
    handleUpdateHost(currentHost.id, { hashes: newHashes });
  };

  const handleSaveBasicInfo = () => {
    handleUpdateHost(currentHost.id, {
      hostname: editingHostname,
      os: editingOs,
      status: editingStatus,
      priority: editingPriority,
      compromiseLevel: editingCompromiseLevel,
      category: editingCategory
    });
    setIsEditingBasicInfo(false);
  };

  const handleCancelEdit = () => {
    setEditingHostname(currentHost.hostname || '');
    setEditingOs(currentHost.os || '');
    setEditingStatus(currentHost.status || 'up');
    setEditingPriority(currentHost.priority || 'medium');
    setEditingCompromiseLevel(currentHost.compromiseLevel || 'none');
    setEditingCategory(currentHost.category || '');
    setIsEditingBasicInfo(false);
  };

  const handleAddConnection = () => {
    if (!newConnection.targetHost.trim()) return;
    
    const connection = {
      id: Date.now().toString(),
      targetHost: newConnection.targetHost,
      type: newConnection.connectionType,
      description: newConnection.description,
      timestamp: new Date().toISOString()
    };
    
    const updatedConnections = [...(currentHost.connections || []), connection];
    handleUpdateHost(currentHost.id, { connections: updatedConnections });
    
    setNewConnection({ targetHost: '', connectionType: 'lateral', description: '' });
    setShowAddConnection(false);
  };

  const handleRemoveConnection = (connectionId: string) => {
    const updatedConnections = currentHost.connections?.filter(c => c.id !== connectionId) || [];
    handleUpdateHost(currentHost.id, { connections: updatedConnections });
  };

  // Fonctions pour les ports
  const handleAddPort = () => {
    if (!newPort.port.trim()) return;
    
    const port = {
      port: parseInt(newPort.port),
      protocol: newPort.protocol as 'tcp' | 'udp',
      status: newPort.status as 'open' | 'closed' | 'filtered',
      service: newPort.service || undefined,
      description: newPort.description || undefined
    };
    
    const updatedPorts = [...(currentHost.ports || []), port];
    handleUpdateHost(currentHost.id, { ports: updatedPorts });
    
    setNewPort({ port: '', protocol: 'tcp', status: 'open', service: '', description: '' });
    setShowAddPort(false);
  };

  const handleRemovePort = (index: number) => {
    const updatedPorts = currentHost.ports?.filter((_, i) => i !== index) || [];
    handleUpdateHost(currentHost.id, { ports: updatedPorts });
  };

  // Fonctions pour les services
  const handleAddService = () => {
    if (!newService.name.trim()) return;
    
    const service = {
      name: newService.name,
      port: parseInt(newService.port) || 0,
      status: newService.status as 'open' | 'closed' | 'filtered',
      description: newService.description || undefined,
      version: newService.version || undefined
    };
    
    const updatedServices = [...(currentHost.services || []), service];
    handleUpdateHost(currentHost.id, { services: updatedServices });
    
    setNewService({ name: '', port: '', status: 'open', description: '', version: '' });
    setShowAddService(false);
  };

  const handleRemoveService = (index: number) => {
    const updatedServices = currentHost.services?.filter((_, i) => i !== index) || [];
    handleUpdateHost(currentHost.id, { services: updatedServices });
  };

  // Fonctions pour les vulnérabilités
  const handleAddVulnerability = () => {
    if (!newVulnerability.title.trim()) return;
    
    const vulnerability = {
      id: Date.now().toString(),
      title: newVulnerability.title,
      description: newVulnerability.description,
      severity: newVulnerability.severity as 'Low' | 'Medium' | 'High' | 'Critical',
      cve: newVulnerability.cve || undefined,
      status: newVulnerability.status as 'open' | 'closed' | 'in_progress',
      exploitAvailable: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    const updatedVulnerabilities = [...(currentHost.vulnerabilities || []), vulnerability];
    handleUpdateHost(currentHost.id, { vulnerabilities: updatedVulnerabilities });
    
    setNewVulnerability({ title: '', description: '', severity: 'Medium', cve: '', status: 'open' });
    setShowAddVulnerability(false);
  };

  const handleRemoveVulnerability = (vulnerabilityId: string) => {
    const updatedVulnerabilities = currentHost.vulnerabilities?.filter(v => v.id !== vulnerabilityId) || [];
    handleUpdateHost(currentHost.id, { vulnerabilities: updatedVulnerabilities });
  };

  // Fonctions pour les étapes d'exploitation
  const handleSaveExploitationStep = (stepData: any) => {
    if (editingExploitationStep) {
      // Modifier une étape existante
      const updatedSteps = (currentHost.exploitationSteps || []).map(step => 
        step.id === editingExploitationStep.id 
          ? { ...stepData, id: editingExploitationStep.id }
          : step
      );
      handleUpdateHost(currentHost.id, { exploitationSteps: updatedSteps });
    } else {
      // Ajouter une nouvelle étape
      const newStep = {
        ...stepData,
        id: Date.now().toString(),
      };
      handleUpdateHost(currentHost.id, { 
        exploitationSteps: [...(currentHost.exploitationSteps || []), newStep]
      });
    }
    setEditingExploitationStep(null);
    setShowExploitationModal(false);
  };

  const handleDeleteExploitationStep = (stepId: string) => {
    const updatedSteps = (currentHost.exploitationSteps || []).filter(step => step.id !== stepId);
    handleUpdateHost(currentHost.id, { exploitationSteps: updatedSteps });
  };

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="w-full max-w-7xl h-[95vh] rounded-lg border border-slate-700 bg-slate-900 shadow-2xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header du modal */}
        <div className="p-6 border-b border-slate-700 flex items-center justify-between sticky top-0 bg-slate-900 z-10">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-slate-700 rounded-lg flex items-center justify-center">
                <Server className="w-6 h-6 text-slate-300" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-slate-100">{currentHost.ip}</h2>
                <p className="text-lg text-slate-400">{currentHost.hostname || 'Sans nom'}</p>
              </div>
            </div>
          </div>
          <Button
            variant="outline"
            onClick={onClose}
            className="bg-slate-800 border-slate-600 text-slate-200 hover:bg-slate-700"
          >
            <X className="w-5 h-5 mr-2" />
            Fermer
          </Button>
        </div>

        {/* Contenu du modal */}
        <div className="flex-1 overflow-hidden">
          <div className="h-full flex">
            {/* Navigation latérale */}
            <div className="w-64 bg-slate-800/50 border-r border-slate-700 p-4">
              <nav className="space-y-2">
                {[
                  { id: 'overview', label: 'Vue d\'ensemble', icon: Eye },
                  { id: 'credentials', label: 'Credentials', icon: Shield },
                  { id: 'exploitation', label: 'Exploitation', icon: Target },
                  { id: 'connections', label: 'Connexions', icon: Network },
                  { id: 'ports', label: 'Ports', icon: Server },
                  { id: 'services', label: 'Services', icon: Monitor },
                  { id: 'vulnerabilities', label: 'Vulnérabilités', icon: AlertTriangle },
                  { id: 'notes', label: 'Notes', icon: FileText },
                  { id: 'screenshots', label: 'Captures', icon: Camera }
                ].map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id as any)}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors ${
                        activeTab === tab.id
                          ? 'bg-blue-600 text-white'
                          : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                      {tab.label}
                    </button>
                  );
                })}
              </nav>
            </div>

            {/* Contenu principal */}
            <div className="flex-1 overflow-auto p-6">
              {activeTab === 'overview' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {/* Informations de base */}
                    <Card className="bg-slate-800 border-slate-700">
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-slate-100 text-lg">Informations de base</CardTitle>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setIsEditingBasicInfo(!isEditingBasicInfo)}
                            className="text-slate-400 hover:text-slate-200"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div>
                          <label className="text-sm text-slate-400">Adresse IP</label>
                          <p className="text-slate-100 font-mono">{currentHost.ip}</p>
                        </div>
                        <div>
                          <label className="text-sm text-slate-400">Nom d'hôte</label>
                          {isEditingBasicInfo ? (
                            <Input
                              value={editingHostname}
                              onChange={(e) => setEditingHostname(e.target.value)}
                              placeholder="Nom d'hôte"
                              className="mt-1"
                            />
                          ) : (
                            <p className="text-slate-100">{currentHost.hostname || 'Non défini'}</p>
                          )}
                        </div>
                        <div>
                          <label className="text-sm text-slate-400">Système d'exploitation</label>
                          {isEditingBasicInfo ? (
                            <Input
                              value={editingOs}
                              onChange={(e) => setEditingOs(e.target.value)}
                              placeholder="Système d'exploitation"
                              className="mt-1"
                            />
                          ) : (
                            <p className="text-slate-100">{currentHost.os || 'Non détecté'}</p>
                          )}
                        </div>
                        <div>
                          <label className="text-sm text-slate-400">Statut</label>
                          {isEditingBasicInfo ? (
                            <Select value={editingStatus} onValueChange={setEditingStatus}>
                              <SelectTrigger className="mt-1">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="up">Up</SelectItem>
                                <SelectItem value="down">Down</SelectItem>
                                <SelectItem value="unknown">Unknown</SelectItem>
                                <SelectItem value="active">Active</SelectItem>
                                <SelectItem value="inactive">Inactive</SelectItem>
                                <SelectItem value="compromised">Compromised</SelectItem>
                              </SelectContent>
                            </Select>
                          ) : (
                            <div className="flex items-center gap-2">
                              <div className={`w-2 h-2 rounded-full ${
                                currentHost.status === 'up' || currentHost.status === 'active' ? 'bg-green-500' : 
                                currentHost.status === 'down' || currentHost.status === 'inactive' ? 'bg-red-500' : 
                                currentHost.status === 'compromised' ? 'bg-orange-500' : 'bg-gray-500'
                              }`} />
                              <span className="text-slate-100 capitalize">{currentHost.status}</span>
                            </div>
                          )}
                        </div>
                        <div>
                          <label className="text-sm text-slate-400">Priorité</label>
                          {isEditingBasicInfo ? (
                            <Select value={editingPriority} onValueChange={setEditingPriority}>
                              <SelectTrigger className="mt-1">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="low">Faible</SelectItem>
                                <SelectItem value="medium">Moyenne</SelectItem>
                                <SelectItem value="high">Élevée</SelectItem>
                                <SelectItem value="critical">Critique</SelectItem>
                              </SelectContent>
                            </Select>
                          ) : (
                            <div className="flex items-center gap-2">
                              <div className={`w-2 h-2 rounded-full ${
                                currentHost.priority === 'critical' ? 'bg-red-500' : 
                                currentHost.priority === 'high' ? 'bg-orange-500' : 
                                currentHost.priority === 'medium' ? 'bg-yellow-500' : 'bg-green-500'
                              }`} />
                              <span className="text-slate-100 capitalize">{currentHost.priority}</span>
                            </div>
                          )}
                        </div>
                        <div>
                          <label className="text-sm text-slate-400">Niveau de compromission</label>
                          {isEditingBasicInfo ? (
                            <Select value={editingCompromiseLevel} onValueChange={setEditingCompromiseLevel}>
                              <SelectTrigger className="mt-1">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">Aucun</SelectItem>
                                <SelectItem value="initial">Initial</SelectItem>
                                <SelectItem value="partial">Partiel</SelectItem>
                                <SelectItem value="full">Complet</SelectItem>
                              </SelectContent>
                            </Select>
                          ) : (
                            <div className="flex items-center gap-2">
                              <div className={`w-2 h-2 rounded-full ${
                                currentHost.compromiseLevel === 'full' ? 'bg-red-500' : 
                                currentHost.compromiseLevel === 'partial' ? 'bg-orange-500' : 
                                currentHost.compromiseLevel === 'initial' ? 'bg-yellow-500' : 'bg-green-500'
                              }`} />
                              <span className="text-slate-100 capitalize">{currentHost.compromiseLevel}</span>
                            </div>
                          )}
                        </div>
                        <div>
                          <label className="text-sm text-slate-400">Catégorie</label>
                          {isEditingBasicInfo ? (
                            <Select value={editingCategory || '__none__'} onValueChange={(value) => setEditingCategory(value === '__none__' ? '' : value)}>
                              <SelectTrigger className="mt-1">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="__none__">Aucune catégorie</SelectItem>
                                {categories.map((category) => (
                                  <SelectItem key={category.id} value={category.id}>
                                    {category.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : (
                            <p className="text-slate-100">
                              {currentHost.category ? 
                                categories.find(c => c.id === currentHost.category)?.name || 'Catégorie inconnue' : 
                                'Aucune catégorie'
                              }
                            </p>
                          )}
                        </div>
                        {isEditingBasicInfo && (
                          <div className="flex gap-2 pt-2">
                            <Button
                              size="sm"
                              onClick={handleSaveBasicInfo}
                              className="bg-green-600 hover:bg-green-700 text-white"
                            >
                              <Save className="w-4 h-4 mr-1" />
                              Sauvegarder
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={handleCancelEdit}
                              className="border-slate-600 text-slate-200 hover:bg-slate-700"
                            >
                              Annuler
                            </Button>
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    {/* Statistiques */}
                    <Card className="bg-slate-800 border-slate-700">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-slate-100 text-lg">Statistiques</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="flex justify-between">
                          <span className="text-slate-400">Ports ouverts</span>
                          <span className="text-slate-100 font-semibold">{currentHost.ports?.length || 0}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Services</span>
                          <span className="text-slate-100 font-semibold">{currentHost.services?.length || 0}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Vulnérabilités</span>
                          <span className="text-slate-100 font-semibold">{currentHost.vulnerabilities?.length || 0}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Credentials</span>
                          <span className="text-slate-100 font-semibold">
                            {(currentHost.usernames?.length || 0) + (currentHost.passwords?.length || 0) + (currentHost.hashes?.length || 0)}
                          </span>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Actions rapides */}
                    <Card className="bg-slate-800 border-slate-700">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-slate-100 text-lg">Actions rapides</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <Button
                          onClick={() => setShowExploitationModal(true)}
                          className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                        >
                          <Target className="w-4 h-4 mr-2" />
                          Gérer l'exploitation
                        </Button>
                        <Button
                          onClick={() => setShowNotesEditor(true)}
                          variant="outline"
                          className="w-full border-slate-600 text-slate-200 hover:bg-slate-700"
                        >
                          <FileText className="w-4 h-4 mr-2" />
                          Éditer les notes
                        </Button>
                        <Button
                          onClick={() => setShowScreenshotsView(true)}
                          variant="outline"
                          className="w-full border-slate-600 text-slate-200 hover:bg-slate-700"
                        >
                          <Camera className="w-4 h-4 mr-2" />
                          Voir les captures
                        </Button>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Ports et services détaillés */}
                  {(currentHost.ports?.length > 0 || currentHost.services?.length > 0) && (
                    <Card className="bg-slate-800 border-slate-700">
                      <CardHeader>
                        <CardTitle className="text-slate-100 text-lg">Ports et Services</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {currentHost.ports?.length > 0 && (
                            <div>
                              <h4 className="text-slate-200 font-medium mb-3">Ports ouverts</h4>
                              <div className="space-y-2">
                                {currentHost.ports.map((port, index) => (
                                  <div key={index} className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg">
                                    <div className="flex items-center gap-3">
                                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                      <span className="text-slate-100 font-mono">{port.port}/{port.protocol}</span>
                                    </div>
                                    <span className="text-slate-400 text-sm">{port.state}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          {currentHost.services?.length > 0 && (
                            <div>
                              <h4 className="text-slate-200 font-medium mb-3">Services détectés</h4>
                              <div className="space-y-2">
                                {currentHost.services.map((service, index) => (
                                  <div key={index} className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg">
                                    <div className="flex items-center gap-3">
                                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                                      <span className="text-slate-100">{service.name}</span>
                                    </div>
                                    <span className="text-slate-400 text-sm font-mono">{service.port}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              )}

              {activeTab === 'credentials' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xl font-semibold text-slate-100">Gestion des Credentials</h3>
                    <Button
                      onClick={() => setShowVulnerabilitiesView(true)}
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      <Shield className="w-4 h-4 mr-2" />
                      Voir toutes les vulnérabilités
                    </Button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Usernames */}
                    <Card className="bg-slate-800 border-slate-700">
                      <CardHeader>
                        <CardTitle className="text-slate-100 flex items-center justify-between">
                          Usernames ({currentHost.usernames?.length || 0})
                          <Button
                            size="sm"
                            onClick={() => setNewUserOpen(true)}
                            className="bg-green-600 hover:bg-green-700 text-white"
                          >
                            <Plus className="w-4 h-4" />
                          </Button>
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          {currentHost.usernames?.map((user, index) => (
                            <div key={index} className="flex items-center justify-between p-2 bg-slate-700/50 rounded">
                              <span className="text-slate-100 font-mono">{user}</span>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleRemoveUsername(index)}
                                className="text-red-400 hover:text-red-300 hover:bg-red-900/20"
                              >
                                <X className="w-3 h-3" />
                              </Button>
                            </div>
                          )) || <p className="text-slate-400 text-sm">Aucun username</p>}
                        </div>
                      </CardContent>
                    </Card>

                    {/* Passwords */}
                    <Card className="bg-slate-800 border-slate-700">
                      <CardHeader>
                        <CardTitle className="text-slate-100 flex items-center justify-between">
                          Passwords ({currentHost.passwords?.length || 0})
                          <Button
                            size="sm"
                            onClick={() => setNewPassOpen(true)}
                            className="bg-green-600 hover:bg-green-700 text-white"
                          >
                            <Plus className="w-4 h-4" />
                          </Button>
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          {currentHost.passwords?.map((pass, index) => (
                            <div key={index} className="flex items-center justify-between p-2 bg-slate-700/50 rounded">
                              <span className="text-slate-100 font-mono">{pass}</span>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleRemovePassword(index)}
                                className="text-red-400 hover:text-red-300 hover:bg-red-900/20"
                              >
                                <X className="w-3 h-3" />
                              </Button>
                            </div>
                          )) || <p className="text-slate-400 text-sm">Aucun password</p>}
                        </div>
                      </CardContent>
                    </Card>

                    {/* Hashes */}
                    <Card className="bg-slate-800 border-slate-700">
                      <CardHeader>
                        <CardTitle className="text-slate-100 flex items-center justify-between">
                          Hashes ({currentHost.hashes?.length || 0})
                          <Button
                            size="sm"
                            onClick={() => setNewHashOpen(true)}
                            className="bg-green-600 hover:bg-green-700 text-white"
                          >
                            <Plus className="w-4 h-4" />
                          </Button>
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          {currentHost.hashes?.map((hash, index) => (
                            <div key={index} className="flex items-center justify-between p-2 bg-slate-700/50 rounded">
                              <span className="text-slate-100 font-mono text-xs break-all">{hash}</span>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleRemoveHash(index)}
                                className="text-red-400 hover:text-red-300 hover:bg-red-900/20"
                              >
                                <X className="w-3 h-3" />
                              </Button>
                            </div>
                          )) || <p className="text-slate-400 text-sm">Aucun hash</p>}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              )}

              {activeTab === 'exploitation' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xl font-semibold text-slate-100">Workflow d'Exploitation</h3>
                    <Button
                      onClick={() => setShowExploitationModal(true)}
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      <Target className="w-4 h-4 mr-2" />
                      Gérer l'exploitation
                    </Button>
                  </div>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <Card className="bg-slate-800 border-slate-700">
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-slate-100">Étapes d'exploitation</CardTitle>
                          <Button
                            size="sm"
                            onClick={() => setShowExploitationModal(true)}
                            className="bg-green-600 hover:bg-green-700 text-white"
                          >
                            <Plus className="w-4 h-4 mr-2" />
                            Ajouter une étape
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {currentHost.exploitationSteps?.map((step, index) => (
                            <div key={step.id || index} className="p-4 bg-slate-700/50 rounded-lg">
                              <div className="flex items-center justify-between mb-2">
                                <h4 className="text-slate-100 font-medium">{step.title}</h4>
                                <div className="flex items-center gap-2">
                                  <div className={`w-2 h-2 rounded-full ${
                                    step.status === 'completed' ? 'bg-green-500' : 
                                    step.status === 'in-progress' ? 'bg-yellow-500' : 'bg-gray-500'
                                  }`} />
                                  <span className="text-slate-400 text-sm capitalize">{step.status}</span>
                                  <div className="flex items-center gap-1 ml-2">
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => {
                                        setEditingExploitationStep(step);
                                        setShowExploitationModal(true);
                                      }}
                                      className="text-blue-400 hover:text-blue-300 hover:bg-blue-900/20 p-1"
                                    >
                                      <Edit className="w-3 h-3" />
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => handleDeleteExploitationStep(step.id)}
                                      className="text-red-400 hover:text-red-300 hover:bg-red-900/20 p-1"
                                    >
                                      <X className="w-3 h-3" />
                                    </Button>
                                  </div>
                                </div>
                              </div>
                              <p className="text-slate-300 text-sm">{step.description}</p>
                              {step.command && (
                                <div className="mt-2">
                                  <h5 className="text-slate-200 text-sm font-medium mb-1">Commande :</h5>
                                  <div className="p-2 bg-slate-800 rounded font-mono text-xs text-slate-300">
                                    {step.command}
                                  </div>
                                </div>
                              )}
                              {step.output && (
                                <div className="mt-2">
                                  <h5 className="text-slate-200 text-sm font-medium mb-1">Output :</h5>
                                  <div className="p-2 bg-slate-800 rounded font-mono text-xs text-slate-300">
                                    {step.output}
                                  </div>
                                </div>
                              )}
                            </div>
                          )) || <p className="text-slate-400">Aucune étape d'exploitation définie</p>}
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="bg-slate-800 border-slate-700">
                      <CardHeader>
                        <CardTitle className="text-slate-100">Résumé</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          <div className="flex justify-between">
                            <span className="text-slate-400">Étapes complétées</span>
                            <span className="text-green-400 font-semibold">
                              {currentHost.exploitationSteps?.filter(s => s.status === 'completed').length || 0}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-400">En cours</span>
                            <span className="text-yellow-400 font-semibold">
                              {currentHost.exploitationSteps?.filter(s => s.status === 'in-progress').length || 0}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-400">Total</span>
                            <span className="text-slate-100 font-semibold">
                              {currentHost.exploitationSteps?.length || 0}
                            </span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              )}

              {activeTab === 'connections' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xl font-semibold text-slate-100">Connexions et Relations</h3>
                    <Button
                      onClick={() => setShowAddConnection(true)}
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Ajouter une connexion
                    </Button>
                  </div>

                  {/* Formulaire d'ajout de connexion */}
                  {showAddConnection && (
                    <Card className="bg-slate-800 border-slate-700">
                      <CardHeader>
                        <CardTitle className="text-slate-100">Nouvelle connexion</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div>
                          <label className="text-sm text-slate-400 mb-2 block">Hôte cible</label>
                          <Input
                            value={newConnection.targetHost}
                            onChange={(e) => setNewConnection({...newConnection, targetHost: e.target.value})}
                            placeholder="IP ou nom d'hôte"
                            className="bg-slate-700 border-slate-600"
                          />
                        </div>
                        <div>
                          <label className="text-sm text-slate-400 mb-2 block">Type de connexion</label>
                          <Select 
                            value={newConnection.connectionType} 
                            onValueChange={(value) => setNewConnection({...newConnection, connectionType: value})}
                          >
                            <SelectTrigger className="bg-slate-700 border-slate-600">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="lateral">Mouvement latéral</SelectItem>
                              <SelectItem value="pivot">Pivot</SelectItem>
                              <SelectItem value="tunnel">Tunnel</SelectItem>
                              <SelectItem value="proxy">Proxy</SelectItem>
                              <SelectItem value="relay">Relay</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <label className="text-sm text-slate-400 mb-2 block">Description</label>
                          <Input
                            value={newConnection.description}
                            onChange={(e) => setNewConnection({...newConnection, description: e.target.value})}
                            placeholder="Description de la connexion"
                            className="bg-slate-700 border-slate-600"
                          />
                        </div>
                        <div className="flex gap-2">
                          <Button
                            onClick={handleAddConnection}
                            className="bg-green-600 hover:bg-green-700 text-white"
                          >
                            <Save className="w-4 h-4 mr-2" />
                            Ajouter
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => {
                              setShowAddConnection(false);
                              setNewConnection({ targetHost: '', connectionType: 'lateral', description: '' });
                            }}
                            className="border-slate-600 text-slate-200 hover:bg-slate-700"
                          >
                            Annuler
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Liste des connexions */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <Card className="bg-slate-800 border-slate-700">
                      <CardHeader>
                        <CardTitle className="text-slate-100 flex items-center gap-2">
                          <Link className="w-5 h-5" />
                          Connexions sortantes
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {currentHost.connections?.filter(c => c.type === 'lateral' || c.type === 'pivot').map((connection) => (
                            <div key={connection.id} className="p-4 bg-slate-700/50 rounded-lg">
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-3">
                                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                                  <span className="text-slate-100 font-mono">{connection.targetHost}</span>
                                </div>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleRemoveConnection(connection.id)}
                                  className="text-red-400 hover:text-red-300 hover:bg-red-900/20"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                              </div>
                              <div className="flex items-center gap-2 mb-2">
                                <span className="text-xs bg-blue-600 text-white px-2 py-1 rounded">
                                  {connection.type}
                                </span>
                                <span className="text-xs text-slate-400">
                                  {new Date(connection.timestamp).toLocaleDateString()}
                                </span>
                              </div>
                              {connection.description && (
                                <p className="text-slate-300 text-sm">{connection.description}</p>
                              )}
                            </div>
                          )) || <p className="text-slate-400 text-center py-4">Aucune connexion sortante</p>}
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="bg-slate-800 border-slate-700">
                      <CardHeader>
                        <CardTitle className="text-slate-100 flex items-center gap-2">
                          <Monitor className="w-5 h-5" />
                          Services et tunnels
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {currentHost.connections?.filter(c => c.type === 'tunnel' || c.type === 'proxy' || c.type === 'relay').map((connection) => (
                            <div key={connection.id} className="p-4 bg-slate-700/50 rounded-lg">
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-3">
                                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                  <span className="text-slate-100 font-mono">{connection.targetHost}</span>
                                </div>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleRemoveConnection(connection.id)}
                                  className="text-red-400 hover:text-red-300 hover:bg-red-900/20"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                              </div>
                              <div className="flex items-center gap-2 mb-2">
                                <span className="text-xs bg-green-600 text-white px-2 py-1 rounded">
                                  {connection.type}
                                </span>
                                <span className="text-xs text-slate-400">
                                  {new Date(connection.timestamp).toLocaleDateString()}
                                </span>
                              </div>
                              {connection.description && (
                                <p className="text-slate-300 text-sm">{connection.description}</p>
                              )}
                            </div>
                          )) || <p className="text-slate-400 text-center py-4">Aucun service ou tunnel</p>}
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Statistiques des connexions */}
                  <Card className="bg-slate-800 border-slate-700">
                    <CardHeader>
                      <CardTitle className="text-slate-100">Statistiques des connexions</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="text-center">
                          <div className="text-2xl font-bold text-blue-400">
                            {currentHost.connections?.filter(c => c.type === 'lateral').length || 0}
                          </div>
                          <div className="text-sm text-slate-400">Mouvements latéraux</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-purple-400">
                            {currentHost.connections?.filter(c => c.type === 'pivot').length || 0}
                          </div>
                          <div className="text-sm text-slate-400">Pivots</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-green-400">
                            {currentHost.connections?.filter(c => c.type === 'tunnel').length || 0}
                          </div>
                          <div className="text-sm text-slate-400">Tunnels</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-yellow-400">
                            {currentHost.connections?.length || 0}
                          </div>
                          <div className="text-sm text-slate-400">Total</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              {activeTab === 'ports' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xl font-semibold text-slate-100">Gestion des Ports</h3>
                    <Button
                      onClick={() => setShowAddPort(true)}
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Ajouter un port
                    </Button>
                  </div>

                  {/* Formulaire d'ajout de port */}
                  {showAddPort && (
                    <Card className="bg-slate-800 border-slate-700">
                      <CardHeader>
                        <CardTitle className="text-slate-100">Nouveau port</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="text-sm text-slate-400 mb-2 block">Port</label>
                            <Input
                              value={newPort.port}
                              onChange={(e) => setNewPort({...newPort, port: e.target.value})}
                              placeholder="80"
                              type="number"
                              className="bg-slate-700 border-slate-600"
                            />
                          </div>
                          <div>
                            <label className="text-sm text-slate-400 mb-2 block">Protocole</label>
                            <Select 
                              value={newPort.protocol} 
                              onValueChange={(value) => setNewPort({...newPort, protocol: value})}
                            >
                              <SelectTrigger className="bg-slate-700 border-slate-600">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="tcp">TCP</SelectItem>
                                <SelectItem value="udp">UDP</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <div>
                          <label className="text-sm text-slate-400 mb-2 block">Statut</label>
                          <Select 
                            value={newPort.status} 
                            onValueChange={(value) => setNewPort({...newPort, status: value})}
                          >
                            <SelectTrigger className="bg-slate-700 border-slate-600">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="open">Ouvert</SelectItem>
                              <SelectItem value="closed">Fermé</SelectItem>
                              <SelectItem value="filtered">Filtré</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <label className="text-sm text-slate-400 mb-2 block">Service</label>
                          <Input
                            value={newPort.service}
                            onChange={(e) => setNewPort({...newPort, service: e.target.value})}
                            placeholder="http"
                            className="bg-slate-700 border-slate-600"
                          />
                        </div>
                        <div>
                          <label className="text-sm text-slate-400 mb-2 block">Description</label>
                          <Input
                            value={newPort.description}
                            onChange={(e) => setNewPort({...newPort, description: e.target.value})}
                            placeholder="Description du port"
                            className="bg-slate-700 border-slate-600"
                          />
                        </div>
                        <div className="flex gap-2">
                          <Button
                            onClick={handleAddPort}
                            className="bg-green-600 hover:bg-green-700 text-white"
                          >
                            <Save className="w-4 h-4 mr-2" />
                            Ajouter
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => {
                              setShowAddPort(false);
                              setNewPort({ port: '', protocol: 'tcp', status: 'open', service: '', description: '' });
                            }}
                            className="border-slate-600 text-slate-200 hover:bg-slate-700"
                          >
                            Annuler
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Liste des ports */}
                  <Card className="bg-slate-800 border-slate-700">
                    <CardHeader>
                      <CardTitle className="text-slate-100">Ports ouverts ({currentHost.ports?.length || 0})</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {currentHost.ports?.map((port, index) => (
                          <div key={index} className="p-4 bg-slate-700/50 rounded-lg">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-3">
                                <div className={`w-2 h-2 rounded-full ${
                                  port.status === 'open' ? 'bg-green-500' : 
                                  port.status === 'closed' ? 'bg-red-500' : 'bg-yellow-500'
                                }`}></div>
                                <span className="text-slate-100 font-mono">{port.port}/{port.protocol}</span>
                                {port.service && (
                                  <span className="text-blue-400 text-sm">{port.service}</span>
                                )}
                              </div>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleRemovePort(index)}
                                className="text-red-400 hover:text-red-300 hover:bg-red-900/20"
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                            {port.description && (
                              <p className="text-slate-300 text-sm">{port.description}</p>
                            )}
                          </div>
                        )) || <p className="text-slate-400 text-center py-4">Aucun port configuré</p>}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              {activeTab === 'services' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xl font-semibold text-slate-100">Gestion des Services</h3>
                    <Button
                      onClick={() => setShowAddService(true)}
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Ajouter un service
                    </Button>
                  </div>

                  {/* Formulaire d'ajout de service */}
                  {showAddService && (
                    <Card className="bg-slate-800 border-slate-700">
                      <CardHeader>
                        <CardTitle className="text-slate-100">Nouveau service</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="text-sm text-slate-400 mb-2 block">Nom du service</label>
                            <Input
                              value={newService.name}
                              onChange={(e) => setNewService({...newService, name: e.target.value})}
                              placeholder="http"
                              className="bg-slate-700 border-slate-600"
                            />
                          </div>
                          <div>
                            <label className="text-sm text-slate-400 mb-2 block">Port</label>
                            <Input
                              value={newService.port}
                              onChange={(e) => setNewService({...newService, port: e.target.value})}
                              placeholder="80"
                              type="number"
                              className="bg-slate-700 border-slate-600"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="text-sm text-slate-400 mb-2 block">Statut</label>
                          <Select 
                            value={newService.status} 
                            onValueChange={(value) => setNewService({...newService, status: value})}
                          >
                            <SelectTrigger className="bg-slate-700 border-slate-600">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="open">Ouvert</SelectItem>
                              <SelectItem value="closed">Fermé</SelectItem>
                              <SelectItem value="filtered">Filtré</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <label className="text-sm text-slate-400 mb-2 block">Version</label>
                          <Input
                            value={newService.version}
                            onChange={(e) => setNewService({...newService, version: e.target.value})}
                            placeholder="2.4.41"
                            className="bg-slate-700 border-slate-600"
                          />
                        </div>
                        <div>
                          <label className="text-sm text-slate-400 mb-2 block">Description</label>
                          <Input
                            value={newService.description}
                            onChange={(e) => setNewService({...newService, description: e.target.value})}
                            placeholder="Description du service"
                            className="bg-slate-700 border-slate-600"
                          />
                        </div>
                        <div className="flex gap-2">
                          <Button
                            onClick={handleAddService}
                            className="bg-green-600 hover:bg-green-700 text-white"
                          >
                            <Save className="w-4 h-4 mr-2" />
                            Ajouter
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => {
                              setShowAddService(false);
                              setNewService({ name: '', port: '', status: 'open', description: '', version: '' });
                            }}
                            className="border-slate-600 text-slate-200 hover:bg-slate-700"
                          >
                            Annuler
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Liste des services */}
                  <Card className="bg-slate-800 border-slate-700">
                    <CardHeader>
                      <CardTitle className="text-slate-100">Services détectés ({currentHost.services?.length || 0})</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {currentHost.services?.map((service, index) => (
                          <div key={index} className="p-4 bg-slate-700/50 rounded-lg">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-3">
                                <div className={`w-2 h-2 rounded-full ${
                                  service.status === 'open' ? 'bg-green-500' : 
                                  service.status === 'closed' ? 'bg-red-500' : 'bg-yellow-500'
                                }`}></div>
                                <span className="text-slate-100 font-medium">{service.name}</span>
                                <span className="text-blue-400 text-sm font-mono">:{service.port}</span>
                                {service.version && (
                                  <span className="text-slate-400 text-sm">{service.version}</span>
                                )}
                              </div>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleRemoveService(index)}
                                className="text-red-400 hover:text-red-300 hover:bg-red-900/20"
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                            {service.description && (
                              <p className="text-slate-300 text-sm">{service.description}</p>
                            )}
                          </div>
                        )) || <p className="text-slate-400 text-center py-4">Aucun service configuré</p>}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              {activeTab === 'vulnerabilities' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xl font-semibold text-slate-100">Gestion des Vulnérabilités</h3>
                    <Button
                      onClick={() => setShowAddVulnerability(true)}
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Ajouter une vulnérabilité
                    </Button>
                  </div>

                  {/* Formulaire d'ajout de vulnérabilité */}
                  {showAddVulnerability && (
                    <Card className="bg-slate-800 border-slate-700">
                      <CardHeader>
                        <CardTitle className="text-slate-100">Nouvelle vulnérabilité</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div>
                          <label className="text-sm text-slate-400 mb-2 block">Titre</label>
                          <Input
                            value={newVulnerability.title}
                            onChange={(e) => setNewVulnerability({...newVulnerability, title: e.target.value})}
                            placeholder="Titre de la vulnérabilité"
                            className="bg-slate-700 border-slate-600"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="text-sm text-slate-400 mb-2 block">Sévérité</label>
                            <Select 
                              value={newVulnerability.severity} 
                              onValueChange={(value) => setNewVulnerability({...newVulnerability, severity: value})}
                            >
                              <SelectTrigger className="bg-slate-700 border-slate-600">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Low">Faible</SelectItem>
                                <SelectItem value="Medium">Moyenne</SelectItem>
                                <SelectItem value="High">Élevée</SelectItem>
                                <SelectItem value="Critical">Critique</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <label className="text-sm text-slate-400 mb-2 block">Statut</label>
                            <Select 
                              value={newVulnerability.status} 
                              onValueChange={(value) => setNewVulnerability({...newVulnerability, status: value})}
                            >
                              <SelectTrigger className="bg-slate-700 border-slate-600">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="open">Ouverte</SelectItem>
                                <SelectItem value="in_progress">En cours</SelectItem>
                                <SelectItem value="closed">Fermée</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <div>
                          <label className="text-sm text-slate-400 mb-2 block">CVE</label>
                          <Input
                            value={newVulnerability.cve}
                            onChange={(e) => setNewVulnerability({...newVulnerability, cve: e.target.value})}
                            placeholder="CVE-2023-1234"
                            className="bg-slate-700 border-slate-600"
                          />
                        </div>
                        <div>
                          <label className="text-sm text-slate-400 mb-2 block">Description</label>
                          <Input
                            value={newVulnerability.description}
                            onChange={(e) => setNewVulnerability({...newVulnerability, description: e.target.value})}
                            placeholder="Description de la vulnérabilité"
                            className="bg-slate-700 border-slate-600"
                          />
                        </div>
                        <div className="flex gap-2">
                          <Button
                            onClick={handleAddVulnerability}
                            className="bg-green-600 hover:bg-green-700 text-white"
                          >
                            <Save className="w-4 h-4 mr-2" />
                            Ajouter
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => {
                              setShowAddVulnerability(false);
                              setNewVulnerability({ title: '', description: '', severity: 'Medium', cve: '', status: 'open' });
                            }}
                            className="border-slate-600 text-slate-200 hover:bg-slate-700"
                          >
                            Annuler
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Liste des vulnérabilités */}
                  <Card className="bg-slate-800 border-slate-700">
                    <CardHeader>
                      <CardTitle className="text-slate-100">Vulnérabilités ({currentHost.vulnerabilities?.length || 0})</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {currentHost.vulnerabilities?.map((vulnerability) => (
                          <div key={vulnerability.id} className="p-4 bg-slate-700/50 rounded-lg">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-3">
                                <div className={`w-2 h-2 rounded-full ${
                                  vulnerability.severity === 'Critical' ? 'bg-red-500' : 
                                  vulnerability.severity === 'High' ? 'bg-orange-500' : 
                                  vulnerability.severity === 'Medium' ? 'bg-yellow-500' : 'bg-green-500'
                                }`}></div>
                                <span className="text-slate-100 font-medium">{vulnerability.title}</span>
                                {vulnerability.cve && (
                                  <span className="text-blue-400 text-sm font-mono">{vulnerability.cve}</span>
                                )}
                              </div>
                              <div className="flex items-center gap-2">
                                <span className={`text-xs px-2 py-1 rounded ${
                                  vulnerability.severity === 'Critical' ? 'bg-red-600 text-white' : 
                                  vulnerability.severity === 'High' ? 'bg-orange-600 text-white' : 
                                  vulnerability.severity === 'Medium' ? 'bg-yellow-600 text-white' : 'bg-green-600 text-white'
                                }`}>
                                  {vulnerability.severity}
                                </span>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleRemoveVulnerability(vulnerability.id)}
                                  className="text-red-400 hover:text-red-300 hover:bg-red-900/20"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                              </div>
                            </div>
                            {vulnerability.description && (
                              <p className="text-slate-300 text-sm mb-2">{vulnerability.description}</p>
                            )}
                            <div className="flex items-center gap-2">
                              <span className={`text-xs px-2 py-1 rounded ${
                                vulnerability.status === 'open' ? 'bg-red-600 text-white' : 
                                vulnerability.status === 'in_progress' ? 'bg-yellow-600 text-white' : 'bg-green-600 text-white'
                              }`}>
                                {vulnerability.status === 'open' ? 'Ouverte' : 
                                 vulnerability.status === 'in_progress' ? 'En cours' : 'Fermée'}
                              </span>
                              <span className="text-xs text-slate-400">
                                {new Date(vulnerability.createdAt).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                        )) || <p className="text-slate-400 text-center py-4">Aucune vulnérabilité configurée</p>}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              {activeTab === 'notes' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xl font-semibold text-slate-100">Notes et Documentation</h3>
                    <Button
                      onClick={() => setShowNotesEditor(true)}
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      <FileText className="w-4 h-4 mr-2" />
                      Éditer les notes
                    </Button>
                  </div>
                  <Card className="bg-slate-800 border-slate-700">
                    <CardContent className="p-6">
                      {currentHost.notes ? (
                        <div className="prose prose-invert max-w-none">
                          <pre className="whitespace-pre-wrap text-slate-100 font-mono text-sm leading-relaxed">
                            {currentHost.notes}
                          </pre>
                        </div>
                      ) : (
                        <p className="text-slate-400 text-center py-8">Aucune note pour cet hôte</p>
                      )}
                    </CardContent>
                  </Card>
                </div>
              )}

              {activeTab === 'screenshots' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xl font-semibold text-slate-100">Captures d'écran</h3>
                    <Button
                      onClick={() => setShowScreenshotsView(true)}
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      <Camera className="w-4 h-4 mr-2" />
                      Gérer les captures
                    </Button>
                  </div>
                  <Card className="bg-slate-800 border-slate-700">
                    <CardContent className="p-6">
                      {currentHost.screenshots?.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {currentHost.screenshots.map((screenshot, index) => (
                            <div key={index} className="bg-slate-700/50 rounded-lg p-4">
                              <div className="aspect-video bg-slate-600 rounded mb-3 flex items-center justify-center">
                                <Camera className="w-8 h-8 text-slate-400" />
                              </div>
                              <p className="text-slate-100 text-sm font-medium">{screenshot.name}</p>
                              <p className="text-slate-400 text-xs">{screenshot.timestamp}</p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-slate-400 text-center py-8">Aucune capture d'écran</p>
                      )}
                    </CardContent>
                  </Card>
                </div>
              )}
            </div>
          </div>
        </div>
      </motion.div>

      {/* Modals enfants */}
      {showNotesEditor && (
        <NotesEditor
          host={currentHost}
          onClose={() => setShowNotesEditor(false)}
          onSave={(notes) => handleUpdateHost(currentHost.id, { notes })}
        />
      )}

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

      {showVulnerabilitiesView && (
        <GlobalVulnerabilitiesView
          host={currentHost}
          onClose={() => setShowVulnerabilitiesView(false)}
        />
      )}

      {showScreenshotsView && (
        <GlobalScreenshotsView
          host={currentHost}
          onClose={() => setShowScreenshotsView(false)}
        />
      )}

      {/* Dialogs pour ajouter des credentials */}
      <InputDialog
        open={newUserOpen}
        title="Ajouter un username"
        placeholder="username"
        onCancel={() => setNewUserOpen(false)}
        onConfirm={(val) => { 
          handleUpdateHost(currentHost.id, { usernames: [...(currentHost.usernames || []), val] }); 
          setNewUserOpen(false); 
        }}
      />
      <InputDialog
        open={newPassOpen}
        title="Ajouter un password"
        placeholder="password"
        type="text"
        onCancel={() => setNewPassOpen(false)}
        onConfirm={(val) => { 
          handleUpdateHost(currentHost.id, { passwords: [...(currentHost.passwords || []), val] }); 
          setNewPassOpen(false); 
        }}
      />
      <InputDialog
        open={newHashOpen}
        title="Ajouter un hash"
        placeholder="hash"
        onCancel={() => setNewHashOpen(false)}
        onConfirm={(val) => { 
          handleUpdateHost(currentHost.id, { hashes: [...(currentHost.hashes || []), val] }); 
          setNewHashOpen(false); 
        }}
      />
    </motion.div>
  );
};
