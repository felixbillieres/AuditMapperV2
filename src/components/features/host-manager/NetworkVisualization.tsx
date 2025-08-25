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
  Layers,
  Info
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Host, Category } from '@/types';
import { useHostStore } from '@/stores/hostStore';

interface NetworkVisualizationProps {
  hosts: Host[];
  categories: Category[];
  onNodeSelect?: (host: Host) => void;
  selectedHost?: Host | null;
  uiRightOffset?: number; // Décalage des éléments en haut à droite (px)
}

interface DeviceType {
  type: 'server' | 'router' | 'firewall' | 'workstation' | 'mobile' | 'database' | 'unknown';
  icon: React.ComponentType<any>;
  color: string;
  shape: string;
  size: number;
  iconCode?: string; // Code Unicode pour l'icône
  iconFont?: string; // Police d'icône
}

const NetworkVisualization: React.FC<NetworkVisualizationProps> = ({
  hosts,
  categories,
  onNodeSelect,
  selectedHost,
  uiRightOffset,
}) => {
  const networkRef = useRef<HTMLDivElement>(null);
  const networkInstance = useRef<Network | null>(null);
  const { networkNodes, updateNetworkNode } = useHostStore();
  // Accéder au store pour mettre à jour les connexions lors des suppressions
  const { hosts: hostsMap, updateHost } = useHostStore();
  const [showLegend, setShowLegend] = useState(true);
  const [showLabels, setShowLabels] = useState(true);
  const [graphStyle, setGraphStyle] = useState<'icons' | 'glow' | 'circles'>('glow'); // Style 1: icônes, Style 2: glow, Style 3: cercles
  const [connectionCount, setConnectionCount] = useState(0);
  // Supprimé: savedEdges local non persistant

  // Déterminer le type d'appareil basé sur l'OS et les services
  const getDeviceType = (host: Host): DeviceType => {
    const os = host.os?.toLowerCase() || '';
    const hostname = host.hostname?.toLowerCase() || '';
    
    if (os.includes('router') || hostname.includes('router') || hostname.includes('rt-')) {
      return { 
        type: 'router', 
        icon: Router, 
        color: '#8b5cf6', 
        shape: 'icon', 
        size: 40,
        iconCode: '\uf1eb', // WiFi icon (solid)  
        iconFont: 'Font Awesome 6 Free'
      };
    }
    if (os.includes('firewall') || hostname.includes('fw') || hostname.includes('pfsense')) {
      return { 
        type: 'firewall', 
        icon: Shield, 
        color: '#f59e0b', 
        shape: 'icon', 
        size: 38,
        iconCode: '\uf132', // Shield icon
        iconFont: 'Font Awesome 6 Free'
      };
    }
    if (os.includes('mobile') || os.includes('android') || os.includes('ios')) {
      return { 
        type: 'mobile', 
        icon: Smartphone, 
        color: '#10b981', 
        shape: 'icon', 
        size: 28,
        iconCode: '\uf10b', // Mobile icon
        iconFont: 'Font Awesome 6 Free'
      };
    }
    if (os.includes('database') || hostname.includes('db') || hostname.includes('sql')) {
      return { 
        type: 'database', 
        icon: Database, 
        color: '#3b82f6', 
        shape: 'icon', 
        size: 35,
        iconCode: '\uf1c0', // Database icon
        iconFont: 'Font Awesome 6 Free'
      };
    }
    if (os.includes('windows') && (hostname.includes('ws') || hostname.includes('pc-'))) {
      return { 
        type: 'workstation', 
        icon: Monitor, 
        color: '#06b6d4', 
        shape: 'icon', 
        size: 32,
        iconCode: '\uf108', // Desktop icon
        iconFont: 'Font Awesome 6 Free'
      };
    }
    if (os.includes('server') || hostname.includes('srv') || hostname.includes('dc-')) {
      return { 
        type: 'server', 
        icon: Server, 
        color: '#1e40af', 
        shape: 'icon', 
        size: 38,
        iconCode: '\uf233', // Server icon
        iconFont: 'Font Awesome 6 Free'
      };
    }
    if (os.includes('linux') || os.includes('ubuntu') || os.includes('centos')) {
      return { 
        type: 'server', 
        icon: Server, 
        color: '#059669', 
        shape: 'icon', 
        size: 35,
        iconCode: '\uf120', // Terminal icon
        iconFont: 'Font Awesome 6 Free'
      };
    }
    
    return { 
      type: 'unknown', 
      icon: Globe, 
      color: '#64748b', 
      shape: 'icon', 
      size: 28,
      iconCode: '\uf0ac', // Globe icon
      iconFont: 'FontAwesome'
    };
  };

  // Obtenir la couleur basée sur la catégorie et le statut
  const getNodeColor = (host: Host, deviceType: DeviceType) => {
    const category = categories.find(c => c.id === host.category);
    
    // Couleurs de priorité par catégorie améliorées pour les icônes
    const categoryColors: { [key: string]: string } = {
      'critical': '#ef4444',     // Rouge vif
      'high': '#f97316',         // Orange vif
      'medium': '#f59e0b',       // Jaune orange
      'low': '#84cc16',          // Vert lime
      'info': '#06b6d4',         // Cyan vif
      'secure': '#10b981',       // Vert émeraude
      'compromised': '#dc2626',  // Rouge foncé
      'vulnerable': '#ea580c',   // Orange rouge
      'target': '#8b5cf6',       // Violet
      'pivot': '#ec4899',        // Rose
      'discovered': '#3b82f6',   // Bleu
      'scanned': '#6366f1'       // Indigo
    };
    
    // Statut de compromission prioritaire
    if (host.status === 'compromised') {
      return '#dc2626'; // rouge critique
    }
    
    if (category) {
      // Recherche par nom exact d'abord
      if (categoryColors[category.name.toLowerCase()]) {
        return categoryColors[category.name.toLowerCase()];
      }
      
      // Recherche par mots-clés dans le nom
      const lowerName = category.name.toLowerCase();
      for (const [key, color] of Object.entries(categoryColors)) {
        if (lowerName.includes(key)) {
          return color;
        }
      }
      
      // Couleur par hash du nom de catégorie si pas de correspondance (plus vive)
      const hash = category.name.split('').reduce((a, b) => {
        a = ((a << 5) - a) + b.charCodeAt(0);
        return a & a;
      }, 0);
      const hue = Math.abs(hash) % 360;
      return `hsl(${hue}, 75%, 55%)`; // Saturation et luminosité augmentées
    }
    
    // Couleurs de fallback améliorées basées sur le type d'appareil
    const improvedDeviceColors = {
      'server': '#3b82f6',      // Bleu vif
      'router': '#8b5cf6',      // Violet vif  
      'firewall': '#f59e0b',    // Orange vif
      'database': '#06b6d4',    // Cyan vif
      'workstation': '#10b981', // Vert émeraude
      'mobile': '#84cc16',      // Vert lime
      'unknown': '#6b7280'      // Gris
    };
    
    return improvedDeviceColors[deviceType.type] || deviceType.color;
  };

  // Obtenir le statut de sécurité
  const getSecurityStatus = (host: Host) => {
    const vulnCount = host.vulnerabilities?.length || 0;
    const hasCredentials = (host.usernames?.length || 0) + (host.passwords?.length || 0) + (host.hashes?.length || 0) > 0;
    const exploitSteps = host.exploitationSteps?.length || 0;
    
    if (host.status === 'compromised' || vulnCount > 10 || exploitSteps > 3) return 'critical';
    if (vulnCount > 5 || hasCredentials || exploitSteps > 0) return 'high-risk';
    if (vulnCount > 2) return 'medium-risk';
    if (vulnCount > 0) return 'low-risk';
    return 'secure';
  };

  const hostIdsSignature = useMemo(() => hosts.map(h => String(h.id)).sort().join(','), [hosts]);
  const categoriesSignature = useMemo(() => categories.map(c => `${c.id}:${c.name}:${c.color || ''}`).sort().join(','), [categories]);
  
  // Référence stable pour onNodeSelect pour éviter les recréations du réseau
  const onNodeSelectRef = useRef(onNodeSelect);
  useEffect(() => {
    onNodeSelectRef.current = onNodeSelect;
  }, [onNodeSelect]);

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
        const borderConfig = {
          'critical': { color: '#dc2626', width: 5, shadowColor: 'rgba(220, 38, 38, 0.4)' },
          'high-risk': { color: '#ea580c', width: 4, shadowColor: 'rgba(234, 88, 12, 0.3)' },
          'medium-risk': { color: '#d97706', width: 3, shadowColor: 'rgba(217, 119, 6, 0.3)' },
          'low-risk': { color: '#eab308', width: 2, shadowColor: 'rgba(234, 179, 8, 0.2)' },
          'secure': { color: '#16a34a', width: 2, shadowColor: 'rgba(22, 163, 74, 0.2)' }
        };
        
        const borderStyle = borderConfig[securityStatus];
        
        const nodeConfig: any = {
          id: host.id,
          label: showLabels ? `${host.hostname || host.ip}\n${host.ip}` : '',
          title: `
            <div style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; padding: 12px; background: linear-gradient(135deg, #1e293b 0%, #334155 100%); border-radius: 8px; color: #f8fafc; box-shadow: 0 8px 24px rgba(0,0,0,0.3);">
              <div style="font-size: 14px; font-weight: 600; color: #f1f5f9; margin-bottom: 8px;">${host.hostname || 'Hôte sans nom'}</div>
              <div style="font-size: 12px; color: #cbd5e1; margin-bottom: 6px;">🌐 ${host.ip}</div>
              <div style="font-size: 12px; color: #cbd5e1; margin-bottom: 6px;">💻 ${host.os || 'OS inconnu'}</div>
              <div style="font-size: 12px; color: #cbd5e1; margin-bottom: 6px;">📋 ${deviceType.type}</div>
              <hr style="border: none; border-top: 1px solid #475569; margin: 8px 0;" />
              <div style="font-size: 11px; color: ${borderStyle.color}; font-weight: 500;">🛡️ Statut: ${securityStatus}</div>
              <div style="font-size: 11px; color: #94a3b8;">⚠️ Vulnérabilités: ${host.vulnerabilities?.length || 0}</div>
              <div style="font-size: 11px; color: #94a3b8;">🔑 Credentials: ${(host.usernames?.length || 0) + (host.passwords?.length || 0) + (host.hashes?.length || 0)}</div>
              <div style="font-size: 11px; color: #94a3b8;">🛠️ Exploits: ${host.exploitationSteps?.length || 0}</div>
            </div>
          `,
          shape: deviceType.shape,
          size: deviceType.size,
          borderWidth: borderStyle.width,
          font: {
            color: '#f8fafc',
            size: 11,
            face: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
            strokeWidth: 2,
            strokeColor: '#0f172a'
          },
          shadow: {
            enabled: true,
            color: borderStyle.shadowColor,
            size: 12,
            x: 3,
            y: 3
          },
          widthConstraint: { minimum: 80, maximum: 220 },
          margin: { top: 8, right: 10, bottom: 8, left: 10 },
          x: savedNode?.x || (index % 6) * 200 + 100,
          y: savedNode?.y || Math.floor(index / 6) * 150 + 100,
          physics: savedNode ? false : true
        };

        // Configuration selon le style sélectionné
        if ((graphStyle === 'icons' || graphStyle === 'glow') && deviceType.shape === 'icon' && deviceType.iconCode && deviceType.iconFont) {
          // Style 1 (icons) et Style 2 (glow) : Icônes FontAwesome
          nodeConfig.shape = 'icon';
          nodeConfig.icon = {
            face: deviceType.iconFont,
            code: deviceType.iconCode,
            size: deviceType.size,
            color: deviceType.color // Couleur d'origine de l'icône
          };
          
          nodeConfig.color = {
            border: 'transparent',
            highlight: { border: '#f1f5f9' },
            hover: { border: '#e2e8f0' }
          };
          
          if (graphStyle === 'glow') {
            // Style 2 : Avec effet glow
            nodeConfig.shadow = {
              enabled: true,
              color: nodeColor,
              size: 25,
              x: 0,
              y: 0
            };
          } else {
            // Style 1 : Pas de glow
            nodeConfig.shadow = {
              enabled: false
            };
          }
          
          nodeConfig.shapeProperties = {
            borderDashes: false,
            borderRadius: 0,
            interpolation: false,
            useImageSize: false,
            useBorderWithImage: false
          };
          
          if (showLabels) {
            nodeConfig.label = `${host.hostname || host.ip}\n${host.ip}`;
            nodeConfig.font = {
              color: '#f8fafc',
              size: 11,
              face: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
              strokeWidth: 2,
              strokeColor: '#0f172a'
            };
          }
        } else if (graphStyle === 'circles') {
          // Style 3 : Cercles colorés (pas d'icônes)
          nodeConfig.shape = 'circle';
          nodeConfig.size = deviceType.size;
          nodeConfig.color = {
            background: nodeColor,
            border: borderStyle.color,
            highlight: {
              background: nodeColor,
              border: '#f1f5f9'
            },
            hover: {
              background: nodeColor,
              border: '#e2e8f0'
            }
          };
          nodeConfig.borderWidth = borderStyle.width;
          nodeConfig.shadow = {
            enabled: true,
            color: borderStyle.shadowColor,
            size: 12,
            x: 3,
            y: 3
          };
          nodeConfig.shapeProperties = {
            borderRadius: 50
          };
        } else {
          // Configuration classique pour les formes géométriques
          // Utiliser les formes originales si les icônes sont désactivées
          const originalShapes = {
            'router': 'diamond',
            'firewall': 'triangle', 
            'mobile': 'circle',
            'database': 'box',
            'workstation': 'circle',
            'server': 'box',
            'unknown': 'dot'
          };
          
          nodeConfig.shape = useIcons ? deviceType.shape : originalShapes[deviceType.type];
          nodeConfig.color = {
            background: nodeColor,
            border: borderStyle.color,
            highlight: {
              background: nodeColor,
              border: '#f1f5f9'
            },
            hover: {
              background: nodeColor,
              border: '#e2e8f0'
            }
          };
          nodeConfig.shapeProperties = {
            borderRadius: 12,
          };
        }

        return nodeConfig;
      })
    );

    // Construire les arêtes à partir des connexions persistées
    const edgeList: any[] = [];
    hosts.forEach((host) => {
      (host.outgoingConnections || []).forEach((conn: any, idx: number) => {
        if (!conn || !conn.toHostId) return;
        // Déterminer le type de connexion pour le style
        const connectionType = conn.cause?.toLowerCase() || 'unknown';
        let edgeColor = '#3b82f6'; // Bleu par défaut
        let edgeWidth = 2;
        
        if (connectionType.includes('exploit') || connectionType.includes('attack')) {
          edgeColor = '#dc2626'; // Rouge pour les attaques
          edgeWidth = 3;
        } else if (connectionType.includes('admin') || connectionType.includes('rdp') || connectionType.includes('ssh')) {
          edgeColor = '#7c3aed'; // Violet pour admin
          edgeWidth = 3;
        } else if (connectionType.includes('smb') || connectionType.includes('share')) {
          edgeColor = '#059669'; // Vert pour partages
        } else if (connectionType.includes('web') || connectionType.includes('http')) {
          edgeColor = '#0ea5e9'; // Cyan pour web
        }
        
        edgeList.push({
          id: `${host.id}-${conn.toHostId}-${idx}`,
          from: host.id,
          to: conn.toHostId,
          label: conn.cause || '',
          color: {
            color: edgeColor,
            highlight: '#f1f5f9',
            hover: '#e2e8f0',
            opacity: 0.8
          },
          width: edgeWidth,
          arrows: {
            to: {
              enabled: true,
              scaleFactor: 1.2,
              type: 'arrow'
            }
          },
          smooth: {
            enabled: true,
            type: 'dynamic',
            roundness: 0.5
          },
          shadow: {
            enabled: true,
            color: edgeColor,
            size: 3,
            x: 1,
            y: 1
          }
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
        selectionWidth: 4,
        hoverWidth: 4,
        physics: false,
        chosen: {
          edge(values: any) {
            values.color = '#f1f5f9';
            values.width = values.width + 1;
            values.shadow = true;
          }
        },
        font: {
          color: '#cbd5e1',
          size: 10,
          face: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
          strokeWidth: 2,
          strokeColor: '#0f172a',
          background: 'rgba(15, 23, 42, 0.85)',
          align: 'middle'
        },
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
        selectConnectedEdges: false, // Éviter les sélections automatiques qui peuvent déplacer la vue
        hover: true,
        hoverConnectedEdges: false, // Réduire les effets de survol qui peuvent perturber
        tooltipDelay: 200,
        navigationButtons: false, // Désactiver les boutons de navigation qui peuvent interférer
        keyboard: { enabled: true, speed: { x: 10, y: 10, zoom: 0.02 }, bindToWindow: false },
        multiselect: false, // Éviter la sélection multiple
      },
      layout: { improvedLayout: false, randomSeed: undefined },
      autoResize: true,
      configure: { enabled: false },
    } as any;

    // Créer le réseau
    networkInstance.current = new Network(networkRef.current, { nodes, edges }, options);
    
    // Éviter toute stabilisation automatique qui pourrait changer la vue
    // La physique est déjà configurée pour se stabiliser sans fit automatique

    // Gestionnaires d'événements
    networkInstance.current.on('click', (params) => {
      if (params.nodes.length > 0) {
        const nodeId = params.nodes[0];
        const host = hosts.find(h => h.id === nodeId);
        if (host && onNodeSelectRef.current) onNodeSelectRef.current(host);
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

    // Événement de stabilisation - ne se déclenche qu'au début, pas après les interactions
    let stabilizationDone = false;
    networkInstance.current.on('stabilizationIterationsDone', () => {
      if (!stabilizationDone) {
        setConnectionCount(edgeList.length);
        try {
          // Sauver positions et désactiver la physique pour garder une carte stable
          persistPositions();
          (networkInstance.current as any).setOptions({ physics: { enabled: false } });
          stabilizationDone = true;
        } catch {}
      }
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
  }, [hostIdsSignature, categoriesSignature, showLabels, graphStyle]);

  // Initialiser le compteur de connexions
  useEffect(() => {
    const count = hosts.reduce((acc, h) => acc + ((h.outgoingConnections || []).length), 0);
    setConnectionCount(count);
  }, [hosts]);

  // Mettre en surbrillance le nœud sélectionné SANS changer la vue
  useEffect(() => {
    if (networkInstance.current && selectedHost) {
      try {
        // S'assurer que le nœud existe avant de sélectionner
        const allIds = hosts.map(h => h.id);
        if (allIds.includes(selectedHost.id)) {
          // Désélectionner tous les nœuds en silence
          (networkInstance.current as any).unselectAll?.();
          // Sélectionner le nouveau nœud SANS bouger la caméra
          networkInstance.current.selectNodes([selectedHost.id]);
          
          // S'assurer qu'aucune animation ou mouvement de caméra n'est déclenché
          // En maintenant la position actuelle de la vue
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
      // Sauvegarder les positions après le fit
      setTimeout(() => {
        persistPositions();
      }, 1100);
    }
  };

  const autoSpace = () => {
    if (!networkInstance.current) return;
    try {
      // Stocker la position actuelle de la vue
      const currentViewPosition = networkInstance.current.getViewPosition();
      const currentScale = networkInstance.current.getScale();
      
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
      
      // Désactiver la physique après stabilisation et restaurer la vue
      networkInstance.current.once('stabilizationIterationsDone', () => {
        if (networkInstance.current) {
          networkInstance.current.setOptions({ physics: { enabled: false } });
          // Restaurer la position de la vue
          networkInstance.current.moveTo({
            position: currentViewPosition,
            scale: currentScale,
            animation: false
          });
          persistPositions();
        }
      });
      
      (networkInstance.current as any).stabilize?.();
    } catch (error) {
      console.warn('Erreur lors de l\'espacement automatique:', error);
    }
  };

  const resetLayout = () => {
    if (networkInstance.current) {
      // Stocker la vue actuelle
      const currentViewPosition = networkInstance.current.getViewPosition();
      const currentScale = networkInstance.current.getScale();
      
      // Réinitialiser les positions des nœuds
      const newPositions: { [key: string]: { x: number; y: number } } = {};
      hosts.forEach((host, index) => {
        const newPos = { 
          x: (index % 6) * 200 + 100, 
          y: Math.floor(index / 6) * 150 + 100 
        };
        newPositions[host.id] = newPos;
        updateNetworkNode(host.id, newPos);
      });
      
      // Mettre à jour les positions dans le réseau directement
      try {
        const nodeUpdate = Object.keys(newPositions).map(id => ({
          id,
          x: newPositions[id].x,
          y: newPositions[id].y
        }));
        
        networkInstance.current.setData({
          nodes: networkInstance.current.body.data.nodes.update(nodeUpdate),
          edges: networkInstance.current.body.data.edges
        });
        
        // Restaurer la vue après un court délai
        setTimeout(() => {
          if (networkInstance.current) {
            networkInstance.current.moveTo({
              position: currentViewPosition,
              scale: currentScale,
              animation: { duration: 500, easingFunction: 'easeInOutQuad' }
            });
          }
        }, 100);
        
      } catch (error) {
        console.warn('Erreur lors de la réinitialisation:', error);
        // Fallback: juste fit la vue
        setTimeout(() => fitToScreen(), 200);
      }
    }
  };

  return (
    <div className="relative w-full h-full bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* CSS pour améliorer les effets glow des icônes */}
      <style>{`
        .vis-network .vis-network-node {
          filter: drop-shadow(0 0 10px currentColor);
        }
        .vis-network .vis-network-node.vis-selected {
          filter: drop-shadow(0 0 20px currentColor) drop-shadow(0 0 30px currentColor);
        }
        .vis-network .vis-network-node:hover {
          filter: drop-shadow(0 0 15px currentColor) drop-shadow(0 0 25px currentColor);
        }
      `}</style>
      {/* Panneau de contrôles */}
      <div className="absolute top-4 left-4 z-10 space-y-2">
        <div className="bg-slate-800/95 backdrop-blur-md rounded-xl p-4 border border-slate-600/50 shadow-2xl ring-1 ring-white/5">
          <h3 className="text-sm font-semibold text-slate-100 mb-3 flex items-center gap-2">
            <Activity className="w-4 h-4 text-blue-400" />
            Contrôles Graph
          </h3>
          <div className="space-y-3">
            {/* Centrage */}
            <Button
              variant="outline"
              size="sm"
              onClick={fitToScreen}
              className="w-full bg-slate-700/80 border-slate-500/50 text-slate-100 hover:bg-slate-600/80 hover:border-slate-400 transition-all duration-200 backdrop-blur-sm"
              title="Centrer tous les hosts sur l'écran"
            >
              <Target className="w-4 h-4 mr-2" />
              Centrer les hosts
            </Button>
            
            {/* Anonymisation */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowLabels(!showLabels)}
              className={`w-full border-slate-500/50 text-slate-100 hover:border-slate-400 transition-all duration-200 backdrop-blur-sm ${
                showLabels ? 'bg-blue-600/80 hover:bg-blue-500/80' : 'bg-slate-700/80 hover:bg-slate-600/80'
              }`}
              title="Anonymiser/Afficher les labels"
            >
              <Eye className="w-4 h-4 mr-2" />
              {showLabels ? 'Anonymiser' : 'Afficher labels'}
            </Button>
            
            {/* Styles */}
            <div>
              <div className="text-xs text-slate-300 mb-2 font-medium">Style visuel:</div>
              <div className="grid grid-cols-3 gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setGraphStyle('icons')}
                  className={`text-xs border-slate-500/50 text-slate-100 hover:border-slate-400 transition-all duration-200 backdrop-blur-sm ${
                    graphStyle === 'icons' ? 'bg-purple-600/80 hover:bg-purple-500/80' : 'bg-slate-700/80 hover:bg-slate-600/80'
                  }`}
                  title="Style 1: Icônes simples"
                >
                  Style 1
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setGraphStyle('glow')}
                  className={`text-xs border-slate-500/50 text-slate-100 hover:border-slate-400 transition-all duration-200 backdrop-blur-sm ${
                    graphStyle === 'glow' ? 'bg-emerald-600/80 hover:bg-emerald-500/80' : 'bg-slate-700/80 hover:bg-slate-600/80'
                  }`}
                  title="Style 2: Icônes avec glow"
                >
                  Style 2
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setGraphStyle('circles')}
                  className={`text-xs border-slate-500/50 text-slate-100 hover:border-slate-400 transition-all duration-200 backdrop-blur-sm ${
                    graphStyle === 'circles' ? 'bg-cyan-600/80 hover:bg-cyan-500/80' : 'bg-slate-700/80 hover:bg-slate-600/80'
                  }`}
                  title="Style 3: Cercles colorés"
                >
                  Style 3
                </Button>
              </div>
            </div>
          </div>
          {connectionCount > 0 && (
            <div className="mt-3 pt-2 border-t border-slate-700/50">
              <div className="text-xs text-blue-400 flex items-center gap-2">
                <Wifi className="w-3 h-3" />
                <span className="font-medium">{connectionCount} connexion{connectionCount > 1 ? 's' : ''}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Légende */}
      {showLegend && (
        <div className="absolute top-4 z-10" style={{ right: uiRightOffset ?? 16 }}>
          <div className="bg-slate-800/95 backdrop-blur-md rounded-xl p-4 border border-slate-600/50 shadow-2xl ring-1 ring-white/5 max-w-xs">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
                <Layers className="w-4 h-4 text-emerald-400" />
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
              {/* Mode d'affichage */}
              <div>
                <h4 className="text-slate-300 font-medium mb-2">Style actuel: 
                  {graphStyle === 'icons' && ' Icônes simples'}
                  {graphStyle === 'glow' && ' Icônes avec glow'}
                  {graphStyle === 'circles' && ' Cercles colorés'}
                </h4>
                <div className="text-slate-400">
                  {graphStyle === 'icons' && '🔸 Icônes FontAwesome sans effet'}
                  {graphStyle === 'glow' && '✨ Icônes avec halo lumineux coloré'}
                  {graphStyle === 'circles' && '⭕ Cercles colorés selon catégorie'}
                </div>
              </div>

              <div>
                <h4 className="text-slate-300 font-medium mb-2">Types d'appareils</h4>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 bg-blue-500 border border-blue-400 ${graphStyle === 'circles' ? 'rounded-full' : 'rounded'}`}></div>
                    <Server className="w-3 h-3 text-slate-400" />
                    <span className="text-slate-300">Serveurs</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 bg-purple-500 border border-purple-400 ${graphStyle === 'circles' ? 'rounded-full' : 'rounded'}`}></div>
                    <Router className="w-3 h-3 text-slate-400" />
                    <span className="text-slate-300">Routeurs</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 bg-emerald-500 border border-emerald-400 ${graphStyle === 'circles' ? 'rounded-full' : 'rounded'}`}></div>
                    <Monitor className="w-3 h-3 text-slate-400" />
                    <span className="text-slate-300">Workstations</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 bg-orange-500 border border-orange-400 ${graphStyle === 'circles' ? 'rounded-full' : 'rounded'}`}></div>
                    <Shield className="w-3 h-3 text-slate-400" />
                    <span className="text-slate-300">Firewalls</span>
                  </div>
                  </div>
                </div>

                <div>
                <h4 className="text-slate-300 font-medium mb-2">Statut sécurité</h4>
                  <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 border-2 border-red-500 rounded bg-red-500/20"></div>
                    <span className="text-slate-300">Critique</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 border-2 border-orange-500 rounded bg-orange-500/20"></div>
                    <span className="text-slate-300">Haut risque</span>
                  </div>
                    <div className="flex items-center gap-2">
                    <div className="w-3 h-3 border-2 border-amber-500 rounded bg-amber-500/20"></div>
                    <span className="text-slate-300">Risque moyen</span>
                    </div>
                    <div className="flex items-center gap-2">
                    <div className="w-3 h-3 border-2 border-green-500 rounded bg-green-500/20"></div>
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
          className="absolute top-4 z-10 bg-slate-800 border-slate-600 text-slate-200 hover:bg-slate-700"
          style={{ right: uiRightOffset ?? 16 }}
        >
          <Settings className="w-4 h-4" />
        </Button>
      )}

      {/* Instructions */}
      <div className="absolute bottom-4 left-4 z-10">
        <div className="bg-slate-800/95 backdrop-blur-md rounded-xl p-4 border border-slate-600/50 shadow-2xl ring-1 ring-white/5 max-w-sm">
          <h3 className="text-sm font-semibold text-slate-100 mb-3 flex items-center gap-2">
            <Info className="w-4 h-4 text-blue-400" />
            Instructions
          </h3>
          <div className="space-y-2 text-xs text-slate-300">
            <div className="flex items-start gap-2">
              <span className="text-blue-400">•</span>
              <span><strong className="text-slate-200">Cliquer</strong> sur un nœud pour ouvrir la sidebar</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-blue-400">•</span>
              <span><strong className="text-slate-200">Glisser</strong> pour repositionner les nœuds</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-blue-400">•</span>
              <span><strong className="text-slate-200">Molette</strong> pour zoomer/dézoomer</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-blue-400">•</span>
              <span><strong className="text-slate-200">Connexions</strong> via la sidebar</span>
            </div>
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