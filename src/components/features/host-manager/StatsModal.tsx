import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Server, CheckCircle, AlertTriangle, Target, Shield, Target as ExploitationIcon, Copy, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Host } from '@/types';

interface StatsModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'total' | 'active' | 'compromised' | 'critical' | 'credentials' | 'exploitation';
  hosts: Host[];
  stats: {
    total: number;
    active: number;
    compromised: number;
    critical: number;
    credentials: number;
    vulnerabilities: number;
  };
}

export const StatsModal: React.FC<StatsModalProps> = ({
  isOpen,
  onClose,
  type,
  hosts,
  stats,
}) => {
  if (!isOpen) return null;

  const getModalContent = () => {
    switch (type) {
      case 'total':
        return {
          title: 'Tous les Hôtes',
          icon: Server,
          iconColor: 'text-blue-400',
          description: `${stats.total} hôtes au total`,
          hosts: hosts,
        };
      case 'active':
        return {
          title: 'Hôtes Actifs',
          icon: CheckCircle,
          iconColor: 'text-green-400',
          description: `${stats.active} hôtes actifs`,
          hosts: hosts.filter(h => h.status === 'active'),
        };
      case 'compromised':
        return {
          title: 'Hôtes Compromis',
          icon: AlertTriangle,
          iconColor: 'text-orange-400',
          description: `${stats.compromised} hôtes compromis`,
          hosts: hosts.filter(h => h.status === 'compromised'),
        };
      case 'critical':
        return {
          title: 'Hôtes Critiques',
          icon: Target,
          iconColor: 'text-red-400',
          description: `${stats.critical} hôtes critiques`,
          hosts: hosts.filter(h => h.priority === 'critical'),
        };
      case 'credentials':
        return {
          title: 'Credentials Collectés',
          icon: Shield,
          iconColor: 'text-purple-400',
          description: `${stats.credentials} credentials au total`,
          hosts: hosts.filter(h => 
            (h.usernames && h.usernames.length > 0) || 
            (h.passwords && h.passwords.length > 0) || 
            (h.hashes && h.hashes.length > 0)
          ),
        };
      case 'exploitation':
        return {
          title: 'Étapes d\'Exploitation',
          icon: ExploitationIcon,
          iconColor: 'text-orange-400',
          description: `${stats.vulnerabilities} étapes d'exploitation au total`,
          hosts: hosts.filter(h => h.exploitationSteps && h.exploitationSteps.length > 0),
        };
      default:
        return {
          title: 'Statistiques',
          icon: Server,
          iconColor: 'text-slate-400',
          description: 'Informations',
          hosts: [],
        };
    }
  };

  const content = getModalContent();
  const IconComponent = content.icon;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[9999] bg-slate-900/85 backdrop-blur-sm flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="w-[90vw] max-w-6xl h-[85vh] bg-slate-800 rounded-lg border border-slate-700 overflow-hidden flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-slate-700 bg-gradient-to-r from-slate-800 to-slate-700">
            <div className="flex items-center gap-3">
              <IconComponent className={`w-6 h-6 ${content.iconColor}`} />
              <div>
                <h2 className="text-xl font-semibold text-slate-100">{content.title}</h2>
                <p className="text-sm text-slate-400">{content.description}</p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={onClose}
              className="bg-slate-700 border-slate-600 text-slate-200 hover:bg-slate-600"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-auto p-6">
            {type === 'credentials' ? (
              <CredentialsView hosts={content.hosts} />
            ) : type === 'exploitation' ? (
              <ExploitationView hosts={content.hosts} />
            ) : (
              <HostsListView hosts={content.hosts} type={type} />
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

// Composant pour afficher la liste des hôtes
const HostsListView: React.FC<{ hosts: Host[]; type: string }> = ({ hosts, type }) => {
  if (hosts.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-400">Aucun hôte trouvé pour cette catégorie.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {hosts.map((host) => (
          <Card key={host.id} className="border-slate-700 bg-slate-800 hover:bg-slate-700/50 transition-colors">
            <CardContent className="p-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="font-mono text-lg font-semibold text-slate-100">{host.ip}</h3>
                  <span className={`px-2 py-1 text-xs rounded ${
                    host.status === 'active' ? 'bg-green-900/50 text-green-400 border border-green-700' :
                    host.status === 'compromised' ? 'bg-orange-900/50 text-orange-400 border border-orange-700' :
                    'bg-slate-700 text-slate-400 border border-slate-600'
                  }`}>
                    {host.status}
                  </span>
                </div>
                <p className="text-sm text-slate-400">{host.hostname || 'Sans nom'}</p>
                <p className="text-xs text-slate-500">{host.os || 'Unknown OS'}</p>
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <span>{host.vulnerabilities?.length || 0} vulns</span>
                  <span>{host.exploitationSteps?.length || 0} steps</span>
                  <span>{host.screenshots?.length || 0} screens</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

// Composant pour afficher les credentials
const CredentialsView: React.FC<{ hosts: Host[] }> = ({ hosts }) => {
  const [showSprayingData, setShowSprayingData] = useState(false);
  const [sprayingData, setSprayingData] = useState('');
  const [sprayingType, setSprayingType] = useState<'usernames' | 'passwords' | 'hashes' | 'pairs'>('pairs');

  const allCredentials = hosts.reduce((acc, host) => {
    const hostCredentials = {
      host: host,
      usernames: host.usernames || [],
      passwords: host.passwords || [],
      hashes: host.hashes || [],
    };
    return [...acc, hostCredentials];
  }, [] as any[]);

  const totalUsernames = allCredentials.reduce((sum, h) => sum + h.usernames.length, 0);
  const totalPasswords = allCredentials.reduce((sum, h) => sum + h.passwords.length, 0);
  const totalHashes = allCredentials.reduce((sum, h) => sum + h.hashes.length, 0);

  // Fonction pour générer les données de spraying
  const generateSprayingData = (type: 'usernames' | 'passwords' | 'hashes' | 'pairs') => {
    const sprayingLines: string[] = [];
    
    allCredentials.forEach(hostCreds => {
      const { usernames, passwords, hashes } = hostCreds;
      
      switch (type) {
        case 'usernames':
          usernames.forEach((username: string) => {
            sprayingLines.push(username);
          });
          break;
          
        case 'passwords':
          passwords.forEach((password: string) => {
            sprayingLines.push(password);
          });
          break;
          
        case 'hashes':
          hashes.forEach((hash: string) => {
            sprayingLines.push(hash);
          });
          break;
          
        case 'pairs':
          // Paires username:password
          usernames.forEach((username: string) => {
            passwords.forEach((password: string) => {
              sprayingLines.push(`${username}:${password}`);
            });
          });
          break;
      }
    });

    // Supprimer les doublons
    const uniqueLines = [...new Set(sprayingLines)];
    
    return uniqueLines.join('\n');
  };

  const handleSprayingClick = () => {
    const data = generateSprayingData(sprayingType);
    setSprayingData(data);
    setShowSprayingData(true);
  };

  const copySprayingData = async () => {
    try {
      await navigator.clipboard.writeText(sprayingData);
      // Optionnel: afficher une notification de succès
    } catch (err) {
      console.error('Erreur lors de la copie:', err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Résumé */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="border-slate-700 bg-slate-800">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-400">{totalUsernames}</div>
            <div className="text-sm text-slate-400">Usernames</div>
          </CardContent>
        </Card>
        <Card className="border-slate-700 bg-slate-800">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-yellow-400">{totalPasswords}</div>
            <div className="text-sm text-slate-400">Passwords</div>
          </CardContent>
        </Card>
        <Card className="border-slate-700 bg-slate-800">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-orange-400">{totalHashes}</div>
            <div className="text-sm text-slate-400">Hashes</div>
          </CardContent>
        </Card>
      </div>

      {/* Options de spraying */}
      <Card className="border-slate-700 bg-slate-800">
        <CardHeader>
          <CardTitle className="text-slate-100">Options de Spraying</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Sélection du type */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              <Button
                onClick={() => setSprayingType('usernames')}
                variant={sprayingType === 'usernames' ? 'default' : 'outline'}
                className={`${
                  sprayingType === 'usernames' 
                    ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                    : 'bg-slate-700 border-slate-600 text-slate-200 hover:bg-slate-600'
                }`}
              >
                Usernames ({totalUsernames})
              </Button>
              <Button
                onClick={() => setSprayingType('passwords')}
                variant={sprayingType === 'passwords' ? 'default' : 'outline'}
                className={`${
                  sprayingType === 'passwords' 
                    ? 'bg-yellow-600 hover:bg-yellow-700 text-white' 
                    : 'bg-slate-700 border-slate-600 text-slate-200 hover:bg-slate-600'
                }`}
              >
                Passwords ({totalPasswords})
              </Button>
              <Button
                onClick={() => setSprayingType('hashes')}
                variant={sprayingType === 'hashes' ? 'default' : 'outline'}
                className={`${
                  sprayingType === 'hashes' 
                    ? 'bg-orange-600 hover:bg-orange-700 text-white' 
                    : 'bg-slate-700 border-slate-600 text-slate-200 hover:bg-slate-600'
                }`}
              >
                Hashes ({totalHashes})
              </Button>
              <Button
                onClick={() => setSprayingType('pairs')}
                variant={sprayingType === 'pairs' ? 'default' : 'outline'}
                className={`${
                  sprayingType === 'pairs' 
                    ? 'bg-purple-600 hover:bg-purple-700 text-white' 
                    : 'bg-slate-700 border-slate-600 text-slate-200 hover:bg-slate-600'
                }`}
              >
                Paires (user:pass)
              </Button>
            </div>
            
            {/* Bouton de génération */}
            <div className="flex justify-center">
              <Button
                onClick={handleSprayingClick}
                className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded-lg flex items-center gap-2"
              >
                <Zap className="w-4 h-4" />
                Générer données de Spraying
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Affichage des données de spraying */}
      {showSprayingData && (
        <Card className="border-slate-700 bg-slate-800">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-slate-100">
                Données de Spraying - {
                  sprayingType === 'usernames' ? 'Usernames' :
                  sprayingType === 'passwords' ? 'Passwords' :
                  sprayingType === 'hashes' ? 'Hashes' :
                  'Paires username:password'
                }
              </CardTitle>
              <div className="flex gap-2">
                <Button
                  onClick={copySprayingData}
                  variant="outline"
                  size="sm"
                  className="bg-slate-700 border-slate-600 text-slate-200 hover:bg-slate-600"
                >
                  <Copy className="w-4 h-4 mr-2" />
                  Copier
                </Button>
                <Button
                  onClick={() => setShowSprayingData(false)}
                  variant="outline"
                  size="sm"
                  className="bg-slate-700 border-slate-600 text-slate-200 hover:bg-slate-600"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="bg-slate-900 p-4 rounded-lg border border-slate-600">
              <pre className="text-sm text-slate-200 font-mono whitespace-pre-wrap overflow-x-auto">
                {sprayingData || 'Aucune donnée de spraying disponible'}
              </pre>
            </div>
            <div className="mt-2 text-xs text-slate-400">
              {sprayingData.split('\n').length} credentials au total
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tableau détaillé */}
      <Card className="border-slate-700 bg-slate-800">
        <CardHeader>
          <CardTitle className="text-slate-100">Détail des Credentials par Hôte</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-slate-300 bg-slate-700">
                  <th className="text-left px-3 py-2">Hôte</th>
                  <th className="text-left px-3 py-2">Usernames</th>
                  <th className="text-left px-3 py-2">Passwords</th>
                  <th className="text-left px-3 py-2">Hashes</th>
                </tr>
              </thead>
              <tbody>
                {allCredentials.map((hostCreds, index) => (
                  <tr key={index} className="border-t border-slate-700">
                    <td className="px-3 py-2">
                      <div className="font-mono text-slate-100">{hostCreds.host.ip}</div>
                      <div className="text-xs text-slate-400">{hostCreds.host.hostname || 'Sans nom'}</div>
                    </td>
                    <td className="px-3 py-2">
                      {hostCreds.usernames.length > 0 ? (
                        <div className="space-y-1">
                          {hostCreds.usernames.map((username: string, i: number) => (
                            <div key={i} className="text-green-400 font-mono text-xs">{username}</div>
                          ))}
                        </div>
                      ) : (
                        <span className="text-slate-500">-</span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      {hostCreds.passwords.length > 0 ? (
                        <div className="space-y-1">
                          {hostCreds.passwords.map((password: string, i: number) => (
                            <div key={i} className="text-yellow-400 font-mono text-xs">{'•'.repeat(Math.min(password.length, 8))}</div>
                          ))}
                        </div>
                      ) : (
                        <span className="text-slate-500">-</span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      {hostCreds.hashes.length > 0 ? (
                        <div className="space-y-1">
                          {hostCreds.hashes.map((hash: string, i: number) => (
                            <div key={i} className="text-orange-400 font-mono text-xs truncate max-w-32" title={hash}>{hash}</div>
                          ))}
                        </div>
                      ) : (
                        <span className="text-slate-500">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// Composant pour afficher les étapes d'exploitation
const ExploitationView: React.FC<{ hosts: Host[] }> = ({ hosts }) => {
  const allExploitationSteps = hosts.reduce((acc, host) => {
    if (host.exploitationSteps && host.exploitationSteps.length > 0) {
      const hostSteps = host.exploitationSteps.map(step => ({
        ...step,
        host: host,
      }));
      return [...acc, ...hostSteps];
    }
    return acc;
  }, [] as any[]);

  if (allExploitationSteps.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-400">Aucune étape d'exploitation trouvée.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="border-slate-700 bg-slate-800">
        <CardHeader>
          <CardTitle className="text-slate-100">Étapes d'Exploitation ({allExploitationSteps.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {allExploitationSteps.map((step, index) => (
              <div key={step.id || index} className="p-4 bg-slate-700/50 rounded border border-slate-600">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="font-medium text-slate-100 text-sm">{step.title}</h4>
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
                    <p className="text-xs text-slate-300 mb-2">{step.description}</p>
                    <div className="text-xs text-slate-400">
                      <span className="font-mono text-blue-400">{step.host.ip}</span>
                      {step.host.hostname && <span className="ml-2">({step.host.hostname})</span>}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
