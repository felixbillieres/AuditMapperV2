import React, { useState } from 'react';
import { useAutoReconStore } from '../../../stores/autoReconStore';
import { Card } from '../../ui/card';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { 
  Shield, 
  AlertTriangle, 
  Search, 
  ExternalLink,
  Server,
  Terminal,
  CheckCircle,
  XCircle,
  Clock,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

const VulnerabilitiesPanel: React.FC = () => {
  const { getAllVulnerabilities } = useAutoReconStore();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSeverity, setSelectedSeverity] = useState('');
  const [expandedVulns, setExpandedVulns] = useState<Set<string>>(new Set());
  const [sortBy, setSortBy] = useState<'severity' | 'host' | 'service'>('severity');

  const allVulns = getAllVulnerabilities();

  // Filter vulnerabilities
  const filteredVulns = allVulns.filter(vuln => {
    const matchesSearch = !searchTerm || 
      vuln.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vuln.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vuln.hostIp.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (vuln.serviceName && vuln.serviceName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (vuln.cve && vuln.cve.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesSeverity = !selectedSeverity || vuln.severity === selectedSeverity;

    return matchesSearch && matchesSeverity;
  });

  // Sort vulnerabilities
  const sortedVulns = [...filteredVulns].sort((a, b) => {
    if (sortBy === 'severity') {
      const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
      return (severityOrder[b.severity as keyof typeof severityOrder] || 0) - 
             (severityOrder[a.severity as keyof typeof severityOrder] || 0);
    } else if (sortBy === 'host') {
      return a.hostIp.localeCompare(b.hostIp);
    } else if (sortBy === 'service') {
      return (a.serviceName || '').localeCompare(b.serviceName || '');
    }
    return 0;
  });

  const toggleVulnExpansion = (vulnId: string) => {
    const newExpanded = new Set(expandedVulns);
    if (newExpanded.has(vulnId)) {
      newExpanded.delete(vulnId);
    } else {
      newExpanded.add(vulnId);
    }
    setExpandedVulns(newExpanded);
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'text-red-400 bg-red-900/20 border-red-500/50';
      case 'high': return 'text-orange-400 bg-orange-900/20 border-orange-500/50';
      case 'medium': return 'text-yellow-400 bg-yellow-900/20 border-yellow-500/50';
      case 'low': return 'text-blue-400 bg-blue-900/20 border-blue-500/50';
      default: return 'text-slate-400 bg-slate-900/20 border-slate-500/50';
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

  const getSeverityBadgeColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-600 text-white';
      case 'high': return 'bg-orange-600 text-white';
      case 'medium': return 'bg-yellow-600 text-black';
      case 'low': return 'bg-blue-600 text-white';
      default: return 'bg-slate-600 text-white';
    }
  };

  // Statistics
  const vulnStats = {
    total: allVulns.length,
    critical: allVulns.filter(v => v.severity === 'critical').length,
    high: allVulns.filter(v => v.severity === 'high').length,
    medium: allVulns.filter(v => v.severity === 'medium').length,
    low: allVulns.filter(v => v.severity === 'low').length
  };

  return (
    <div className="space-y-6">
      {/* Header and Statistics */}
      <Card className="p-6 bg-slate-800/50 backdrop-blur-sm border-slate-700">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-white mb-2">Vulnérabilités</h2>
            <p className="text-slate-400">{filteredVulns.length} / {allVulns.length} vulnérabilité(s)</p>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-slate-700/30 rounded p-4 text-center">
            <Shield className="w-8 h-8 text-slate-400 mx-auto mb-2" />
            <p className="text-2xl font-bold text-white">{vulnStats.total}</p>
            <p className="text-slate-400 text-sm">Total</p>
          </div>

          <div className="bg-red-900/20 border border-red-500/30 rounded p-4 text-center">
            <XCircle className="w-8 h-8 text-red-400 mx-auto mb-2" />
            <p className="text-2xl font-bold text-red-400">{vulnStats.critical}</p>
            <p className="text-red-300 text-sm">Critique</p>
          </div>

          <div className="bg-orange-900/20 border border-orange-500/30 rounded p-4 text-center">
            <AlertTriangle className="w-8 h-8 text-orange-400 mx-auto mb-2" />
            <p className="text-2xl font-bold text-orange-400">{vulnStats.high}</p>
            <p className="text-orange-300 text-sm">Élevé</p>
          </div>

          <div className="bg-yellow-900/20 border border-yellow-500/30 rounded p-4 text-center">
            <Clock className="w-8 h-8 text-yellow-400 mx-auto mb-2" />
            <p className="text-2xl font-bold text-yellow-400">{vulnStats.medium}</p>
            <p className="text-yellow-300 text-sm">Moyen</p>
          </div>

          <div className="bg-blue-900/20 border border-blue-500/30 rounded p-4 text-center">
            <CheckCircle className="w-8 h-8 text-blue-400 mx-auto mb-2" />
            <p className="text-2xl font-bold text-blue-400">{vulnStats.low}</p>
            <p className="text-blue-300 text-sm">Faible</p>
          </div>
        </div>
      </Card>

      {/* Filters and Search */}
      <Card className="p-6 bg-slate-800/50 backdrop-blur-sm border-slate-700">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
            <Input
              placeholder="Rechercher vulnérabilités..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-slate-700 border-slate-600 text-white"
            />
          </div>

          <select
            className="p-2 bg-slate-700 border border-slate-600 rounded text-white"
            value={selectedSeverity}
            onChange={(e) => setSelectedSeverity(e.target.value)}
          >
            <option value="">Toutes les sévérités</option>
            <option value="critical">Critique</option>
            <option value="high">Élevé</option>
            <option value="medium">Moyen</option>
            <option value="low">Faible</option>
          </select>

          <select
            className="p-2 bg-slate-700 border border-slate-600 rounded text-white"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
          >
            <option value="severity">Trier par sévérité</option>
            <option value="host">Trier par hôte</option>
            <option value="service">Trier par service</option>
          </select>

          <Button
            onClick={() => {
              setSearchTerm('');
              setSelectedSeverity('');
            }}
            variant="outline"
            className="border-slate-600 text-slate-300"
          >
            Réinitialiser
          </Button>
        </div>
      </Card>

      {/* Vulnerabilities List */}
      <div className="space-y-4">
        {sortedVulns.map((vuln) => {
          const vulnId = `${vuln.hostIp}-${vuln.id}`;
          const isExpanded = expandedVulns.has(vulnId);

          return (
            <Card 
              key={vulnId} 
              className={`p-6 border ${getSeverityColor(vuln.severity)}`}
            >
              {/* Vulnerability Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-start gap-4 flex-1">
                  <div className={`flex-shrink-0 ${getSeverityColor(vuln.severity).split(' ')[0]}`}>
                    {getSeverityIcon(vuln.severity)}
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-white">{vuln.title}</h3>
                      <span className={`px-2 py-1 text-xs font-semibold rounded uppercase ${getSeverityBadgeColor(vuln.severity)}`}>
                        {vuln.severity}
                      </span>
                      {vuln.cve && (
                        <span className="px-2 py-1 bg-slate-700 text-slate-300 text-xs rounded">
                          {vuln.cve}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-4 text-sm text-slate-400">
                      <div className="flex items-center gap-1">
                        <Server className="w-4 h-4" />
                        <span>{vuln.hostIp}</span>
                      </div>
                      
                      {vuln.serviceName && (
                        <div className="flex items-center gap-1">
                          <Terminal className="w-4 h-4" />
                          <span>{vuln.serviceName}</span>
                        </div>
                      )}
                      
                      {vuln.port && (
                        <span>Port {vuln.port}</span>
                      )}
                    </div>
                  </div>
                </div>

                <Button
                  onClick={() => toggleVulnExpansion(vulnId)}
                  variant="ghost"
                  size="sm"
                  className="text-slate-400 hover:text-white"
                >
                  {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </Button>
              </div>

              {/* Quick Description */}
              <p className="text-slate-300 mb-4">{vuln.description}</p>

              {/* Expanded Details */}
              {isExpanded && (
                <div className="border-t border-slate-600 pt-4 space-y-4">
                  {/* CVSS Score */}
                  {vuln.cvss && (
                    <div>
                      <h4 className="text-white font-medium mb-2">Score CVSS</h4>
                      <div className="flex items-center gap-2">
                        <div className="w-20 bg-slate-700 rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full ${
                              vuln.cvss >= 9 ? 'bg-red-500' :
                              vuln.cvss >= 7 ? 'bg-orange-500' :
                              vuln.cvss >= 4 ? 'bg-yellow-500' : 'bg-blue-500'
                            }`}
                            style={{ width: `${(vuln.cvss / 10) * 100}%` }}
                          ></div>
                        </div>
                        <span className="text-white font-semibold">{vuln.cvss}/10</span>
                      </div>
                    </div>
                  )}

                  {/* References */}
                  {vuln.references && vuln.references.length > 0 && (
                    <div>
                      <h4 className="text-white font-medium mb-2">Références</h4>
                      <div className="space-y-1">
                        {vuln.references.map((ref: string, index: number) => (
                          <a
                            key={index}
                            href={ref}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 text-blue-400 hover:text-blue-300 text-sm"
                          >
                            <ExternalLink className="w-3 h-3" />
                            {ref}
                          </a>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* CVE Information */}
                  {vuln.cve && (
                    <div>
                      <h4 className="text-white font-medium mb-2">Informations CVE</h4>
                      <div className="bg-slate-700/30 rounded p-3">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-white font-medium">{vuln.cve}</span>
                          <a
                            href={`https://cve.mitre.org/cgi-bin/cvename.cgi?name=${vuln.cve}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-400 hover:text-blue-300 text-sm"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        </div>
                        <p className="text-slate-300 text-sm">{vuln.description}</p>
                      </div>
                    </div>
                  )}

                  {/* Additional Information */}
                  <div className="bg-slate-700/30 rounded p-3">
                    <h4 className="text-white font-medium mb-2">Détails techniques</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-slate-400">Hôte affecté:</span>
                        <span className="text-white ml-2">{vuln.hostIp}</span>
                      </div>
                      
                      {vuln.serviceName && (
                        <div>
                          <span className="text-slate-400">Service:</span>
                          <span className="text-white ml-2">{vuln.serviceName}</span>
                        </div>
                      )}
                      
                      {vuln.port && (
                        <div>
                          <span className="text-slate-400">Port:</span>
                          <span className="text-white ml-2">{vuln.port}</span>
                        </div>
                      )}
                      
                      <div>
                        <span className="text-slate-400">Sévérité:</span>
                        <span className={`ml-2 font-medium ${getSeverityColor(vuln.severity).split(' ')[0]}`}>
                          {vuln.severity.charAt(0).toUpperCase() + vuln.severity.slice(1)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </Card>
          );
        })}

        {sortedVulns.length === 0 && (
          <Card className="p-12 text-center bg-slate-800/50 backdrop-blur-sm border-slate-700">
            <Shield className="w-16 h-16 text-slate-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">Aucune vulnérabilité trouvée</h3>
            <p className="text-slate-400">
              {allVulns.length === 0 
                ? 'Aucune vulnérabilité détectée dans les scans.'
                : 'Aucune vulnérabilité ne correspond aux critères de recherche actuels.'
              }
            </p>
          </Card>
        )}
      </div>
    </div>
  );
};

export default VulnerabilitiesPanel;
