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
  showLabels?: boolean;
  graphStyle?: 'bloodhound';
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
  showLabels: externalShowLabels = true,
  graphStyle: externalGraphStyle = 'bloodhound',
}) => {
  const networkRef = useRef<HTMLDivElement>(null);
  const networkInstance = useRef<Network | null>(null);
  const { networkNodes, updateNetworkNode } = useHostStore();
  // Accéder au store pour mettre à jour les connexions lors des suppressions
  const { hosts: hostsMap, updateHost } = useHostStore();
  const [showLabels, setShowLabels] = useState(externalShowLabels);
  const [graphStyle, setGraphStyle] = useState<'bloodhound'>(externalGraphStyle);
  const [connectionCount, setConnectionCount] = useState(0);
  // Supprimé: savedEdges local non persistant

  // Déterminer le type d'appareil basé sur l'OS et les services - style killchain avec emojis
  const getDeviceType = (host: Host): DeviceType => {
    const os = host.os?.toLowerCase() || '';
    const hostname = host.hostname?.toLowerCase() || '';
    
    if (os.includes('router') || hostname.includes('router') || hostname.includes('rt-')) {
      return { 
        type: 'router', 
        icon: Router, 
        color: '#8b5cf6', 
        shape: 'icon', 
        size: 16,
        iconCode: '📡', // Router emoji
        iconFont: 'Arial'
      };
    }
    if (os.includes('firewall') || hostname.includes('fw') || hostname.includes('pfsense')) {
      return { 
        type: 'firewall', 
        icon: Shield, 
        color: '#f59e0b', 
        shape: 'icon', 
        size: 16,
        iconCode: '🛡️', // Shield emoji
        iconFont: 'Arial'
      };
    }
    if (os.includes('mobile') || os.includes('android') || os.includes('ios')) {
      return { 
        type: 'mobile', 
        icon: Smartphone, 
        color: '#10b981', 
        shape: 'icon', 
        size: 16,
        iconCode: '📱', // Mobile emoji
        iconFont: 'Arial'
      };
    }
    if (os.includes('database') || hostname.includes('db') || hostname.includes('sql')) {
      return { 
        type: 'database', 
        icon: Database, 
        color: '#3b82f6', 
        shape: 'icon', 
        size: 16,
        iconCode: '🗄️', // Database emoji
        iconFont: 'Arial'
      };
    }
    if (os.includes('windows') && (hostname.includes('ws') || hostname.includes('pc-'))) {
      return { 
        type: 'workstation', 
        icon: Monitor, 
        color: '#06b6d4', 
        shape: 'icon', 
        size: 16,
        iconCode: '💻', // Desktop emoji
        iconFont: 'Arial'
      };
    }
    if (os.includes('server') || hostname.includes('srv') || hostname.includes('dc-')) {
      return { 
        type: 'server', 
        icon: Server, 
        color: '#1e40af', 
        shape: 'icon', 
        size: 16,
        iconCode: '🖥️', // Server emoji
        iconFont: 'Arial'
      };
    }
    if (os.includes('linux') || os.includes('ubuntu') || os.includes('centos')) {
      return { 
        type: 'server', 
        icon: Server, 
        color: '#059669', 
        shape: 'icon', 
        size: 16,
        iconCode: '🐧', // Linux emoji
        iconFont: 'Arial'
      };
    }
    
    return { 
      type: 'unknown', 
      icon: Globe, 
      color: '#64748b', 
      shape: 'icon', 
      size: 16,
      iconCode: '🌐', // Globe emoji
      iconFont: 'Arial'
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

  // Synchroniser les props externes
  useEffect(() => {
    setShowLabels(externalShowLabels);
  }, [externalShowLabels]);

  useEffect(() => {
    setGraphStyle(externalGraphStyle);
  }, [externalGraphStyle]);

  useEffect(() => {
    if (!networkRef.current) return;

    // Préparer les nœuds avec labels natifs de vis.js
    const nodes = new DataSet(
      hosts.map((host, index) => {
        const savedNode = networkNodes[host.id];
        const deviceType = getDeviceType(host);
        const securityStatus = getSecurityStatus(host);
        
        // Bordure colorée selon le statut de sécurité
        const borderConfig = {
          'critical': { color: '#dc2626', width: 3, shadowColor: 'rgba(220, 38, 38, 0.4)' },
          'high-risk': { color: '#ea580c', width: 2, shadowColor: 'rgba(234, 88, 12, 0.3)' },
          'medium-risk': { color: '#d97706', width: 2, shadowColor: 'rgba(217, 119, 6, 0.3)' },
          'low-risk': { color: '#eab308', width: 1, shadowColor: 'rgba(234, 179, 8, 0.2)' },
          'secure': { color: '#16a34a', width: 1, shadowColor: 'rgba(22, 163, 74, 0.2)' }
        };
        
        const borderStyle = borderConfig[securityStatus];
        const category = categories.find(c => c.id === host.category);
        const zoneColor = category?.color || '#64748b';
        const iconChar = deviceType.iconCode || '🌐';
        const isSelected = selectedHost?.id === host.id;
        
        // Nœud avec style killchain - petit cercle fixe avec emoji au centre et texte en dessous
        const nodeConfig: any = {
          id: host.id,
          label: showLabels ? (host.hostname || host.ip) : '', // Label en dessous du cercle
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
          shape: 'circle',
          size: 16, // Taille fixe pour tous les nœuds
          color: {
            background: zoneColor,
            border: isSelected ? '#ffffff' : '#000000',
            highlight: {
              background: zoneColor,
              border: '#ffffff'
            },
            hover: {
              background: zoneColor,
              border: '#ffffff'
            }
          },
          borderWidth: isSelected ? 3 : 2,
          shadow: {
            enabled: true,
            color: isSelected ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.3)',
            size: isSelected ? 8 : 4,
            x: 2,
            y: 2
          },
          font: {
            color: '#ffffff',
            size: 10,
            face: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
            strokeWidth: 2,
            strokeColor: '#000000',
            align: 'center'
          },
          margin: { top: 8, right: 2, bottom: 2, left: 2 }, // Plus d'espace en haut pour le label
          x: savedNode?.x || (index % 6) * 200 + 100,
          y: savedNode?.y || Math.floor(index / 6) * 150 + 100,
          physics: savedNode ? false : true
        };

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

    // Configuration du réseau pour le style Killchain avec petits ronds et labels en dessous
    const options = {
      nodes: {
        font: { 
          size: 10, 
          face: 'Inter, sans-serif', 
          strokeWidth: 2, 
          strokeColor: '#000000',
          color: '#ffffff',
          align: 'center'
        },
        shadow: { 
          enabled: true, 
          color: 'rgba(0,0,0,0.3)', 
          size: 4, 
          x: 2, 
          y: 2 
        },
        borderWidth: 2,
        borderWidthSelected: 3,
        scaling: { 
          min: 16, 
          max: 16, 
          label: { 
            enabled: true, 
            min: 8, 
            max: 12,
            maxVisible: 12
          }
        },
        chosen: {
          node(values: any) {
            values.borderWidth = 3;
            values.shadow = true;
            values.size = values.size * 1.1;
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
    
    // Ajouter les emojis dans les cercles après création du réseau
    setTimeout(() => {
      if (networkInstance.current && networkRef.current) {
        const canvas = networkRef.current.querySelector('canvas');
        if (canvas) {
          const ctx = canvas.getContext('2d');
          if (ctx) {
            // Fonction pour dessiner les emojis
            const drawNodeIcons = () => {
              hosts.forEach((host, index) => {
                const savedNode = networkNodes[host.id];
                const deviceType = getDeviceType(host);
                const iconChar = deviceType.iconCode || '🌐';
                
                const x = savedNode?.x || (index % 6) * 200 + 100;
                const y = savedNode?.y || Math.floor(index / 6) * 150 + 100;
                
                // Dessiner l'emoji au centre du cercle
                ctx.font = '14px Arial'; // Taille appropriée pour les emojis
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(iconChar, x, y);
              });
            };
            
            // Redessiner les icônes quand le réseau se redessine
            networkInstance.current.on('redraw', drawNodeIcons);
            drawNodeIcons();
          }
        }
      }
    }, 100);
    
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
      
      // Réinitialiser les positions des nœuds - APPROCHE SIMPLIFIÉE
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
      {/* CSS pour le style Killchain - petits ronds avec icônes centrées */}
      <style>{`
        /* Style Killchain : petits cercles avec icônes centrées et labels en dessous */
        .vis-network .vis-network-node {
          filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));
        }
        .vis-network .vis-network-node.vis-selected {
          filter: drop-shadow(0 4px 8px rgba(255,255,255,0.4));
          transform: scale(1.1);
        }
        .vis-network .vis-network-node:hover {
          filter: drop-shadow(0 3px 6px rgba(255,255,255,0.3));
          transform: scale(1.05);
        }
        
        /* Forcer tous les nœuds à être des cercles parfaits et petits comme dans killchain */
        .vis-network .vis-network-node circle {
          r: 8px !important;
        }
        .vis-network .vis-network-node ellipse {
          rx: 8px !important;
          ry: 8px !important;
        }
        .vis-network .vis-network-node rect {
          rx: 8px !important;
          ry: 8px !important;
          width: 16px !important;
          height: 16px !important;
        }
        
        /* Forcer la taille des nœuds à être fixe */
        .vis-network .vis-network-node {
          width: 16px !important;
          height: 16px !important;
        }
        
        /* Style des labels de texte (en dessous des cercles) */
        .vis-network .vis-network-label {
          font-size: 10px !important;
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif !important;
          font-weight: 500 !important;
          color: #ffffff !important;
          text-shadow: 1px 1px 2px rgba(0,0,0,0.8) !important;
          text-align: center !important;
          line-height: 1.2 !important;
          margin-top: 4px !important;
        }
        
        /* Style des arêtes */
        .vis-network .vis-network-edge {
          stroke-width: 2px !important;
        }
        .vis-network .vis-network-edge:hover {
          stroke-width: 3px !important;
        }
        
        /* Labels des arêtes */
        .vis-network .vis-network-edge .vis-network-label {
          font-size: 8px !important;
          background: rgba(15, 23, 42, 0.9) !important;
          color: #cbd5e1 !important;
          padding: 2px 4px !important;
          border-radius: 3px !important;
        }
        
        /* Améliorer l'apparence des nœuds sélectionnés */
        .vis-network .vis-network-node.vis-selected circle {
          stroke: #ffffff !important;
          stroke-width: 3px !important;
        }
        
        /* Style pour les nœuds au survol */
        .vis-network .vis-network-node:hover circle {
          stroke: #ffffff !important;
          stroke-width: 2px !important;
        }
        
        /* Style pour les emojis dans les cercles */
        .vis-network .vis-network-node text {
          font-family: 'Arial', sans-serif !important;
          font-size: 14px !important;
          text-anchor: middle !important;
          dominant-baseline: central !important;
        }
        
        /* Améliorer la visibilité des emojis */
        .vis-network .vis-network-node text {
          text-shadow: 1px 1px 2px rgba(0,0,0,0.8) !important;
        }
        
        /* S'assurer que les nœuds ont une taille fixe */
        .vis-network .vis-network-node {
          min-width: 16px !important;
          min-height: 16px !important;
          max-width: 16px !important;
          max-height: 16px !important;
        }
      `}</style>




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