import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  Copy, 
  Download, 
  Target, 
  Search,
  AlertTriangle,
  Shield,
  CheckCircle,
  Filter
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useHostStore } from '@/stores/hostStore';

interface GlobalVulnerabilitiesViewProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GlobalVulnerabilitiesView: React.FC<GlobalVulnerabilitiesViewProps> = ({
  isOpen,
  onClose,
}) => {
  const { hosts } = useHostStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterSeverity, setFilterSeverity] = useState<string>('all');

  // Agrégation de tous les hosts avec leurs vulnérabilités
  const hostData = React.useMemo(() => {
    const hostArray = Object.values(hosts);
    return hostArray.map(host => ({
      ...host,
      totalVulns: host.vulnerabilities?.length || 0,
      criticalVulns: host.vulnerabilities?.filter(v => v.severity === 'Critical').length || 0,
      highVulns: host.vulnerabilities?.filter(v => v.severity === 'High').length || 0,
      exploitationStepsCount: host.exploitationSteps?.length || 0,
    }));
  }, [hosts]);

  // Filtrage
  const filteredHosts = hostData.filter(host => {
    const matchesSearch = host.ip.includes(searchTerm) ||
      (host.hostname && host.hostname.toLowerCase().includes(searchTerm.toLowerCase())) ||
      host.vulnerabilities?.some(v => 
        v.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        v.description?.toLowerCase().includes(searchTerm.toLowerCase())
      );

    const matchesStatus = filterStatus === 'all' ||
      (filterStatus === 'compromised' && host.status === 'compromised') ||
      (filterStatus === 'critical' && host.criticalVulns > 0) ||
      (filterStatus === 'exploitable' && host.exploitationStepsCount > 0);

    const matchesSeverity = filterSeverity === 'all' ||
      host.vulnerabilities?.some(v => v.severity === filterSeverity);

    return matchesSearch && matchesStatus && matchesSeverity;
  });

  // Statistiques
  const stats = {
    totalHosts: hostData.length,
    compromisedHosts: hostData.filter(h => h.status === 'compromised').length,
    criticalHosts: hostData.filter(h => h.criticalVulns > 0).length,
    exploitableHosts: hostData.filter(h => h.exploitationStepsCount > 0).length,
  };

  const copyHostList = (hosts: typeof hostData) => {
    const list = hosts.map(h => h.ip).join('\n');
    navigator.clipboard.writeText(list);
  };

  const exportVulnerabilities = () => {
    const data = filteredHosts.map(host => ({
      ip: host.ip,
      hostname: host.hostname,
      status: host.status,
      priority: host.priority,
      vulnerabilities: host.vulnerabilities || [],
      exploitationSteps: host.exploitationSteps || [],
    }));

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'vulnerabilities-report.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4"
        onClick={(e) => e.target === e.currentTarget && onClose()}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="w-full max-w-7xl max-h-[90vh] bg-slate-800 rounded-lg border border-slate-700 overflow-hidden flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-slate-700 bg-gradient-to-r from-slate-800 to-slate-700">
            <div className="flex items-center gap-3">
              <Target className="w-6 h-6 text-red-400" />
              <div>
                <h2 className="text-xl font-semibold text-slate-100">
                  Analyse des Vulnérabilités ({filteredHosts.length} hosts)
                </h2>
                <p className="text-sm text-slate-400">
                  Vue globale des compromis et vulnérabilités critiques
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={exportVulnerabilities}
                className="bg-slate-700 border-slate-600 text-slate-200 hover:bg-slate-600"
              >
                <Download className="w-4 h-4 mr-2" />
                Exporter
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

          {/* Stats */}
          <div className="p-4 border-b border-slate-700 bg-slate-800/50">
            <div className="grid grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-400">{stats.totalHosts}</div>
                <div className="text-sm text-slate-400">Total Hosts</div>
              </div>
              <div 
                className="text-center cursor-pointer hover:bg-slate-700/50 p-2 rounded"
                onClick={() => {
                  setFilterStatus('compromised');
                  copyHostList(hostData.filter(h => h.status === 'compromised'));
                }}
              >
                <div className="text-2xl font-bold text-red-400">{stats.compromisedHosts}</div>
                <div className="text-sm text-slate-400">Compromis</div>
              </div>
              <div 
                className="text-center cursor-pointer hover:bg-slate-700/50 p-2 rounded"
                onClick={() => {
                  setFilterStatus('critical');
                  copyHostList(hostData.filter(h => h.criticalVulns > 0));
                }}
              >
                <div className="text-2xl font-bold text-orange-400">{stats.criticalHosts}</div>
                <div className="text-sm text-slate-400">Critiques</div>
              </div>
              <div 
                className="text-center cursor-pointer hover:bg-slate-700/50 p-2 rounded"
                onClick={() => {
                  setFilterStatus('exploitable');
                  copyHostList(hostData.filter(h => h.exploitationStepsCount > 0));
                }}
              >
                <div className="text-2xl font-bold text-green-400">{stats.exploitableHosts}</div>
                <div className="text-sm text-slate-400">Exploitables</div>
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="p-4 border-b border-slate-700 bg-slate-800/30">
            <div className="flex gap-4 items-center">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                <Input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-slate-700 border-slate-600 text-slate-100"
                  placeholder="Rechercher par IP, hostname ou vulnérabilité..."
                />
              </div>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-48 bg-slate-700 border-slate-600 text-slate-100">
                  <SelectValue placeholder="Statut" />
                </SelectTrigger>
                <SelectContent className="bg-slate-700 border-slate-600">
                  <SelectItem value="all">Tous les statuts</SelectItem>
                  <SelectItem value="compromised">Compromis</SelectItem>
                  <SelectItem value="critical">Critiques</SelectItem>
                  <SelectItem value="exploitable">Exploitables</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterSeverity} onValueChange={setFilterSeverity}>
                <SelectTrigger className="w-48 bg-slate-700 border-slate-600 text-slate-100">
                  <SelectValue placeholder="Sévérité" />
                </SelectTrigger>
                <SelectContent className="bg-slate-700 border-slate-600">
                  <SelectItem value="all">Toutes sévérités</SelectItem>
                  <SelectItem value="Critical">Critique</SelectItem>
                  <SelectItem value="High">Élevée</SelectItem>
                  <SelectItem value="Medium">Moyenne</SelectItem>
                  <SelectItem value="Low">Faible</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-auto p-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredHosts.map((host) => (
                <Card key={host.id} className="border-slate-700 bg-slate-800 hover:bg-slate-700/50 transition-colors">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-lg text-slate-100">{host.ip}</CardTitle>
                        {host.hostname && (
                          <p className="text-sm text-slate-400">{host.hostname}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`w-3 h-3 rounded-full ${
                          host.status === 'compromised' ? 'bg-red-500' :
                          host.criticalVulns > 0 ? 'bg-orange-500' :
                          host.exploitationStepsCount > 0 ? 'bg-yellow-500' :
                          'bg-green-500'
                        }`} />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => copyToClipboard(host.ip)}
                          className="bg-slate-600 border-slate-500 text-slate-200 hover:bg-slate-500 p-1"
                        >
                          📋
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div>
                        <div className="text-lg font-bold text-red-400">{host.criticalVulns}</div>
                        <div className="text-xs text-slate-400">Critiques</div>
                      </div>
                      <div>
                        <div className="text-lg font-bold text-orange-400">{host.highVulns}</div>
                        <div className="text-xs text-slate-400">Élevées</div>
                      </div>
                      <div>
                        <div className="text-lg font-bold text-green-400">{host.exploitationStepsCount}</div>
                        <div className="text-xs text-slate-400">Exploits</div>
                      </div>
                    </div>

                    {host.vulnerabilities && host.vulnerabilities.length > 0 && (
                      <div className="space-y-1">
                        <div className="text-xs font-medium text-slate-400">Top Vulnérabilités:</div>
                        {host.vulnerabilities.slice(0, 3).map((vuln, index) => (
                          <div key={index} className="flex items-center gap-2 text-xs">
                            <span className={`w-2 h-2 rounded-full ${
                              vuln.severity === 'Critical' ? 'bg-red-500' :
                              vuln.severity === 'High' ? 'bg-orange-500' :
                              vuln.severity === 'Medium' ? 'bg-yellow-500' :
                              'bg-green-500'
                            }`} />
                            <span className="text-slate-300 truncate">{vuln.title || vuln.description}</span>
                          </div>
                        ))}
                        {host.vulnerabilities.length > 3 && (
                          <div className="text-xs text-slate-500">
                            +{host.vulnerabilities.length - 3} autres...
                          </div>
                        )}
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-2 border-t border-slate-700">
                      <span className={`text-xs px-2 py-1 rounded ${
                        host.priority === 'critical' ? 'bg-red-900/50 text-red-400' :
                        host.priority === 'high' ? 'bg-orange-900/50 text-orange-400' :
                        host.priority === 'medium' ? 'bg-yellow-900/50 text-yellow-400' :
                        'bg-green-900/50 text-green-400'
                      }`}>
                        {host.priority === 'critical' ? '🔴 Critique' :
                         host.priority === 'high' ? '🟠 Élevée' :
                         host.priority === 'medium' ? '🟡 Moyenne' :
                         '🟢 Faible'}
                      </span>
                      <span className={`text-xs px-2 py-1 rounded ${
                        host.status === 'compromised' ? 'bg-red-900/50 text-red-400' :
                        host.status === 'active' ? 'bg-green-900/50 text-green-400' :
                        'bg-slate-600 text-slate-400'
                      }`}>
                        {host.status === 'compromised' ? '💀 Compromis' :
                         host.status === 'active' ? '✅ Actif' :
                         '⚪ Inactif'}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {filteredHosts.length === 0 && (
              <div className="text-center py-12">
                <Target className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                <p className="text-slate-500">Aucun host trouvé avec ces critères</p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between p-6 border-t border-slate-700 bg-slate-800/80">
            <div className="text-sm text-slate-400">
              💡 Tip: Cliquez sur les statistiques pour filtrer et copier les IPs correspondantes
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text);
  }
};
