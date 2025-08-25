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
  Clock
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
