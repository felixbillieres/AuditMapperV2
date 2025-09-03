import React, { useState } from 'react';
import { useAutoReconStore } from '../../../stores/autoReconStore';
import { Card } from '../../ui/card';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { 
  Server, 
  Terminal, 
  Shield, 
  Search, 
  Filter,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Clock,
  ChevronDown,
  ChevronUp,
  Activity
} from 'lucide-react';
import { AutoReconHost } from '../../../types/autorecon';

const HostsPanel: React.FC = () => {
  const { 
    getFilteredHosts, 
    selectedHosts,
    setSelectedHosts,
    filters,
    setFilters,
    searchTerm,
    setSearchTerm
  } = useAutoReconStore();

  const [expandedHosts, setExpandedHosts] = useState<Set<string>>(new Set());
  const [showFilters, setShowFilters] = useState(false);

  const hosts = getFilteredHosts();

  const toggleHostExpansion = (ip: string) => {
    const newExpanded = new Set(expandedHosts);
    if (newExpanded.has(ip)) {
      newExpanded.delete(ip);
    } else {
      newExpanded.add(ip);
    }
    setExpandedHosts(newExpanded);
  };

  const toggleHostSelection = (ip: string) => {
    const newSelected = selectedHosts.includes(ip)
      ? selectedHosts.filter(h => h !== ip)
      : [...selectedHosts, ip];
    setSelectedHosts(newSelected);
  };



  const getHostVulnStats = (host: AutoReconHost) => {
    const allVulns = [
      ...host.vulnerabilities,
      ...host.services.flatMap(s => s.vulnerabilities)
    ];
    
    return {
      total: allVulns.length,
      critical: allVulns.filter(v => v.severity === 'critical').length,
      high: allVulns.filter(v => v.severity === 'high').length,
      medium: allVulns.filter(v => v.severity === 'medium').length,
      low: allVulns.filter(v => v.severity === 'low').length
    };
  };

  const getPortStatusColor = (state: string) => {
    switch (state) {
      case 'open': return 'text-green-400';
      case 'closed': return 'text-red-400';
      case 'filtered': return 'text-yellow-400';
      default: return 'text-slate-400';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header and Controls */}
      <Card className="p-6 bg-slate-800/50 backdrop-blur-sm border-slate-700">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-white">Hôtes découverts</h2>
            <p className="text-slate-400">{hosts.length} hôte(s) trouvé(s)</p>
          </div>
          
          <div className="flex items-center gap-4">
            <Button
              onClick={() => setShowFilters(!showFilters)}
              variant="outline"
              className="border-slate-600 text-slate-300"
            >
              <Filter className="w-4 h-4 mr-2" />
              Filtres
            </Button>
          </div>
        </div>

        {/* Filters */}
        {showFilters && (
          <div className="border-t border-slate-600 pt-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Recherche globale
                </label>
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
                  <Input
                    placeholder="IP, service, port..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 bg-slate-700 border-slate-600 text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Avec vulnérabilités
                </label>
                <select
                  className="w-full p-2 bg-slate-700 border border-slate-600 rounded text-white"
                  value={filters.hasVulnerabilities?.toString() || ''}
                  onChange={(e) => setFilters({ 
                    hasVulnerabilities: e.target.value ? e.target.value === 'true' : undefined 
                  })}
                >
                  <option value="">Tous</option>
                  <option value="true">Avec vulnérabilités</option>
                  <option value="false">Sans vulnérabilités</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Système d'exploitation
                </label>
                <Input
                  placeholder="Linux, Windows..."
                  value={filters.osType || ''}
                  onChange={(e) => setFilters({ osType: e.target.value || undefined })}
                  className="bg-slate-700 border-slate-600 text-white"
                />
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* Hosts List */}
      <div className="space-y-4">
        {hosts.map((host) => {
          const vulnStats = getHostVulnStats(host);
          const isExpanded = expandedHosts.has(host.ip);
          const isSelected = selectedHosts.includes(host.ip);
          const openPorts = host.ports.filter(p => p.state === 'open');

          return (
            <Card key={host.ip} className={`p-6 bg-slate-800/50 backdrop-blur-sm border-slate-700 ${isSelected ? 'ring-2 ring-purple-500' : ''}`}>
              {/* Host Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleHostSelection(host.ip)}
                      className="w-4 h-4 text-purple-600 rounded"
                    />
                    <Server className="w-6 h-6 text-blue-400" />
                    <div>
                      <h3 className="text-xl font-semibold text-white">{host.ip}</h3>
                      {host.hostname && (
                        <p className="text-slate-400">{host.hostname}</p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  {/* Quick Stats */}
                  <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-1">
                      <Activity className="w-4 h-4 text-green-400" />
                      <span className="text-white">{openPorts.length}</span>
                      <span className="text-slate-400">ports</span>
                    </div>
                    
                    <div className="flex items-center gap-1">
                      <Terminal className="w-4 h-4 text-blue-400" />
                      <span className="text-white">{host.services.length}</span>
                      <span className="text-slate-400">services</span>
                    </div>

                    {vulnStats.total > 0 && (
                      <div className="flex items-center gap-1">
                        <Shield className="w-4 h-4 text-red-400" />
                        <span className="text-white">{vulnStats.total}</span>
                        <span className="text-slate-400">vulns</span>
                      </div>
                    )}
                  </div>

                  <Button
                    onClick={() => toggleHostExpansion(host.ip)}
                    variant="ghost"
                    size="sm"
                    className="text-slate-400 hover:text-white"
                  >
                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </Button>
                </div>
              </div>

              {/* Quick Overview */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                {/* Ports Summary */}
                <div className="bg-slate-700/30 rounded p-3">
                  <h4 className="text-sm font-medium text-slate-300 mb-2">Ports ouverts</h4>
                  <div className="flex flex-wrap gap-1">
                    {openPorts.slice(0, 6).map((port, index) => (
                      <span
                        key={`${host.ip}-${port.port}-${port.protocol}-${index}`}
                        className="px-2 py-1 bg-green-900/30 text-green-300 text-xs rounded"
                      >
                        {port.port}/{port.protocol}
                      </span>
                    ))}
                    {openPorts.length > 6 && (
                      <span className="px-2 py-1 bg-slate-600 text-slate-300 text-xs rounded">
                        +{openPorts.length - 6}
                      </span>
                    )}
                  </div>
                </div>

                {/* Services Summary */}
                <div className="bg-slate-700/30 rounded p-3">
                  <h4 className="text-sm font-medium text-slate-300 mb-2">Services principaux</h4>
                  <div className="space-y-1">
                    {host.services.slice(0, 3).map((service, index) => (
                      <div key={`${host.ip}-${service.port}-${service.name}-${index}`} className="text-xs text-slate-300">
                        {service.name} ({service.port}/{service.protocol})
                      </div>
                    ))}
                    {host.services.length > 3 && (
                      <div className="text-xs text-slate-400">
                        +{host.services.length - 3} autres...
                      </div>
                    )}
                  </div>
                </div>

                {/* Vulnerabilities Summary */}
                <div className="bg-slate-700/30 rounded p-3">
                  <h4 className="text-sm font-medium text-slate-300 mb-2">Vulnérabilités</h4>
                  {vulnStats.total > 0 ? (
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      {vulnStats.critical > 0 && (
                        <div className="flex items-center gap-1 text-red-400">
                          <XCircle className="w-3 h-3" />
                          {vulnStats.critical} critique
                        </div>
                      )}
                      {vulnStats.high > 0 && (
                        <div className="flex items-center gap-1 text-orange-400">
                          <AlertTriangle className="w-3 h-3" />
                          {vulnStats.high} haute
                        </div>
                      )}
                      {vulnStats.medium > 0 && (
                        <div className="flex items-center gap-1 text-yellow-400">
                          <Clock className="w-3 h-3" />
                          {vulnStats.medium} moyenne
                        </div>
                      )}
                      {vulnStats.low > 0 && (
                        <div className="flex items-center gap-1 text-blue-400">
                          <CheckCircle className="w-3 h-3" />
                          {vulnStats.low} faible
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-green-400 text-xs">Aucune vulnérabilité détectée</div>
                  )}
                </div>
              </div>

              {/* Expanded Details */}
              {isExpanded && (
                <div className="border-t border-slate-600 pt-4 space-y-4">
                  {/* OS Information */}
                  {host.osFingerprint && (
                    <div>
                      <h4 className="text-lg font-medium text-white mb-2">Système d'exploitation</h4>
                      <div className="bg-slate-700/30 rounded p-3">
                        <p className="text-white">{host.osFingerprint.os}</p>
                        <p className="text-slate-400 text-sm">Confiance: {host.osFingerprint.confidence}%</p>
                        {host.osFingerprint.details && (
                          <p className="text-slate-300 text-sm mt-1">{host.osFingerprint.details}</p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Detailed Ports */}
                  <div>
                    <h4 className="text-lg font-medium text-white mb-2">Tous les ports</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {host.ports.map((port, index) => (
                        <div key={`${host.ip}-${port.port}-${port.protocol}-${index}`} className="bg-slate-700/30 rounded p-3">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-white font-medium">
                              {port.port}/{port.protocol}
                            </span>
                            <span className={`text-sm ${getPortStatusColor(port.state)}`}>
                              {port.state}
                            </span>
                          </div>
                          <p className="text-slate-300 text-sm">{port.service}</p>
                          {port.version && (
                            <p className="text-slate-400 text-xs mt-1">{port.version}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Services Details */}
                  {host.services.length > 0 && (
                    <div>
                      <h4 className="text-lg font-medium text-white mb-2">Services détaillés</h4>
                      <div className="space-y-3">
                        {host.services.map((service, index) => (
                          <div key={`${host.ip}-${service.port}-${service.name}-${index}`} className="bg-slate-700/30 rounded p-4">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <Terminal className="w-4 h-4 text-blue-400" />
                                <span className="text-white font-medium">{service.name}</span>
                                <span className="text-slate-400">
                                  ({service.port}/{service.protocol})
                                </span>
                              </div>
                              {service.vulnerabilities.length > 0 && (
                                <span className="px-2 py-1 bg-red-900/30 text-red-300 text-xs rounded">
                                  {service.vulnerabilities.length} vulns
                                </span>
                              )}
                            </div>
                            
                            {service.version && (
                              <p className="text-slate-300 text-sm mb-2">{service.version}</p>
                            )}
                            
                            {service.banner && (
                              <p className="text-slate-400 text-xs font-mono bg-slate-800/50 p-2 rounded">
                                {service.banner}
                              </p>
                            )}

                            <div className="mt-2 text-slate-400 text-sm">
                              {service.scans.length} scan(s) • {service.files.length} fichier(s)
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Notes */}
                  {host.notes && (
                    <div>
                      <h4 className="text-lg font-medium text-white mb-2">Notes</h4>
                      <div className="bg-slate-700/30 rounded p-3">
                        <pre className="text-slate-300 text-sm whitespace-pre-wrap">
                          {host.notes}
                        </pre>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </Card>
          );
        })}

        {hosts.length === 0 && (
          <Card className="p-12 text-center bg-slate-800/50 backdrop-blur-sm border-slate-700">
            <Server className="w-16 h-16 text-slate-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">Aucun hôte trouvé</h3>
            <p className="text-slate-400">
              Aucun hôte ne correspond aux critères de recherche actuels.
            </p>
          </Card>
        )}
      </div>
    </div>
  );
};

export default HostsPanel;
