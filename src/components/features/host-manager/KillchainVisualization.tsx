import React, { useRef, useEffect, useMemo, useState, useCallback } from 'react';
import cytoscape from 'cytoscape';
import dagre from 'cytoscape-dagre';
import coseBilkent from 'cytoscape-cose-bilkent';
import { Host, Category } from '@/types';

// Enregistrer les extensions
cytoscape.use(dagre);
cytoscape.use(coseBilkent);

interface KillchainVisualizationProps {
  hosts: Host[];
  categories: Category[];
  onNodeSelect?: (host: Host) => void;
  selectedHost?: Host | null;
  showLabels?: boolean;
}

interface Phase {
  id: string;
  name: string;
  color: string;
  hosts: Host[];
  x: number;
  width: number;
}

interface NodeType {
  type: 'user' | 'server' | 'workstation' | 'database' | 'router' | 'firewall' | 'mobile' | 'unknown';
  color: string;
  icon: string;
}

const KillchainVisualization: React.FC<KillchainVisualizationProps> = ({
  hosts,
  categories,
  onNodeSelect,
  selectedHost,
  showLabels = true
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const cyRef = useRef<cytoscape.Core | null>(null);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const onNodeSelectRef = useRef(onNodeSelect);
  const isInternalSelection = useRef(false);

  // Mémoriser la fonction de callback pour éviter les re-renders
  const memoizedOnNodeSelect = useCallback((host: Host) => {
    if (onNodeSelect) {
      onNodeSelect(host);
    }
  }, [onNodeSelect]);

  // Mettre à jour la ref quand onNodeSelect change
  useEffect(() => {
    onNodeSelectRef.current = memoizedOnNodeSelect;
  }, [memoizedOnNodeSelect]);

  // Définir les types de nœuds avec couleurs et icônes comme dans BloodHound
  const nodeTypes: { [key: string]: NodeType } = {
    'user': { type: 'user', color: '#4FC3F7', icon: '👤' }, // Bleu clair pour les utilisateurs
    'server': { type: 'server', color: '#F44336', icon: '🖥️' }, // Rouge pour les serveurs
    'workstation': { type: 'workstation', color: '#FF9800', icon: '💻' }, // Orange pour les workstations
    'database': { type: 'database', color: '#4CAF50', icon: '🗄️' }, // Vert pour les bases de données
    'router': { type: 'router', color: '#9C27B0', icon: '📡' }, // Violet pour les routeurs
    'firewall': { type: 'firewall', color: '#FF5722', icon: '🛡️' }, // Rouge-orange pour les firewalls
    'mobile': { type: 'mobile', color: '#00BCD4', icon: '📱' }, // Cyan pour les mobiles
    'unknown': { type: 'unknown', color: '#9E9E9E', icon: '🌐' } // Gris pour les inconnus
  };

  // Obtenir le type d'appareil selon le style BloodHound
  const getDeviceType = (host: Host): NodeType => {
    const os = host.os?.toLowerCase() || '';
    const hostname = host.hostname?.toLowerCase() || '';
    
    // Détecter les utilisateurs (comptes de service, etc.)
    if (hostname.includes('user') || hostname.includes('admin') || hostname.includes('service')) {
      return nodeTypes['user'];
    }
    
    // Détecter les serveurs
    if (os.includes('server') || hostname.includes('srv') || hostname.includes('dc-') || 
        hostname.includes('server') || os.includes('windows server')) {
      return nodeTypes['server'];
    }
    
    // Détecter les workstations
    if (os.includes('windows') && (hostname.includes('ws') || hostname.includes('pc-') || 
        hostname.includes('workstation') || hostname.includes('desktop'))) {
      return nodeTypes['workstation'];
    }
    
    // Détecter les bases de données
    if (os.includes('database') || hostname.includes('db') || hostname.includes('sql') || 
        hostname.includes('mysql') || hostname.includes('postgres')) {
      return nodeTypes['database'];
    }
    
    // Détecter les routeurs
    if (os.includes('router') || hostname.includes('router') || hostname.includes('rt-') || 
        hostname.includes('gateway')) {
      return nodeTypes['router'];
    }
    
    // Détecter les firewalls
    if (os.includes('firewall') || hostname.includes('fw') || hostname.includes('pfsense') || 
        hostname.includes('firewall')) {
      return nodeTypes['firewall'];
    }
    
    // Détecter les mobiles
    if (os.includes('mobile') || os.includes('android') || os.includes('ios') || 
        hostname.includes('mobile') || hostname.includes('phone')) {
      return nodeTypes['mobile'];
    }
    
    // Par défaut, considérer comme serveur si Linux/Unix
    if (os.includes('linux') || os.includes('ubuntu') || os.includes('centos') || 
        os.includes('unix') || os.includes('freebsd')) {
      return nodeTypes['server'];
    }
    
    return nodeTypes['unknown'];
  };

  // Obtenir la couleur de connexion selon le type
  const getConnectionColor = (connectionType: string): string => {
    const type = connectionType.toLowerCase();
    if (type.includes('exploit') || type.includes('attack')) return '#F44336'; // Rouge
    if (type.includes('admin') || type.includes('rdp') || type.includes('ssh')) return '#9C27B0'; // Violet
    if (type.includes('smb') || type.includes('share')) return '#4CAF50'; // Vert
    if (type.includes('web') || type.includes('http')) return '#2196F3'; // Bleu
    return '#9E9E9E'; // Gris par défaut
  };

  // Créer les phases de killchain avec taille standard (comme v1)
  const phases = useMemo((): Phase[] => {
    const phaseList: Phase[] = [];
    const phaseWidth = 500; // Container plus large
    const margin = 100;
    const phaseSpacing = 100; // Plus d'espace entre les phases

    // Grouper les hosts par catégorie
    const hostsByCategory: { [categoryId: string]: Host[] } = {};
    hosts.forEach(host => {
      const categoryId = host.category || 'uncategorized';
      if (!hostsByCategory[categoryId]) {
        hostsByCategory[categoryId] = [];
      }
      hostsByCategory[categoryId].push(host);
    });

    // Créer une catégorie "Non catégorisé" si nécessaire
    const categoriesWithUncategorized = [...categories];
    if (hostsByCategory['uncategorized'] && hostsByCategory['uncategorized'].length > 0) {
      const uncategorizedCategory: Category = {
        id: 'uncategorized',
        name: 'Non catégorisé',
        color: '#64748b',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      categoriesWithUncategorized.push(uncategorizedCategory);
    }

    // Créer les phases côte à côte avec taille standard
    const categoryList = categoriesWithUncategorized.filter(cat => hostsByCategory[cat.id]?.length > 0);
    
    if (categoryList.length === 0 && hosts.length > 0) {
      phaseList.push({
        id: 'default',
        name: 'Tous les hosts',
        color: '#64748b',
        hosts: hosts,
        x: margin,
        width: phaseWidth
      });
    } else {
      categoryList.forEach((category, index) => {
        const phaseHosts = hostsByCategory[category.id] || [];
        if (phaseHosts.length > 0) {
          phaseList.push({
            id: category.id,
            name: category.name,
            color: category.color || '#64748b',
            hosts: phaseHosts,
            x: margin + index * (phaseWidth + phaseSpacing),
            width: phaseWidth
          });
        }
      });
    }

    return phaseList;
  }, [hosts, categories]);

  // Mémoriser les éléments du graphe pour éviter les recréations inutiles
  const graphElements = useMemo(() => {
    const elements: cytoscape.ElementDefinition[] = [];
    const nodeIds = new Set<string>();

    // Ajouter les nœuds de phase (zones de killchain) - hauteur standard comme v1
    phases.forEach((phase, phaseIndex) => {
      // Nœud de phase (zone invisible pour l'organisation)
      const phaseId = `phase-${phase.id}`;
      nodeIds.add(phaseId);
      elements.push({
        group: 'nodes',
        data: {
          id: phaseId,
          label: phase.name,
          phaseId: phase.id,
          phaseName: phase.name,
          phaseColor: phase.color,
          isPhase: true,
          x: phase.x + phase.width / 2,
          y: 200,
          width: phase.width,
          height: 580 // Hauteur standard comme v1
        },
        classes: 'killchain-phase'
      });
    });

    // Ajouter les nœuds hosts dans leurs phases respectives - coordonnées corrigées
    phases.forEach((phase, phaseIndex) => {
      const phaseCenterX = phase.x + phase.width / 2;
      const phaseTopY = 100; // Début des nœuds
      const phaseBottomY = 700; // Fin des nœuds - container plus haut
      const phaseCenterY = (phaseTopY + phaseBottomY) / 2; // Centre vertical
      
      // Calculer la disposition optimale
      const nodeSize = 65; // Taille des nœuds
      const nodeSpacing = 80; // Espacement entre les nœuds
      const margin = 60; // Marge de sécurité
      
      // Zone utilisable pour les nœuds
      const usableWidth = phase.width - (2 * margin);
      const usableHeight = phaseBottomY - phaseTopY;
      
      if (phase.hosts.length === 0) return;
      
      // Disposition en grille si beaucoup de nœuds
      if (phase.hosts.length > 6) {
        const cols = Math.ceil(Math.sqrt(phase.hosts.length));
        const rows = Math.ceil(phase.hosts.length / cols);
        
        // Calculer la taille des cellules
        const cellWidth = usableWidth / cols;
        const cellHeight = usableHeight / rows;
        
        // Centrer la grille dans le conteneur
        const gridStartX = phase.x + margin + (usableWidth - (cols * cellWidth)) / 2;
        const gridStartY = phaseTopY + (usableHeight - (rows * cellHeight)) / 2;
        
        phase.hosts.forEach((host, index) => {
          const deviceType = getDeviceType(host);
          const col = index % cols;
          const row = Math.floor(index / cols);
          const x = gridStartX + (col + 0.5) * cellWidth;
          const y = gridStartY + (row + 0.5) * cellHeight;
          
          nodeIds.add(host.id);
          elements.push({
            group: 'nodes',
            data: {
              id: host.id,
              label: showLabels ? `${deviceType.icon}\n${host.hostname || host.ip}` : deviceType.icon,
              hostname: host.hostname || host.ip,
              ip: host.ip,
              os: host.os || 'Unknown',
              nodeType: deviceType.type,
              icon: deviceType.icon,
              status: host.status,
              priority: host.priority,
              vulnerabilities: host.vulnerabilities?.length || 0,
              credentials: (host.usernames?.length || 0) + (host.passwords?.length || 0) + (host.hashes?.length || 0),
              phaseId: phase.id,
              x: x,
              y: y
            },
            classes: 'killchain-node'
          });
        });
      } else {
        // Disposition verticale centrée
        const totalHeight = (phase.hosts.length - 1) * nodeSpacing;
        const startY = phaseCenterY - (totalHeight / 2);
        
        phase.hosts.forEach((host, index) => {
          const deviceType = getDeviceType(host);
          const y = startY + index * nodeSpacing;
          
          nodeIds.add(host.id);
          elements.push({
            group: 'nodes',
            data: {
              id: host.id,
              label: showLabels ? `${deviceType.icon}\n${host.hostname || host.ip}` : deviceType.icon,
              hostname: host.hostname || host.ip,
              ip: host.ip,
              os: host.os || 'Unknown',
              nodeType: deviceType.type,
              icon: deviceType.icon,
              status: host.status,
              priority: host.priority,
              vulnerabilities: host.vulnerabilities?.length || 0,
              credentials: (host.usernames?.length || 0) + (host.passwords?.length || 0) + (host.hashes?.length || 0),
              phaseId: phase.id,
              x: phaseCenterX,
              y: y
            },
            classes: 'killchain-node'
          });
        });
      }
    });

    // Ajouter les connexions entre hosts - vérifier que les nœuds source et target existent
    hosts.forEach(host => {
      (host.outgoingConnections || []).forEach((conn, idx) => {
        if (!conn || !conn.toHostId) return;
        
        // Vérifier que les nœuds source et target existent dans le Set des nœuds créés
        if (nodeIds.has(host.id) && nodeIds.has(conn.toHostId)) {
          elements.push({
            group: 'edges',
            data: {
              id: `${host.id}-${conn.toHostId}-${idx}`,
              source: host.id,
              target: conn.toHostId,
              label: conn.cause || '',
              connectionType: conn.cause?.toLowerCase() || 'unknown'
            },
            classes: 'killchain-edge'
          });
        }
      });
    });

    return elements;
  }, [hosts, showLabels, phases]);

  // Initialiser Cytoscape une seule fois
  useEffect(() => {
    if (!containerRef.current) return;

    // Nettoyer l'instance précédente
    if (cyRef.current) {
      cyRef.current.destroy();
    }

    // Configuration Cytoscape - Style BloodHound KillChain
    const cy = cytoscape({
      container: containerRef.current,
      elements: graphElements,
      style: [
        // Style des nœuds de phase (zones de killchain)
        {
          selector: '.killchain-phase',
          style: {
            'background-color': (ele) => ele.data('phaseColor'),
            'border-color': (ele) => ele.data('phaseColor'),
            'border-width': 3,
            'border-style': 'dashed',
            'width': (ele) => ele.data('width'),
            'height': (ele) => ele.data('height'),
            'shape': 'rectangle',
            'font-size': '18px',
            'font-weight': 'bold',
            'color': (ele) => ele.data('phaseColor'),
            'text-valign': 'top',
            'text-halign': 'center',
            'text-margin-y': 15,
            'text-outline-width': 2,
            'text-outline-color': '#000000',
            'label': (ele) => ele.data('label'),
            'opacity': 0.15,
            'z-index': 1
          }
        },
        // Style des nœuds hosts - style BloodHound authentique
        {
          selector: '.killchain-node',
          style: {
            'background-color': (ele) => {
              const nodeType = ele.data('nodeType');
              return nodeTypes[nodeType]?.color || '#9E9E9E';
            },
            'width': 65,
            'height': 65,
            'shape': 'ellipse',
            'border-width': 2,
            'border-color': '#ffffff',
            'font-size': '10px',
            'font-weight': 'bold',
            'color': '#ffffff',
            'text-valign': 'center',
            'text-halign': 'center',
            'text-margin-y': 0,
            'text-wrap': 'wrap',
            'text-max-width': '100px',
            'line-height': '1.2',
            'text-outline-width': 1,
            'text-outline-color': '#000000',
            'label': (ele) => ele.data('label'),
            'z-index': 10
          }
        },
        // Style des connexions - fines lignes avec flèches (comme v1)
        {
          selector: '.killchain-edge',
          style: {
            'width': 1,
            'line-color': (ele) => getConnectionColor(ele.data('connectionType')),
            'target-arrow-color': (ele) => getConnectionColor(ele.data('connectionType')),
            'target-arrow-shape': 'triangle',
            'target-arrow-size': '3px',
            'curve-style': 'straight',
            'font-size': '8px',
            'color': '#000000',
            'text-rotation': 'autorotate',
            'text-margin-y': -10,
            'opacity': 0.8,
            'z-index': 5
          }
        },
        // Style pour les nœuds sélectionnés
        {
          selector: '.killchain-node:selected',
          style: {
            'border-width': 3,
            'border-color': '#000000',
            'width': 70,
            'height': 70,
            'font-size': '11px'
          }
        },
        // Style pour les nœuds au survol
        {
          selector: '.killchain-node:hover',
          style: {
            'border-width': 3,
            'border-color': '#000000',
            'width': 70,
            'height': 70,
            'font-size': '11px'
          }
        }
      ],
      layout: {
        name: 'preset',
        positions: (node) => {
          if (node.data('x') && node.data('y')) {
            return { x: node.data('x'), y: node.data('y') };
          }
          return undefined;
        },
        fit: true,
        padding: 120,
        animate: false // Pas d'animation pour un layout statique
      },
      userZoomingEnabled: true,
      userPanningEnabled: true,
      boxSelectionEnabled: false,
      selectionType: 'single',
      minZoom: 0.1,
      maxZoom: 3,
      // Désactiver le drag & drop des nœuds
      autoungrabify: true,
      autolock: false
    });

    // Gestionnaires d'événements
    cy.on('tap', 'node', (event) => {
      event.preventDefault();
      event.stopPropagation();
      const node = event.target;
      if (node.hasClass('killchain-node')) {
        const host = hosts.find(h => h.id === node.id());
        if (host && onNodeSelectRef.current) {
          // Marquer comme sélection interne
          isInternalSelection.current = true;
          
          // Sélectionner visuellement le nœud SANS centrer
          cy.nodes().unselect();
          node.select();
          
          // Appeler la fonction de callback
          onNodeSelectRef.current(host);
          
          // Réinitialiser le flag après un délai
          setTimeout(() => {
            isInternalSelection.current = false;
          }, 100);
        }
      }
    });

    cy.on('mouseover', 'node', (event) => {
      const node = event.target;
      if (node.hasClass('killchain-node')) {
        setHoveredNode(node.id());
      }
    });

    cy.on('mouseout', 'node', () => {
      setHoveredNode(null);
    });

    cyRef.current = cy;

    // Le graph est prêt
    cy.ready(() => {
      console.log('Killchain graph ready');
    });

    return () => {
      if (cyRef.current) {
        cyRef.current.destroy();
        cyRef.current = null;
      }
    };
  }, []); // Seulement au montage du composant

  // Mettre à jour le graphique quand les éléments changent (sans le recréer)
  useEffect(() => {
    if (cyRef.current && graphElements.length > 0) {
      // Vérifier si le graphique existe déjà
      const currentElements = cyRef.current.elements();
      const currentElementIds = new Set(currentElements.map(el => el.id()));
      const newElementIds = new Set(graphElements.map(el => el.data.id));
      
      // Si les éléments sont identiques, ne pas mettre à jour
      if (currentElementIds.size === newElementIds.size && 
          [...currentElementIds].every(id => newElementIds.has(id))) {
        return;
      }
      
      // Mettre à jour les éléments sans recréer le graphique
      cyRef.current.elements().remove();
      cyRef.current.add(graphElements);
      
      // Appliquer les positions prédéfinies de manière stable
      cyRef.current.layout({
        name: 'preset',
        positions: (node) => {
          if (node.data('x') && node.data('y')) {
            return { x: node.data('x'), y: node.data('y') };
          }
          return undefined;
        },
        fit: true,
        padding: 80,
        animate: false // Pas d'animation pour un layout statique
      }).run();
    }
  }, [graphElements]);

  // Gérer la sélection externe (quand selectedHost change depuis l'extérieur)
  useEffect(() => {
    if (cyRef.current && selectedHost && !isInternalSelection.current) {
      const selectedNode = cyRef.current.getElementById(selectedHost.id);
      if (selectedNode.length > 0) {
        cyRef.current.nodes().unselect();
        selectedNode.select();
        // Pas de centrage automatique pour éviter de déplacer la vue
      }
    }
  }, [selectedHost]);

  return (
    <div className="relative w-full h-full bg-slate-900">
      {/* Container Cytoscape */}
      <div 
        ref={containerRef} 
        className="w-full h-full"
        style={{ minHeight: '600px' }}
      />
      
      {/* Légende Killchain mode sombre */}
      <div className="absolute top-4 right-4 bg-slate-800/95 backdrop-blur-md rounded-lg p-4 border border-slate-600 shadow-lg">
        <h3 className="text-sm font-semibold text-slate-100 mb-3 flex items-center gap-2">
          <span className="text-purple-400">🔗</span>
          Killchain
        </h3>
        <div className="space-y-3 text-xs">
          <div>
            <h4 className="text-slate-300 font-medium mb-2">Node Types</h4>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#4FC3F7' }}></div>
                <span className="text-slate-300">👤 Users</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#F44336' }}></div>
                <span className="text-slate-300">🖥️ Servers</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#FF9800' }}></div>
                <span className="text-slate-300">💻 Workstations</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#4CAF50' }}></div>
                <span className="text-slate-300">🗄️ Databases</span>
              </div>
            </div>
          </div>
          <div>
            <h4 className="text-slate-300 font-medium mb-2">Connection Types</h4>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <div className="w-4 h-0.5 bg-red-500"></div>
                <span className="text-slate-300">Exploits/Attacks</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-0.5 bg-purple-500"></div>
                <span className="text-slate-300">Admin Access</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-0.5 bg-green-500"></div>
                <span className="text-slate-300">Shares</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-0.5 bg-blue-500"></div>
                <span className="text-slate-300">Web/HTTP</span>
              </div>
            </div>
          </div>
          <div>
            <h4 className="text-slate-300 font-medium mb-2">KillChain Phases</h4>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <div className="w-4 h-2 border-2 border-dashed border-slate-400 rounded"></div>
                <span className="text-slate-300">Attack Phases</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default KillchainVisualization;
