import React, { useState } from 'react';
import { useAutoReconStore } from '../../../stores/autoReconStore';
import { Card } from '../../ui/card';
import { Button } from '../../ui/button';
import { 
  Server, 
  Terminal, 
  Shield, 
  AlertTriangle, 
  CheckCircle,
  XCircle,
  Clock,
  Activity,
  Eye,
  TrendingUp,
  ChevronRight,
  Network,
  Globe
} from 'lucide-react';
import HostDetailView from './HostDetailView';
import ServiceDetailView from './ServiceDetailView';

type ViewMode = 'dashboard' | 'host-detail' | 'service-detail';

const OverviewPanel: React.FC = () => {
  const { 
    data, 
    getStatistics, 
    getUniqueServices, 
    getUniquePorts,
    getAllVulnerabilities,
    setCurrentView 
  } = useAutoReconStore();

  const [viewMode, setViewMode] = useState<ViewMode>('dashboard');
  const [selectedHost, setSelectedHost] = useState<string | null>(null);
  const [selectedService, setSelectedService] = useState<{ hostIp: string; serviceName: string; port: number } | null>(null);

  if (!data) return null;

  const stats = getStatistics();
  const uniqueServices = getUniqueServices();
  const uniquePorts = getUniquePorts();
  const allVulns = getAllVulnerabilities();

  // Group vulnerabilities by severity
  const vulnsBySeverity = {
    critical: allVulns.filter(v => v.severity === 'critical'),
    high: allVulns.filter(v => v.severity === 'high'),
    medium: allVulns.filter(v => v.severity === 'medium'),
    low: allVulns.filter(v => v.severity === 'low')
  };

  // Get top services
  const serviceStats = uniqueServices.map(service => {
    const hostsWithService = data.report.hosts.filter(host => 
      host.services.some(s => s.name === service)
    ).length;
    return { service, count: hostsWithService };
  }).sort((a, b) => b.count - a.count).slice(0, 10);

  // Get hosts with most vulnerabilities
  const hostVulnStats = data.report.hosts.map(host => {
    const hostVulns = host.vulnerabilities.length + 
      host.services.reduce((sum, service) => sum + service.vulnerabilities.length, 0);
    return { ip: host.ip, vulnCount: hostVulns };
  }).sort((a, b) => b.vulnCount - a.vulnCount).slice(0, 5);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'text-red-400';
      case 'high': return 'text-orange-400';
      case 'medium': return 'text-yellow-400';
      case 'low': return 'text-blue-400';
      default: return 'text-slate-400';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical': return <XCircle className="w-5 h-5" />;
      case 'high': return <AlertTriangle className="w-5 h-5" />;
      case 'medium': return <Clock className="w-5 h-5" />;
      case 'low': return <CheckCircle className="w-5 h-5" />;
      default: return <CheckCircle className="w-5 h-5" />;
    }
  };

  const handleHostClick = (hostIp: string) => {
    setSelectedHost(hostIp);
    setViewMode('host-detail');
  };

  const handleServiceClick = (hostIp: string, serviceName: string, port: number) => {
    setSelectedService({ hostIp, serviceName, port });
    setViewMode('service-detail');
  };

  const handleBackToDashboard = () => {
    setViewMode('dashboard');
    setSelectedHost(null);
    setSelectedService(null);
  };

  // Show different views based on viewMode
  if (viewMode === 'host-detail' && selectedHost) {
    return (
      <HostDetailView 
        hostIp={selectedHost}
        onBack={handleBackToDashboard}
        onServiceClick={handleServiceClick}
      />
    );
  }

  if (viewMode === 'service-detail' && selectedService) {
    return (
      <ServiceDetailView 
        hostIp={selectedService.hostIp}
        serviceName={selectedService.serviceName}
        port={selectedService.port}
        onBack={handleBackToDashboard}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-6 bg-slate-800/50 backdrop-blur-sm border-slate-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-sm">Hôtes cibles</p>
              <p className="text-3xl font-bold text-white">{stats.totalHosts}</p>
            </div>
            <Server className="w-8 h-8 text-blue-400" />
          </div>
          <div className="mt-4">
            <p className="text-slate-300 text-sm">Cliquez sur un hôte ci-dessous pour explorer</p>
          </div>
        </Card>

        <Card className="p-6 bg-slate-800/50 backdrop-blur-sm border-slate-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-sm">Services découverts</p>
              <p className="text-3xl font-bold text-white">{stats.totalServices}</p>
            </div>
            <Terminal className="w-8 h-8 text-green-400" />
          </div>
          <div className="mt-4">
            <Button
              onClick={() => setCurrentView('services')}
              variant="ghost"
              size="sm"
              className="text-green-400 hover:text-green-300"
            >
              <Eye className="w-4 h-4 mr-1" />
              Voir les services
            </Button>
          </div>
        </Card>

        <Card className="p-6 bg-slate-800/50 backdrop-blur-sm border-slate-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-sm">Ports ouverts</p>
              <p className="text-3xl font-bold text-white">{stats.openPorts}</p>
            </div>
            <Activity className="w-8 h-8 text-yellow-400" />
          </div>
          <div className="mt-4 text-slate-400 text-sm">
            {uniquePorts.length} ports uniques
          </div>
        </Card>

        <Card className="p-6 bg-slate-800/50 backdrop-blur-sm border-slate-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-sm">Vulnérabilités</p>
              <p className="text-3xl font-bold text-white">{stats.totalVulnerabilities}</p>
            </div>
            <Shield className="w-8 h-8 text-red-400" />
          </div>
          <div className="mt-4">
            <Button
              onClick={() => setCurrentView('vulnerabilities')}
              variant="ghost"
              size="sm"
              className="text-red-400 hover:text-red-300"
            >
              <Eye className="w-4 h-4 mr-1" />
              Voir les vulnérabilités
            </Button>
          </div>
        </Card>
      </div>

      {/* Vulnerability Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6 bg-slate-800/50 backdrop-blur-sm border-slate-700">
          <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
            <Shield className="w-5 h-5 text-red-400" />
            Répartition des vulnérabilités
          </h3>
          
          <div className="space-y-4">
            {Object.entries(vulnsBySeverity).map(([severity, vulns]) => (
              <div key={severity} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={getSeverityColor(severity)}>
                    {getSeverityIcon(severity)}
                  </div>
                  <span className="text-white capitalize">{severity}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-bold text-white">{vulns.length}</span>
                  <div className="w-20 bg-slate-700 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full bg-current ${getSeverityColor(severity)}`}
                      style={{ 
                        width: `${stats.totalVulnerabilities > 0 ? (vulns.length / stats.totalVulnerabilities) * 100 : 0}%` 
                      }}
                    ></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-6 bg-slate-800/50 backdrop-blur-sm border-slate-700">
          <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-green-400" />
            Services les plus communs
          </h3>
          
          <div className="space-y-3">
            {serviceStats.map(({ service, count }) => (
              <div key={service} className="flex items-center justify-between">
                <span className="text-white">{service || 'Inconnu'}</span>
                <div className="flex items-center gap-2">
                  <span className="text-slate-400">{count} hôte(s)</span>
                  <div className="w-16 bg-slate-700 rounded-full h-2">
                    <div 
                      className="h-2 rounded-full bg-green-400"
                      style={{ 
                        width: `${stats.totalHosts > 0 ? (count / stats.totalHosts) * 100 : 0}%` 
                      }}
                    ></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Interactive Hosts Dashboard */}
      <Card className="p-6 bg-slate-800/50 backdrop-blur-sm border-slate-700">
        <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
          <Network className="w-5 h-5 text-blue-400" />
          Hôtes découverts - Cliquez pour explorer
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {data.report.hosts.map((host) => {
            const hostVulns = host.vulnerabilities.length + 
              host.services.reduce((sum, service) => sum + service.vulnerabilities.length, 0);
            const openPorts = host.ports.filter(p => p.state === 'open').length;
            
            return (
              <Card 
                key={host.ip} 
                className="p-4 bg-slate-700/50 border-slate-600 hover:bg-slate-700/70 hover:border-blue-500/50 cursor-pointer transition-all duration-200 group"
                onClick={() => handleHostClick(host.ip)}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Globe className="w-5 h-5 text-blue-400" />
                    <h4 className="text-white font-medium">{host.ip}</h4>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-blue-400 transition-colors" />
                </div>
                
                {host.hostname && (
                  <p className="text-slate-300 text-sm mb-2">{host.hostname}</p>
                )}
                
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-lg font-bold text-green-400">{openPorts}</p>
                    <p className="text-slate-400 text-xs">Ports</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold text-blue-400">{host.services.length}</p>
                    <p className="text-slate-400 text-xs">Services</p>
                  </div>
                  <div>
                    <p className={`text-lg font-bold ${hostVulns > 0 ? 'text-red-400' : 'text-green-400'}`}>
                      {hostVulns}
                    </p>
                    <p className="text-slate-400 text-xs">Vulns</p>
                  </div>
                </div>
                
                {/* Service Preview */}
                <div className="mt-3 pt-3 border-t border-slate-600">
                  <p className="text-slate-400 text-xs mb-1">Services principaux:</p>
                  <div className="flex flex-wrap gap-1">
                    {host.services.slice(0, 3).map(service => (
                      <span 
                        key={`${service.port}-${service.name}`}
                        className="px-2 py-1 bg-slate-800 text-slate-300 text-xs rounded"
                      >
                        {service.name}:{service.port}
                      </span>
                    ))}
                    {host.services.length > 3 && (
                      <span className="px-2 py-1 bg-slate-600 text-slate-400 text-xs rounded">
                        +{host.services.length - 3}
                      </span>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </Card>

      {/* Quick Actions */}
      <Card className="p-6 bg-slate-800/50 backdrop-blur-sm border-slate-700">
        <h3 className="text-xl font-semibold text-white mb-4">Actions rapides</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Button
            onClick={() => setCurrentView('hosts')}
            variant="outline"
            className="h-16 flex-col gap-2 border-slate-600 hover:bg-slate-700"
          >
            <Server className="w-6 h-6" />
            <span>Explorer les hôtes</span>
          </Button>
          
          <Button
            onClick={() => setCurrentView('services')}
            variant="outline"
            className="h-16 flex-col gap-2 border-slate-600 hover:bg-slate-700"
          >
            <Terminal className="w-6 h-6" />
            <span>Analyser les services</span>
          </Button>
          
          <Button
            onClick={() => setCurrentView('vulnerabilities')}
            variant="outline"
            className="h-16 flex-col gap-2 border-slate-600 hover:bg-slate-700"
          >
            <Shield className="w-6 h-6" />
            <span>Examiner les vulnérabilités</span>
          </Button>
          
          <Button
            onClick={() => setCurrentView('files')}
            variant="outline"
            className="h-16 flex-col gap-2 border-slate-600 hover:bg-slate-700"
          >
            <Activity className="w-6 h-6" />
            <span>Parcourir les fichiers</span>
          </Button>
        </div>
      </Card>

      {/* Scan Information */}
      <Card className="p-6 bg-slate-800/50 backdrop-blur-sm border-slate-700">
        <h3 className="text-xl font-semibold text-white mb-4">Informations du scan</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <p className="text-slate-400 text-sm">Date du scan</p>
            <p className="text-white font-medium">
              {new Date(data.report.timestamp).toLocaleString('fr-FR')}
            </p>
          </div>
          
          <div>
            <p className="text-slate-400 text-sm">Commandes exécutées</p>
            <p className="text-white font-medium">{stats.totalCommands}</p>
          </div>
          
          <div>
            <p className="text-slate-400 text-sm">Ports uniques scannés</p>
            <p className="text-white font-medium">{uniquePorts.length}</p>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default OverviewPanel;
