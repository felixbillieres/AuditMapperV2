import React, { useState } from 'react';
import { useAutoReconStore } from '../../../stores/autoReconStore';
import { Card } from '../../ui/card';
import { Input } from '../../ui/input';
import { 
  Terminal, 
  Server, 
  Shield, 
  Search, 
  ChevronDown,
  ChevronUp,
  Activity,
  AlertTriangle,
  CheckCircle,
  Clock,
  XCircle
} from 'lucide-react';

const ServicesPanel: React.FC = () => {
  const { 
    data,
    getUniqueServices,
    getServiceViewData
  } = useAutoReconStore();

  const [selectedService, setSelectedService] = useState<string | null>(null);
  const [expandedScans, setExpandedScans] = useState<Set<string>>(new Set());
  const [serviceSearchTerm, setServiceSearchTerm] = useState('');

  if (!data) return null;

  const uniqueServices = getUniqueServices();
  const filteredServices = uniqueServices.filter(service =>
    service.toLowerCase().includes(serviceSearchTerm.toLowerCase())
  );

  const serviceViewData = selectedService ? getServiceViewData(selectedService) : null;

  const toggleScanExpansion = (scanId: string) => {
    const newExpanded = new Set(expandedScans);
    if (newExpanded.has(scanId)) {
      newExpanded.delete(scanId);
    } else {
      newExpanded.add(scanId);
    }
    setExpandedScans(newExpanded);
  };

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
      case 'critical': return <XCircle className="w-4 h-4" />;
      case 'high': return <AlertTriangle className="w-4 h-4" />;
      case 'medium': return <Clock className="w-4 h-4" />;
      case 'low': return <CheckCircle className="w-4 h-4" />;
      default: return <CheckCircle className="w-4 h-4" />;
    }
  };

  const getToolColor = (tool: string) => {
    switch (tool.toLowerCase()) {
      case 'nmap': return 'text-blue-400';
      case 'nikto': return 'text-red-400';
      case 'feroxbuster':
      case 'gobuster': return 'text-green-400';
      case 'curl': return 'text-yellow-400';
      case 'whatweb': return 'text-purple-400';
      case 'enum4linux': return 'text-orange-400';
      case 'snmpwalk': return 'text-cyan-400';
      default: return 'text-slate-400';
    }
  };

  const formatScanOutput = (output: string, maxLines: number = 20) => {
    const lines = output.split('\n');
    if (lines.length <= maxLines) {
      return output;
    }
    return lines.slice(0, maxLines).join('\n') + `\n... (${lines.length - maxLines} lignes supplémentaires)`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="p-6 bg-slate-800/50 backdrop-blur-sm border-slate-700">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white">Services découverts</h2>
            <p className="text-slate-400">{uniqueServices.length} service(s) unique(s)</p>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Services List */}
        <Card className="lg:col-span-1 p-6 bg-slate-800/50 backdrop-blur-sm border-slate-700">
          <div className="mb-4">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="Rechercher un service..."
                value={serviceSearchTerm}
                onChange={(e) => setServiceSearchTerm(e.target.value)}
                className="pl-10 bg-slate-700 border-slate-600 text-white"
              />
            </div>
          </div>

          <div className="space-y-2 max-h-96 overflow-y-auto">
            {filteredServices.map((service) => {
              const serviceData = getServiceViewData(service);
              const isSelected = selectedService === service;

              return (
                <button
                  key={service}
                  onClick={() => setSelectedService(service)}
                  className={`
                    w-full text-left p-3 rounded-lg border transition-all duration-200
                    ${isSelected 
                      ? 'bg-purple-900/30 border-purple-500 text-white' 
                      : 'bg-slate-700/30 border-slate-600 text-slate-300 hover:bg-slate-700/50'
                    }
                  `}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Terminal className="w-4 h-4 text-blue-400" />
                      <span className="font-medium">{service || 'Service inconnu'}</span>
                    </div>
                    <span className="text-xs text-slate-400">
                      {serviceData?.totalHosts || 0} hôte(s)
                    </span>
                  </div>
                  
                  {serviceData && (
                    <div className="mt-2 flex items-center gap-4 text-xs text-slate-400">
                      <div className="flex items-center gap-1">
                        <Activity className="w-3 h-3" />
                        Port {serviceData.port}
                      </div>
                      {serviceData.totalVulns > 0 && (
                        <div className="flex items-center gap-1 text-red-400">
                          <Shield className="w-3 h-3" />
                          {serviceData.totalVulns} vulns
                        </div>
                      )}
                    </div>
                  )}
                </button>
              );
            })}

            {filteredServices.length === 0 && (
              <div className="text-center py-8 text-slate-400">
                <Terminal className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>Aucun service trouvé</p>
              </div>
            )}
          </div>
        </Card>

        {/* Service Details */}
        <Card className="lg:col-span-2 p-6 bg-slate-800/50 backdrop-blur-sm border-slate-700">
          {selectedService && serviceViewData ? (
            <div className="space-y-6">
              {/* Service Header */}
              <div className="border-b border-slate-600 pb-4">
                <h3 className="text-2xl font-bold text-white mb-2">{selectedService}</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-slate-400 text-sm">Port</p>
                    <p className="text-white font-medium">
                      {serviceViewData.port}/{serviceViewData.protocol}
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-400 text-sm">Hôtes</p>
                    <p className="text-white font-medium">{serviceViewData.totalHosts}</p>
                  </div>
                  <div>
                    <p className="text-slate-400 text-sm">Scans</p>
                    <p className="text-white font-medium">{serviceViewData.totalScans}</p>
                  </div>
                  <div>
                    <p className="text-slate-400 text-sm">Vulnérabilités</p>
                    <p className={`font-medium ${serviceViewData.totalVulns > 0 ? 'text-red-400' : 'text-green-400'}`}>
                      {serviceViewData.totalVulns}
                    </p>
                  </div>
                </div>
              </div>

              {/* Hosts with this service */}
              <div>
                <h4 className="text-lg font-semibold text-white mb-4">Hôtes avec ce service</h4>
                <div className="space-y-4">
                  {serviceViewData.hosts.map((host) => (
                    <Card key={host.ip} className="p-4 bg-slate-700/30 border-slate-600">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <Server className="w-5 h-5 text-blue-400" />
                          <div>
                            <h5 className="text-white font-medium">{host.ip}</h5>
                            {host.version && (
                              <p className="text-slate-400 text-sm">{host.version}</p>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 text-sm">
                          <span className="text-slate-400">{host.scans.length} scan(s)</span>
                          {host.vulnerabilities.length > 0 && (
                            <span className="px-2 py-1 bg-red-900/30 text-red-300 text-xs rounded">
                              {host.vulnerabilities.length} vulns
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Banner */}
                      {host.banner && (
                        <div className="mb-3">
                          <p className="text-slate-400 text-xs mb-1">Banner:</p>
                          <p className="text-slate-300 text-sm font-mono bg-slate-800/50 p-2 rounded">
                            {host.banner}
                          </p>
                        </div>
                      )}

                      {/* Vulnerabilities */}
                      {host.vulnerabilities.length > 0 && (
                        <div className="mb-3">
                          <p className="text-slate-400 text-xs mb-2">Vulnérabilités:</p>
                          <div className="space-y-1">
                            {host.vulnerabilities.slice(0, 3).map((vuln, index) => (
                              <div key={index} className="flex items-center gap-2 text-sm">
                                <div className={getSeverityColor(vuln.severity)}>
                                  {getSeverityIcon(vuln.severity)}
                                </div>
                                <span className="text-slate-300 truncate">{vuln.title}</span>
                                {vuln.cve && (
                                  <span className="text-xs text-slate-400 bg-slate-800 px-1 rounded">
                                    {vuln.cve}
                                  </span>
                                )}
                              </div>
                            ))}
                            {host.vulnerabilities.length > 3 && (
                              <p className="text-slate-400 text-xs">
                                +{host.vulnerabilities.length - 3} autres vulnérabilités
                              </p>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Scans */}
                      <div>
                        <p className="text-slate-400 text-xs mb-2">Scans disponibles:</p>
                        <div className="space-y-2">
                          {host.scans.map((scan, index) => {
                            const scanId = `${host.ip}-${index}`;
                            const isExpanded = expandedScans.has(scanId);

                            return (
                              <div key={index} className="bg-slate-800/50 rounded p-3">
                                <button
                                  onClick={() => toggleScanExpansion(scanId)}
                                  className="w-full flex items-center justify-between text-left"
                                >
                                  <div className="flex items-center gap-2">
                                    <div className={`w-2 h-2 rounded-full ${getToolColor(scan.tool)}`}></div>
                                    <span className={`text-sm font-medium ${getToolColor(scan.tool)}`}>
                                      {scan.tool}
                                    </span>
                                    {scan.outputFile && (
                                      <span className="text-xs text-slate-400">
                                        ({scan.outputFile})
                                      </span>
                                    )}
                                  </div>
                                  {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                </button>

                                {isExpanded && (
                                  <div className="mt-3 space-y-3">
                                    {scan.command && (
                                      <div>
                                        <p className="text-slate-400 text-xs mb-1">Commande:</p>
                                        <p className="text-slate-300 text-sm font-mono bg-slate-900/50 p-2 rounded">
                                          {scan.command}
                                        </p>
                                      </div>
                                    )}

                                    <div>
                                      <p className="text-slate-400 text-xs mb-1">Sortie:</p>
                                      <pre className="text-slate-300 text-xs font-mono bg-slate-900/50 p-3 rounded overflow-x-auto whitespace-pre-wrap">
                                        {formatScanOutput(scan.output)}
                                      </pre>
                                    </div>

                                    {scan.timestamp && (
                                      <p className="text-slate-400 text-xs">
                                        Exécuté le: {scan.timestamp}
                                      </p>
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-12">
              <Terminal className="w-16 h-16 text-slate-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">
                Sélectionnez un service
              </h3>
              <p className="text-slate-400">
                Choisissez un service dans la liste de gauche pour voir les détails
              </p>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

export default ServicesPanel;
