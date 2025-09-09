import React, { useState, useCallback } from 'react';
import { useAutoReconStore } from '../../../stores/autoReconStore';
import { Card } from '../../ui/card';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { 
  Upload, 
  Server, 
  Shield, 
  Terminal, 
  Eye,
  Search,
  Filter,
  Download,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  ExternalLink,
  BookOpen,
  Info
} from 'lucide-react';

import OverviewPanel from './OverviewPanel';
import HostsPanel from './HostsPanel';
import ServicesPanel from './ServicesPanel';
import VulnerabilitiesPanel from './VulnerabilitiesPanel';
import FilesPanel from './FilesPanel';
import ImportPanel from './ImportPanel';

const AutoReconViewerPage: React.FC = () => {
  const {
    data,
    currentView,
    isLoading,
    error,
    searchTerm,
    setCurrentView,
    setSearchTerm,
    clearData,
    getStatistics
  } = useAutoReconStore();

  const [showImportPanel, setShowImportPanel] = useState(!data);
  const [showGuide, setShowGuide] = useState(false);
  const stats = getStatistics();

  const handleViewChange = (view: typeof currentView) => {
    setCurrentView(view);
  };

  const handleClearData = () => {
    clearData();
    setShowImportPanel(true);
  };

  const renderViewContent = () => {
    if (!data) return null;

    switch (currentView) {
      case 'overview':
        return <OverviewPanel />;
      case 'hosts':
        return <HostsPanel />;
      case 'services':
        return <ServicesPanel />;
      case 'vulnerabilities':
        return <VulnerabilitiesPanel />;
      case 'files':
        return <FilesPanel />;
      default:
        return <OverviewPanel />;
    }
  };

  const getViewIcon = (view: typeof currentView) => {
    switch (view) {
      case 'overview': return <Eye className="w-4 h-4" />;
      case 'hosts': return <Server className="w-4 h-4" />;
      case 'services': return <Terminal className="w-4 h-4" />;
      case 'vulnerabilities': return <Shield className="w-4 h-4" />;
      case 'files': return <Download className="w-4 h-4" />;
      default: return <Eye className="w-4 h-4" />;
    }
  };

  if (showImportPanel) {
    return (
      <div className="app-layout">
        {/* Header */}
        <div className="main-header p-6">
          <div className="flex-between mb-6">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3">
                <img src="/logo.png" alt="AuditMapper" className="w-8 h-8 rounded-lg opacity-80" />
                <div>
                  <h1 className="text-2xl font-bold text-slate-100">AutoRecon Viewer</h1>
                  <p className="text-slate-400">Analysez et visualisez vos résultats de scan AutoRecon</p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <Button
                onClick={() => setShowGuide(true)}
                variant="outline"
                className="bg-slate-700 border-slate-600 text-slate-200 hover:bg-slate-600"
              >
                <BookOpen className="w-4 h-4 mr-2" />
                Guide d'utilisation
              </Button>
              
              <Button
                onClick={() => window.open('https://github.com/Tib3rius/AutoRecon', '_blank')}
                variant="outline"
                className="bg-slate-700 border-slate-600 text-slate-200 hover:bg-slate-600"
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                AutoRecon GitHub
              </Button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="main-content">
          <div className="flex-1 p-6 overflow-auto">
            <ImportPanel 
              onImportSuccess={() => setShowImportPanel(false)}
              onCancel={() => setShowImportPanel(false)}
            />
          </div>
        </div>

        {/* Guide d'utilisation Modal */}
        {showGuide && (
          <div 
            className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
            onClick={() => setShowGuide(false)}
          >
            <div 
              className="w-full max-w-4xl max-h-[90vh] overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <Card className="h-full border-slate-700 bg-slate-800">
                <div className="p-6 border-b border-slate-700">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <BookOpen className="w-6 h-6 text-blue-400" />
                      <h2 className="text-xl font-semibold text-slate-100">Guide d'utilisation AutoRecon</h2>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowGuide(false)}
                      className="bg-slate-700 border-slate-600 text-slate-200 hover:bg-slate-600"
                    >
                      <XCircle className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                
                <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
                  <div className="space-y-6">
                    {/* Introduction */}
                    <div className="space-y-3">
                      <h3 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
                        <Info className="w-5 h-5 text-blue-400" />
                        Qu'est-ce qu'AutoRecon ?
                      </h3>
                      <p className="text-slate-300">
                        AutoRecon est un outil de reconnaissance automatique pour les tests de pénétration. 
                        Il effectue une énumération complète des services et vulnérabilités sur une cible donnée.
                      </p>
                    </div>

                    {/* Installation */}
                    <div className="space-y-3">
                      <h3 className="text-lg font-semibold text-slate-100">📦 Installation</h3>
                      <div className="bg-slate-900 p-4 rounded-lg border border-slate-600">
                        <code className="text-green-400">
                          git clone https://github.com/Tib3rius/AutoRecon.git<br/>
                          cd AutoRecon<br/>
                          pip3 install -r requirements.txt<br/>
                          python3 autorecon.py [options] &lt;target&gt;
                        </code>
                      </div>
                    </div>

                    {/* Utilisation de base */}
                    <div className="space-y-3">
                      <h3 className="text-lg font-semibold text-slate-100">🚀 Utilisation de base</h3>
                      <div className="space-y-2">
                        <div className="bg-slate-900 p-3 rounded border border-slate-600">
                          <p className="text-slate-300 font-medium mb-1">Scan d'une IP unique :</p>
                          <code className="text-green-400">python3 autorecon.py 192.168.1.100</code>
                        </div>
                        <div className="bg-slate-900 p-3 rounded border border-slate-600">
                          <p className="text-slate-300 font-medium mb-1">Scan d'un réseau :</p>
                          <code className="text-green-400">python3 autorecon.py 192.168.1.0/24</code>
                        </div>
                        <div className="bg-slate-900 p-3 rounded border border-slate-600">
                          <p className="text-slate-300 font-medium mb-1">Scan d'un domaine :</p>
                          <code className="text-green-400">python3 autorecon.py example.com</code>
                        </div>
                      </div>
                    </div>

                    {/* Options avancées */}
                    <div className="space-y-3">
                      <h3 className="text-lg font-semibold text-slate-100">⚙️ Options avancées</h3>
                      <div className="space-y-2">
                        <div className="bg-slate-900 p-3 rounded border border-slate-600">
                          <p className="text-slate-300 font-medium mb-1">Scan rapide (ports communs uniquement) :</p>
                          <code className="text-green-400">python3 autorecon.py --single-target 192.168.1.100</code>
                        </div>
                        <div className="bg-slate-900 p-3 rounded border border-slate-600">
                          <p className="text-slate-300 font-medium mb-1">Scan avec threads personnalisés :</p>
                          <code className="text-green-400">python3 autorecon.py --threads 50 192.168.1.0/24</code>
                        </div>
                        <div className="bg-slate-900 p-3 rounded border border-slate-600">
                          <p className="text-slate-300 font-medium mb-1">Scan avec timeout personnalisé :</p>
                          <code className="text-green-400">python3 autorecon.py --timeout 300 192.168.1.100</code>
                        </div>
                      </div>
                    </div>

                    {/* Structure des résultats */}
                    <div className="space-y-3">
                      <h3 className="text-lg font-semibold text-slate-100">📁 Structure des résultats</h3>
                      <p className="text-slate-300">
                        AutoRecon génère un dossier pour chaque cible scannée avec la structure suivante :
                      </p>
                      <div className="bg-slate-900 p-4 rounded-lg border border-slate-600">
                        <code className="text-slate-300">
                          target_ip/<br/>
                          ├── nmap/           # Résultats Nmap<br/>
                          ├── gobuster/       # Énumération web<br/>
                          ├── nikto/          # Scan de vulnérabilités web<br/>
                          ├── smb/            # Énumération SMB<br/>
                          ├── ldap/           # Énumération LDAP<br/>
                          ├── dns/            # Énumération DNS<br/>
                          └── ...             # Autres outils
                        </code>
                      </div>
                    </div>

                    {/* Import dans AuditMapper */}
                    <div className="space-y-3">
                      <h3 className="text-lg font-semibold text-slate-100">📥 Import dans AuditMapper</h3>
                      <div className="space-y-2">
                        <p className="text-slate-300">
                          Pour importer les résultats AutoRecon dans AuditMapper :
                        </p>
                        <ol className="list-decimal list-inside space-y-1 text-slate-300 ml-4">
                          <li>Exécutez AutoRecon sur votre cible</li>
                          <li>Attendez la fin du scan (peut prendre plusieurs heures)</li>
                          <li>Cliquez sur "Importer Résultats" dans AuditMapper</li>
                          <li>Sélectionnez le dossier de résultats AutoRecon</li>
                          <li>Les données seront automatiquement parsées et organisées</li>
                        </ol>
                      </div>
                    </div>

                    {/* Conseils d'utilisation */}
                    <div className="space-y-3">
                      <h3 className="text-lg font-semibold text-slate-100">💡 Conseils d'utilisation</h3>
                      <div className="space-y-2">
                        <div className="bg-blue-900/20 p-3 rounded border border-blue-700/50">
                          <p className="text-blue-200 text-sm">
                            <strong>⚠️ Attention :</strong> AutoRecon peut être très bruyant sur le réseau. 
                            Utilisez-le uniquement sur des environnements autorisés.
                          </p>
                        </div>
                        <div className="bg-green-900/20 p-3 rounded border border-green-700/50">
                          <p className="text-green-200 text-sm">
                            <strong>💡 Astuce :</strong> Pour les scans de production, utilisez l'option 
                            <code className="bg-slate-800 px-1 rounded">--single-target</code> pour réduire le bruit.
                          </p>
                        </div>
                        <div className="bg-yellow-900/20 p-3 rounded border border-yellow-700/50">
                          <p className="text-yellow-200 text-sm">
                            <strong>⏱️ Performance :</strong> Les scans peuvent prendre plusieurs heures. 
                            Planifiez-les en conséquence.
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Liens utiles */}
                    <div className="space-y-3">
                      <h3 className="text-lg font-semibold text-slate-100">🔗 Liens utiles</h3>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          onClick={() => window.open('https://github.com/Tib3rius/AutoRecon', '_blank')}
                          variant="outline"
                          className="bg-slate-700 border-slate-600 text-slate-200 hover:bg-slate-600"
                        >
                          <ExternalLink className="w-4 h-4 mr-2" />
                          Repository GitHub
                        </Button>
                        <Button
                          onClick={() => window.open('https://github.com/Tib3rius/AutoRecon/wiki', '_blank')}
                          variant="outline"
                          className="bg-slate-700 border-slate-600 text-slate-200 hover:bg-slate-600"
                        >
                          <BookOpen className="w-4 h-4 mr-2" />
                          Documentation
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="app-layout">
      {/* Header */}
      <div className="main-header p-6">
        <div className="flex-between mb-6">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <img src="/logo.png" alt="AuditMapper" className="w-8 h-8 rounded-lg opacity-80" />
              <div>
                <h1 className="text-2xl font-bold text-slate-100">AutoRecon Viewer</h1>
                <p className="text-slate-400">
                  {data ? `${stats.totalHosts} hôte(s) • ${stats.totalServices} service(s) • ${stats.totalVulnerabilities} vulnérabilité(s)` : 'Analysez et visualisez vos résultats de scan AutoRecon'}
                </p>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <Button
              onClick={() => setShowGuide(true)}
              variant="outline"
              className="bg-slate-700 border-slate-600 text-slate-200 hover:bg-slate-600"
            >
              <BookOpen className="w-4 h-4 mr-2" />
              Guide d'utilisation
            </Button>
            
            <Button
              onClick={() => window.open('https://github.com/Tib3rius/AutoRecon', '_blank')}
              variant="outline"
              className="bg-slate-700 border-slate-600 text-slate-200 hover:bg-slate-600"
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              AutoRecon GitHub
            </Button>
            
            <Button
              onClick={() => setShowImportPanel(true)}
              variant="default"
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              <Upload className="w-4 h-4 mr-2" />
              Importer Résultats
            </Button>
            
            {data && (
              <Button
                onClick={handleClearData}
                variant="outline"
                className="bg-slate-700 border-slate-600 text-slate-200 hover:bg-slate-600"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Nouveau scan
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="main-content">
        <div className="flex-1 p-6 overflow-auto">

        {/* Loading State */}
        {isLoading && (
          <Card className="p-8 text-center bg-slate-800/50 backdrop-blur-sm border-slate-700">
            <div className="flex items-center justify-center gap-3 text-white">
              <RefreshCw className="w-6 h-6 animate-spin" />
              <span className="text-lg">Analyse des résultats AutoRecon en cours...</span>
            </div>
          </Card>
        )}

        {/* Error State */}
        {error && (
          <Card className="p-6 bg-red-900/20 border-red-500/50 mb-6">
            <div className="flex items-center gap-3 text-red-300">
              <AlertTriangle className="w-5 h-5" />
              <span>{error}</span>
            </div>
          </Card>
        )}

        {/* Navigation and Search */}
        {data && !isLoading && (
          <>
            {/* Statistics Cards */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
              <Card className="p-4 bg-slate-800/50 backdrop-blur-sm border-slate-700">
                <div className="flex items-center gap-3">
                  <Server className="w-8 h-8 text-blue-400" />
                  <div>
                    <p className="text-2xl font-bold text-white">{stats.totalHosts}</p>
                    <p className="text-slate-400 text-sm">Hôtes</p>
                  </div>
                </div>
              </Card>

              <Card className="p-4 bg-slate-800/50 backdrop-blur-sm border-slate-700">
                <div className="flex items-center gap-3">
                  <Terminal className="w-8 h-8 text-green-400" />
                  <div>
                    <p className="text-2xl font-bold text-white">{stats.totalServices}</p>
                    <p className="text-slate-400 text-sm">Services</p>
                  </div>
                </div>
              </Card>

              <Card className="p-4 bg-slate-800/50 backdrop-blur-sm border-slate-700">
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-8 h-8 text-yellow-400" />
                  <div>
                    <p className="text-2xl font-bold text-white">{stats.openPorts}</p>
                    <p className="text-slate-400 text-sm">Ports ouverts</p>
                  </div>
                </div>
              </Card>

              <Card className="p-4 bg-slate-800/50 backdrop-blur-sm border-slate-700">
                <div className="flex items-center gap-3">
                  <Shield className="w-8 h-8 text-red-400" />
                  <div>
                    <p className="text-2xl font-bold text-white">{stats.totalVulnerabilities}</p>
                    <p className="text-slate-400 text-sm">Vulnérabilités</p>
                  </div>
                </div>
              </Card>

              <Card className="p-4 bg-slate-800/50 backdrop-blur-sm border-slate-700">
                <div className="flex items-center gap-3">
                  <Clock className="w-8 h-8 text-purple-400" />
                  <div>
                    <p className="text-2xl font-bold text-white">{stats.totalCommands}</p>
                    <p className="text-slate-400 text-sm">Commandes</p>
                  </div>
                </div>
              </Card>
            </div>

            {/* Navigation Tabs */}
            <Card className="p-4 bg-slate-800/50 backdrop-blur-sm border-slate-700 mb-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {[
                    { id: 'overview', label: 'Vue d\'ensemble' },
                    { id: 'hosts', label: 'Hôtes' },
                    { id: 'services', label: 'Services' },
                    { id: 'vulnerabilities', label: 'Vulnérabilités' },
                    { id: 'files', label: 'Fichiers' }
                  ].map((view) => (
                    <Button
                      key={view.id}
                      onClick={() => handleViewChange(view.id as typeof currentView)}
                      variant={currentView === view.id ? 'default' : 'ghost'}
                      className={`flex items-center gap-2 ${
                        currentView === view.id 
                          ? 'bg-purple-600 text-white' 
                          : 'text-slate-300 hover:text-white'
                      }`}
                    >
                      {getViewIcon(view.id as typeof currentView)}
                      {view.label}
                    </Button>
                  ))}
                </div>

                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
                    <Input
                      placeholder="Rechercher..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 bg-slate-700 border-slate-600 text-white placeholder-slate-400"
                    />
                  </div>
                </div>
              </div>
            </Card>

            {/* Main Content */}
            {renderViewContent()}
          </>
        )}
        </div>
      </div>

    </div>
  );
};

export default AutoReconViewerPage;
