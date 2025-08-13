import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Network } from 'vis-network';
import { DataSet } from 'vis-data';
import { 
  Server, 
  Globe, 
  Shield, 
  Router,
  Database,
  Monitor,
  Smartphone,
  Wifi,
  Target,
  Activity,
  Eye,
  Settings,
  RefreshCw,
  Layers
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Host, Category } from '@/types';
import { useHostStore } from '@/stores/hostStore';

interface NetworkVisualizationProps {
  hosts: Host[];
  categories: Category[];
  onNodeSelect?: (host: Host) => void;
  selectedHost?: Host | null;
}

interface DeviceType {
  type: 'server' | 'router' | 'firewall' | 'workstation' | 'mobile' | 'database' | 'unknown';
  icon: React.ComponentType<any>;
  color: string;
  shape: string;
  size: number;
}

const NetworkVisualization: React.FC<NetworkVisualizationProps> = ({
  hosts,
  categories,
  onNodeSelect,
  selectedHost,
}) => {
  const networkRef = useRef<HTMLDivElement>(null);
  const networkInstance = useRef<Network | null>(null);
  const { networkNodes, updateNetworkNode } = useHostStore();
  // Accéder au store pour mettre à jour les connexions lors des suppressions
  const { hosts: hostsMap, updateHost } = useHostStore();
  const [showLegend, setShowLegend] = useState(true);
  const [showLabels, setShowLabels] = useState(true);
  const [connectionCount, setConnectionCount] = useState(0);
  // Supprimé: savedEdges local non persistant

  // Déterminer le type d'appareil basé sur l'OS et les services
  const getDeviceType = (host: Host): DeviceType => {
    const os = host.os?.toLowerCase() || '';
    const hostname = host.hostname?.toLowerCase() || '';
    
    if (os.includes('router') || hostname.includes('router') || hostname.includes('rt-')) {
      return { type: 'router', icon: Router, color: 'rgba(167,139,250,0.85)', shape: 'diamond', size: 35 };
    }
    if (os.includes('firewall') || hostname.includes('fw') || hostname.includes('pfsense')) {
      return { type: 'firewall', icon: Shield, color: 'rgba(251,191,36,0.85)', shape: 'triangle', size: 35 };
    }
    if (os.includes('mobile') || os.includes('android') || os.includes('ios')) {
      return { type: 'mobile', icon: Smartphone, color: 'rgba(52,211,153,0.85)', shape: 'circle', size: 25 };
    }
    if (os.includes('database') || hostname.includes('db') || hostname.includes('sql')) {
      return { type: 'database', icon: Database, color: 'rgba(96,165,250,0.85)', shape: 'box', size: 30 };
    }
    if (os.includes('windows') && (hostname.includes('ws') || hostname.includes('pc-'))) {
      return { type: 'workstation', icon: Monitor, color: 'rgba(34,211,238,0.85)', shape: 'circle', size: 30 };
    }
    if (os.includes('server') || hostname.includes('srv') || hostname.includes('dc-')) {
      return { type: 'server', icon: Server, color: 'rgba(147,197,253,0.85)', shape: 'box', size: 35 };
    }
    if (os.includes('linux') || os.includes('ubuntu') || os.includes('centos')) {
      return { type: 'server', icon: Server, color: 'rgba(110,231,183,0.85)', shape: 'circle', size: 30 };
    }
    
    return { type: 'unknown', icon: Globe, color: 'rgba(148,163,184,0.85)', shape: 'dot', size: 25 };
  };

  // Obtenir la couleur basée sur la catégorie et le statut
  const getNodeColor = (host: Host, deviceType: DeviceType) => {
    const category = categories.find(c => c.id === host.category);
    
    // Couleurs de priorité par catégorie
    const categoryColors: { [key: string]: string } = {
      'critical': 'rgba(239,68,68,0.85)',
      'high': 'rgba(245,158,11,0.85)', 
      'medium': 'rgba(234,179,8,0.85)',
      'low': 'rgba(34,197,94,0.85)',
      'info': 'rgba(59,130,246,0.85)',
      'compromised': 'rgba(220,38,38,0.85)',
      'target': 'rgba(124,45,18,0.85)'
    };
    
    if (category && categoryColors[category.name.toLowerCase()]) {
      return categoryColors[category.name.toLowerCase()];
    }
    
    // Couleur par défaut du type d'appareil
    return deviceType.color;
  };

  // Obtenir le statut de sécurité
  const getSecurityStatus = (host: Host) => {
    const vulnCount = host.vulnerabilities?.length || 0;
    const hasCredentials = (host.usernames?.length || 0) + (host.passwords?.length || 0) > 0;
    
    if (vulnCount > 5 || hasCredentials) return 'high-risk';
    if (vulnCount > 2) return 'medium-risk';
    if (vulnCount > 0) return 'low-risk';
    return 'secure';
  };

  const hostIdsSignature = useMemo(() => hosts.map(h => String(h.id)).sort().join(','), [hosts]);
  const categoriesSignature = useMemo(() => categories.map(c => `${c.id}:${c.name}:${c.color || ''}`).sort().join(','), [categories]);

  useEffect(() => {
    if (!networkRef.current) return;

    // Préparer les nœuds avec couleurs et icônes
    const nodes = new DataSet(
      hosts.map((host, index) => {
        const savedNode = networkNodes[host.id];
        const deviceType = getDeviceType(host);
        const nodeColor = getNodeColor(host, deviceType);
        const securityStatus = getSecurityStatus(host);
        
        // Bordure colorée selon le statut de sécurité
        const borderColors = {
          'high-risk': '#dc2626',
          'medium-risk': '#ea580c',
          'low-risk': '#d97706',
          'secure': '#059669'
        };
        
        const borderColor = borderColors[securityStatus];
        const borderWidth = securityStatus === 'high-risk' ? 4 : 
                          securityStatus === 'medium-risk' ? 3 : 2;
        
        return {
          id: host.id,
          label: showLabels ? `${host.hostname || host.ip}\n${host.ip}` : '',
          title: `
            <div style="font-family: monospace; padding: 8px;">
              <strong>${host.hostname || 'Sans nom'}</strong><br/>
              IP: ${host.ip}<br/>
              OS: ${host.os || 'Inconnu'}<br/>
              Type: ${deviceType.type}<br/>
              Sécurité: ${securityStatus}<br/>
              Vulnérabilités: ${host.vulnerabilities?.length || 0}<br/>
              Credentials: ${(host.usernames?.length || 0) + (host.passwords?.length || 0)}
            </div>
          `,
          shape: deviceType.shape,
          size: deviceType.size,
          shapeProperties: {
            borderRadius: 12,
          },
          color: {
            background: nodeColor,
            border: borderColor,
            highlight: {
              background: nodeColor,
              border: '#ffffff'
            },
            hover: {
              background: nodeColor,
              border: '#ffffff'
            }
          },
          borderWidth: borderWidth,
          font: {
            color: '#ffffff',
            size: 12,
            face: 'Inter, sans-serif',
            strokeWidth: 1,
            strokeColor: '#000000'
          },
          shadow: {
            enabled: true,
            color: 'rgba(0,0,0,0.3)',
            size: 8,
            x: 2,
            y: 2
          },
          widthConstraint: { minimum: 80, maximum: 220 },
          margin: { top: 8, right: 10, bottom: 8, left: 10 },
          x: savedNode?.x || (index % 6) * 200 + 100,
          y: savedNode?.y || Math.floor(index / 6) * 150 + 100,
          physics: savedNode ? false : true
        };
      })
    );

    // Construire les arêtes à partir des connexions persistées
    const edgeList: any[] = [];
    hosts.forEach((host) => {
      (host.outgoingConnections || []).forEach((conn: any, idx: number) => {
        if (!conn || !conn.toHostId) return;
        edgeList.push({
          id: `${host.id}-${conn.toHostId}-${idx}`,
          from: host.id,
          to: conn.toHostId,
          label: conn.cause || '',
          color: 'rgba(59,130,246,0.75)',
          width: 3,
          arrows: 'to',
          smooth: { enabled: true, type: 'cubicBezier', roundness: 0.45 },
        });
      });
    });
    const edges = new DataSet(edgeList);

    // Configuration du réseau
    const options = {
      nodes: {
        font: { size: 12, face: 'Inter, sans-serif', strokeWidth: 1, strokeColor: '#000000' },
        shadow: { enabled: true, color: 'rgba(0,0,0,0.2)', size: 10, x: 3, y: 3 },
        borderWidth: 2,
        borderWidthSelected: 4,
        scaling: { min: 20, max: 60, label: { enabled: true, min: 10, max: 16 }},
        shapeProperties: { borderRadius: 12 },
        chosen: {
          node(values: any) {
            values.borderWidth = 4;
            values.shadow = true;
          }
        }
      },
      edges: {
        width: 3,
        color: { color: 'rgba(59,130,246,0.7)', highlight: 'rgba(29,78,216,0.95)', hover: 'rgba(96,165,250,0.95)' },
        arrows: { to: { enabled: true, scaleFactor: 1.2, type: 'arrow' } },
        smooth: { enabled: true, type: 'dynamic', roundness: 0.6 },
        shadow: { enabled: true, color: 'rgba(59, 130, 246, 0.3)', size: 5, x: 2, y: 2 },
        selectionWidth: 5,
        hoverWidth: 5,
        physics: false,
        chosen: { edge(values: any) { values.color = 'rgba(29,78,216,0.95)'; values.width = 4; values.shadow = true; }},
        font: { color: '#93c5fd', size: 10, face: 'Inter, sans-serif', strokeWidth: 2, strokeColor: '#0f172a', background: 'rgba(2,6,23,0.8)' },
      },
      physics: {
        enabled: true,
        stabilization: { enabled: true, iterations: 250, updateInterval: 25, fit: false },
        solver: 'forceAtlas2Based',
        forceAtlas2Based: {
          gravitationalConstant: -40,
          centralGravity: 0.02,
          springLength: 180,
          springConstant: 0.015,
          damping: 0.4,
          avoidOverlap: 1
        }
      },
      interaction: {
        dragNodes: true,
        dragView: true,
        zoomView: true,
        zoomSpeed: 0.5,
        selectConnectedEdges: true,
        hover: true,
        hoverConnectedEdges: true,
        tooltipDelay: 200,
        navigationButtons: true,
        keyboard: { enabled: true, speed: { x: 10, y: 10, zoom: 0.02 }, bindToWindow: false },
      },
      layout: { improvedLayout: false, randomSeed: undefined },
      autoResize: true,
      configure: { enabled: false },
    } as any;

    // Créer le réseau
    networkInstance.current = new Network(networkRef.current, { nodes, edges }, options);
    // Laisser la physique se stabiliser (pas de fit, pas de move)
    try { (networkInstance.current as any).stabilize?.(); } catch {}

    // Gestionnaires d'événements
    networkInstance.current.on('click', (params) => {
      if (params.nodes.length > 0) {
        const nodeId = params.nodes[0];
        const host = hosts.find(h => h.id === nodeId);
        if (host && onNodeSelect) onNodeSelect(host);
      } else if (params.edges.length > 0) {
        const edgeId = params.edges[0];
        const edge = edges.get(edgeId) as any;
        if (edge && confirm(`Supprimer la connexion ${edge.from} → ${edge.to} ?`)) {
          // Mettre à jour le store pour retirer la connexion persistée
          const source = hostsMap[edge.from];
          if (source) {
            const updatedOutgoing = (source.outgoingConnections || []).filter((c: any) => c.toHostId !== edge.to);
            updateHost(edge.from, { outgoingConnections: updatedOutgoing });
          }
        }
      }
    });

    // Sauvegarder les positions
    const persistPositions = (ids?: (string|number)[]) => {
      if (!networkInstance.current) return;
      const nodeIds = ids && ids.length ? ids : hosts.map(h => h.id);
      const positions = networkInstance.current.getPositions(nodeIds as any);
      Object.entries(positions).forEach(([nodeId, position]) => {
        updateNetworkNode(nodeId, { x: (position as any).x, y: (position as any).y });
      });
    };
    networkInstance.current.on('dragEnd', (params) => {
      // Ne rien faire si l'utilisateur a juste déplacé la vue (aucun nœud sélectionné)
      if (!params || !params.nodes || params.nodes.length === 0) return;
      persistPositions(params.nodes);
      // Ne pas recentrer ni animer après un drag — ne rien faire ici
    });

    // Exposer des helpers globaux (compat) — s'appuient sur le store
    (window as any).addNetworkConnection = (_sourceId: string, _targetId: string, _label?: string) => {
      try { networkInstance.current?.redraw(); } catch {}
    };

    (window as any).removeNetworkConnection = (sourceId: string, targetId: string) => {
      const source = hostsMap[sourceId];
      if (source) {
        const updatedOutgoing = (source.outgoingConnections || []).filter((c: any) => c.toHostId !== targetId);
        updateHost(sourceId, { outgoingConnections: updatedOutgoing });
      }
    };

    (window as any).removeAllNetworkConnections = () => {
      // Supprimer toutes les connexions de tous les hôtes
      Object.values(hostsMap).forEach((h: any) => {
        if ((h.outgoingConnections || []).length > 0) updateHost(h.id, { outgoingConnections: [] });
      });
    };

    (window as any).getNetworkConnections = () => {
      return edgeList;
    };

    networkInstance.current.on('stabilizationIterationsDone', () => {
      setConnectionCount(edgeList.length);
      try {
        // Sauver positions et désactiver la physique pour garder une carte stable
        persistPositions();
        (networkInstance.current as any).setOptions({ physics: { enabled: false } });
      } catch {}
    });

    return () => {
      if (networkInstance.current) {
        networkInstance.current.destroy();
        networkInstance.current = null;
      }
      delete (window as any).addNetworkConnection;
      delete (window as any).removeNetworkConnection;
      delete (window as any).removeAllNetworkConnections;
      delete (window as any).getNetworkConnections;
    };
  }, [hostIdsSignature, categoriesSignature, onNodeSelect, showLabels]);

  // Initialiser le compteur de connexions
  useEffect(() => {
    const count = hosts.reduce((acc, h) => acc + ((h.outgoingConnections || []).length), 0);
    setConnectionCount(count);
  }, [hosts]);

  // Mettre en surbrillance le nœud sélectionné
  useEffect(() => {
    if (networkInstance.current && selectedHost) {
      try {
        // S'assurer que le nœud existe avant de sélectionner
        const allIds = hosts.map(h => h.id);
        if (allIds.includes(selectedHost.id)) {
          (networkInstance.current as any).unselectAll?.();
          networkInstance.current.selectNodes([selectedHost.id]);
        }
      } catch (e) {
        // ignorer en cas de réinitialisation du graph
      }
    }
  }, [selectedHost, hosts]);

  const fitToScreen = () => {
    if (networkInstance.current) {
      networkInstance.current.fit({
        animation: {
          duration: 1000,
          easingFunction: 'easeInOutQuad'
        }
      });
    }
  };

  const autoSpace = () => {
    if (!networkInstance.current) return;
    try {
      (networkInstance.current as any).setOptions({
        physics: {
          enabled: true,
          stabilization: { enabled: true, iterations: 300, updateInterval: 25, fit: false },
          solver: 'forceAtlas2Based',
          forceAtlas2Based: {
            gravitationalConstant: -40,
            centralGravity: 0.02,
            springLength: 180,
            springConstant: 0.015,
            damping: 0.4,
            avoidOverlap: 1
          }
        }
      });
      (networkInstance.current as any).stabilize?.();
    } catch {}
  };

  const resetLayout = () => {
    if (networkInstance.current) {
      // Réinitialiser les positions
      hosts.forEach((host, index) => {
        updateNetworkNode(host.id, { 
          x: (index % 6) * 200 + 100, 
          y: Math.floor(index / 6) * 150 + 100 
        });
      });
      window.location.reload(); // Recharger pour appliquer les nouvelles positions
    }
  };

  return (
    <div className="relative w-full h-full bg-slate-900">
      {/* Panneau de contrôles */}
      <div className="absolute top-4 left-4 z-10 space-y-2">
        <div className="bg-slate-800/95 backdrop-blur-md rounded-lg p-3 border border-slate-700 shadow-lg">
          <h3 className="text-sm font-medium text-slate-200 mb-3 flex items-center gap-2">
            <Activity className="w-4 h-4 text-blue-400" />
            Contrôles Réseau
          </h3>
          <div className="space-y-2">
            <div className="flex gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={fitToScreen}
                className="flex-1 bg-slate-700 border-slate-600 text-slate-200 hover:bg-slate-600"
              >
                <Target className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowLabels(!showLabels)}
                className="flex-1 bg-slate-700 border-slate-600 text-slate-200 hover:bg-slate-600"
              >
                <Eye className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={autoSpace}
                className="flex-1 bg-slate-700 border-slate-600 text-slate-200 hover:bg-slate-600"
                title="Auto‑espace les nœuds"
              >
                <Activity className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={resetLayout}
                className="flex-1 bg-slate-700 border-slate-600 text-slate-200 hover:bg-slate-600"
              >
                <RefreshCw className="w-4 h-4" />
              </Button>
            </div>
          </div>
          {connectionCount > 0 && (
            <div className="mt-2 text-xs text-blue-400 flex items-center gap-1">
              <Wifi className="w-3 h-3" />
              {connectionCount} connexion{connectionCount > 1 ? 's' : ''}
            </div>
          )}
        </div>
      </div>

      {/* Légende */}
      {showLegend && (
        <div className="absolute top-4 right-4 z-10">
          <div className="bg-slate-800/95 backdrop-blur-md rounded-lg p-4 border border-slate-700 shadow-lg max-w-xs">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-slate-200 flex items-center gap-2">
                <Layers className="w-4 h-4 text-green-400" />
                Légende
              </h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowLegend(false)}
                className="h-6 w-6 p-0 text-slate-400 hover:text-slate-200"
              >
                ×
              </Button>
            </div>
                
            <div className="space-y-3 text-xs">
              <div>
                <h4 className="text-slate-300 font-medium mb-2">Types d'appareils</h4>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-red-500 rounded"></div>
                    <Server className="w-3 h-3 text-slate-400" />
                    <span className="text-slate-300">Serveurs</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                    <Router className="w-3 h-3 text-slate-400" />
                    <span className="text-slate-300">Routeurs</span>
                  </div>
                                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-cyan-500 rounded-full"></div>
                    <Monitor className="w-3 h-3 text-slate-400" />
                    <span className="text-slate-300">Workstations</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-amber-500 rounded-sm transform rotate-45"></div>
                    <Shield className="w-3 h-3 text-slate-400" />
                    <span className="text-slate-300">Firewalls</span>
                  </div>
                  </div>
                </div>

                <div>
                <h4 className="text-slate-300 font-medium mb-2">Statut sécurité</h4>
                  <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 border-2 border-red-500 rounded"></div>
                    <span className="text-slate-300">Haut risque</span>
                  </div>
                    <div className="flex items-center gap-2">
                    <div className="w-3 h-3 border-2 border-orange-500 rounded"></div>
                    <span className="text-slate-300">Risque moyen</span>
                    </div>
                    <div className="flex items-center gap-2">
                    <div className="w-3 h-3 border-2 border-green-500 rounded"></div>
                    <span className="text-slate-300">Sécurisé</span>
                  </div>
                </div>
              </div>
            </div>
                  </div>
                </div>
      )}

      {/* Bouton pour réafficher la légende */}
      {!showLegend && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowLegend(true)}
          className="absolute top-4 right-4 z-10 bg-slate-800 border-slate-600 text-slate-200 hover:bg-slate-700"
        >
          <Settings className="w-4 h-4" />
        </Button>
      )}

      {/* Instructions */}
      <div className="absolute bottom-4 left-4 z-10">
        <div className="bg-slate-800/95 backdrop-blur-md rounded-lg p-3 border border-slate-700 shadow-lg max-w-sm">
          <h3 className="text-sm font-medium text-slate-200 mb-2">Instructions</h3>
          <div className="space-y-1 text-xs text-slate-300">
            <p>• <strong>Cliquer</strong> sur un nœud pour ouvrir la sidebar</p>
            <p>• <strong>Glisser</strong> pour repositionner les nœuds</p>
            <p>• <strong>Molette</strong> pour zoomer/dézoomer</p>
            <p>• <strong>Connexions</strong> via la sidebar "Connexions Réseau"</p>
          </div>
        </div>
      </div>

      {/* Container du réseau */}
      <div 
        ref={networkRef} 
        className="w-full h-full" 
        style={{ height: '100%' }}
      />
    </div>
  );
};

export default NetworkVisualization;