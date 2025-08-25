import React from 'react';
import { useAutoReconStore } from '../../../stores/autoReconStore';
import { Card } from '../../ui/card';
import { Button } from '../../ui/button';
import { 
  ArrowLeft,
  Server, 
  Terminal, 
  Shield, 
  Activity,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  ChevronRight,
  Network,
  Globe
} from 'lucide-react';

interface HostDetailViewProps {
  hostIp: string;
  onBack: () => void;
  onServiceClick: (hostIp: string, serviceName: string, port: number) => void;
}

const HostDetailView: React.FC<HostDetailViewProps> = ({ hostIp, onBack, onServiceClick }) => {
  const { getHostByIP } = useAutoReconStore();
  
  const host = getHostByIP(hostIp);
  
  if (!host) {
    return (
      <div className="text-center py-12">
        <Server className="w-16 h-16 text-slate-400 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-white mb-2">Hôte non trouvé</h3>
        <p className="text-slate-400 mb-4">L'hôte {hostIp} n'a pas été trouvé.</p>
        <Button onClick={onBack} variant="outline">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Retour au dashboard
        </Button>
      </div>
    );
  }

  const hostVulns = host.vulnerabilities.length + 
    host.services.reduce((sum, service) => sum + service.vulnerabilities.length, 0);
  const openPorts = host.ports.filter(p => p.state === 'open').length;
  const criticalVulns = [...host.vulnerabilities, ...host.services.flatMap(s => s.vulnerabilities)]
    .filter(v => v.severity === 'critical').length;
  const highVulns = [...host.vulnerabilities, ...host.services.flatMap(s => s.vulnerabilities)]
    .filter(v => v.severity === 'high').length;

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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button onClick={onBack} variant="outline" size="sm">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Retour
        </Button>
        <div className="flex items-center gap-3">
          <Globe className="w-8 h-8 text-blue-400" />
          <div>
            <h2 className="text-2xl font-bold text-white">{host.ip}</h2>
            {host.hostname && (
              <p className="text-slate-400">{host.hostname}</p>
            )}
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4 bg-slate-800/50 backdrop-blur-sm border-slate-700">
          <div className="flex items-center gap-3">
            <Activity className="w-6 h-6 text-green-400" />
            <div>
              <p className="text-xl font-bold text-white">{openPorts}</p>
              <p className="text-slate-400 text-sm">Ports ouverts</p>
            </div>
          </div>
        </Card>

        <Card className="p-4 bg-slate-800/50 backdrop-blur-sm border-slate-700">
          <div className="flex items-center gap-3">
            <Terminal className="w-6 h-6 text-blue-400" />
            <div>
              <p className="text-xl font-bold text-white">{host.services.length}</p>
              <p className="text-slate-400 text-sm">Services</p>
            </div>
          </div>
        </Card>

        <Card className="p-4 bg-slate-800/50 backdrop-blur-sm border-slate-700">
          <div className="flex items-center gap-3">
            <Shield className="w-6 h-6 text-red-400" />
            <div>
              <p className="text-xl font-bold text-white">{hostVulns}</p>
              <p className="text-slate-400 text-sm">Vulnérabilités</p>
            </div>
          </div>
        </Card>

        <Card className="p-4 bg-slate-800/50 backdrop-blur-sm border-slate-700">
          <div className="flex items-center gap-3">
            <Network className="w-6 h-6 text-purple-400" />
            <div>
              <p className="text-xl font-bold text-white">{host.scans.length}</p>
              <p className="text-slate-400 text-sm">Scans</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Vulnerabilities Summary */}
      {hostVulns > 0 && (
        <Card className="p-6 bg-slate-800/50 backdrop-blur-sm border-slate-700">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Shield className="w-5 h-5 text-red-400" />
            Résumé des vulnérabilités
          </h3>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {criticalVulns > 0 && (
              <div className="flex items-center gap-2">
                <XCircle className="w-5 h-5 text-red-400" />
                <div>
                  <p className="text-lg font-bold text-red-400">{criticalVulns}</p>
                  <p className="text-slate-400 text-sm">Critique</p>
                </div>
              </div>
            )}
            {highVulns > 0 && (
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-orange-400" />
                <div>
                  <p className="text-lg font-bold text-orange-400">{highVulns}</p>
                  <p className="text-slate-400 text-sm">Élevé</p>
                </div>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Services */}
      <Card className="p-6 bg-slate-800/50 backdrop-blur-sm border-slate-700">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Terminal className="w-5 h-5 text-blue-400" />
          Services ({host.services.length})
        </h3>
        
        <div className="space-y-3">
          {host.services.map((service) => {
            const serviceVulns = service.vulnerabilities.length;
            
            return (
              <Card 
                key={`${service.port}-${service.name}`}
                className="p-4 bg-slate-700/50 border-slate-600 hover:bg-slate-700/70 hover:border-blue-500/50 cursor-pointer transition-all duration-200 group"
                onClick={() => onServiceClick(host.ip, service.name, service.port)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <Terminal className="w-5 h-5 text-blue-400" />
                      <div>
                        <h4 className="text-white font-medium">{service.name}</h4>
                        <p className="text-slate-400 text-sm">
                          Port {service.port}/{service.protocol}
                        </p>
                      </div>
                    </div>
                    
                    {service.version && (
                      <div className="bg-slate-800 px-2 py-1 rounded text-xs text-slate-300">
                        {service.version}
                      </div>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <div className="text-center">
                      <p className="text-sm font-medium text-white">{service.scans.length}</p>
                      <p className="text-xs text-slate-400">Scans</p>
                    </div>
                    
                    {serviceVulns > 0 && (
                      <div className="text-center">
                        <p className="text-sm font-medium text-red-400">{serviceVulns}</p>
                        <p className="text-xs text-slate-400">Vulns</p>
                      </div>
                    )}
                    
                    <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-blue-400 transition-colors" />
                  </div>
                </div>
                
                {service.banner && (
                  <div className="mt-3 pt-3 border-t border-slate-600">
                    <p className="text-slate-400 text-xs mb-1">Banner:</p>
                    <p className="text-slate-300 text-sm font-mono bg-slate-800/50 p-2 rounded">
                      {service.banner.length > 100 ? service.banner.substring(0, 100) + '...' : service.banner}
                    </p>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
        
        {host.services.length === 0 && (
          <div className="text-center py-8 text-slate-400">
            <Terminal className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>Aucun service détecté</p>
          </div>
        )}
      </Card>

      {/* OS Information */}
      {host.osFingerprint && (
        <Card className="p-6 bg-slate-800/50 backdrop-blur-sm border-slate-700">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Server className="w-5 h-5 text-green-400" />
            Système d'exploitation
          </h3>
          
          <div className="bg-slate-700/30 rounded p-4">
            <p className="text-white font-medium">{host.osFingerprint.os}</p>
            <p className="text-slate-400 text-sm">Confiance: {host.osFingerprint.confidence}%</p>
            {host.osFingerprint.details && (
              <p className="text-slate-300 text-sm mt-2">{host.osFingerprint.details}</p>
            )}
          </div>
        </Card>
      )}

      {/* Notes */}
      {host.notes && (
        <Card className="p-6 bg-slate-800/50 backdrop-blur-sm border-slate-700">
          <h3 className="text-lg font-semibold text-white mb-4">Notes</h3>
          <pre className="text-slate-300 text-sm whitespace-pre-wrap bg-slate-700/30 p-4 rounded">
            {host.notes}
          </pre>
        </Card>
      )}
    </div>
  );
};

export default HostDetailView;
