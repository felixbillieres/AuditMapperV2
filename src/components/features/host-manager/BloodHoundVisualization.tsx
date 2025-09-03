import React, { useRef, useEffect, useMemo, useState, useCallback } from 'react';
import cytoscape from 'cytoscape';
import dagre from 'cytoscape-dagre';
import coseBilkent from 'cytoscape-cose-bilkent';
import { Host, Category } from '@/types';

// Enregistrer les extensions
cytoscape.use(dagre);
cytoscape.use(coseBilkent);

interface ClassicVisualizationProps {
  hosts: Host[];
  categories: Category[];
  onNodeSelect?: (host: Host) => void;
  selectedHost?: Host | null;
  showLabels?: boolean;
}

interface NodeType {
  type: 'user' | 'server' | 'workstation' | 'database' | 'router' | 'firewall' | 'mobile' | 'unknown';
  color: string;
  icon: string;
}

const ClassicVisualization: React.FC<ClassicVisualizationProps> = ({
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

  // Mémoriser les éléments du graphe pour éviter les recréations inutiles
  const graphElements = useMemo(() => {
    const elements: cytoscape.ElementDefinition[] = [];

    // Ajouter les nœuds hosts - style BloodHound authentique
    hosts.forEach((host, index) => {
      const deviceType = getDeviceType(host);
      
      // Nœud principal avec emoji et texte
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
          credentials: (host.usernames?.length || 0) + (host.passwords?.length || 0) + (host.hashes?.length || 0)
        },
        classes: 'classic-node'
      });
    });

    // Ajouter les connexions - vérifier que les nœuds source et target existent
    hosts.forEach(host => {
      (host.outgoingConnections || []).forEach((conn, idx) => {
        if (!conn || !conn.toHostId) return;
        
        // Vérifier que les nœuds source et target existent
        const sourceExists = hosts.some(h => h.id === host.id);
        const targetExists = hosts.some(h => h.id === conn.toHostId);
        
        if (sourceExists && targetExists) {
          elements.push({
            group: 'edges',
            data: {
              id: `${host.id}-${conn.toHostId}-${idx}`,
              source: host.id,
              target: conn.toHostId,
              label: conn.cause || '',
              connectionType: conn.cause?.toLowerCase() || 'unknown'
            },
            classes: 'classic-edge'
          });
        }
      });
    });

    return elements;
  }, [hosts, showLabels]);

  // Initialiser Cytoscape une seule fois
  useEffect(() => {
    if (!containerRef.current) return;

    // Nettoyer l'instance précédente
    if (cyRef.current) {
      cyRef.current.destroy();
    }

    // Configuration Cytoscape - Style BloodHound authentique
    const cy = cytoscape({
      container: containerRef.current,
      elements: graphElements,
      style: [
        // Style des nœuds - petits cercles uniformes avec emojis intégrés
        {
          selector: '.classic-node',
          style: {
            'background-color': (ele) => {
              const nodeType = ele.data('nodeType');
              return nodeTypes[nodeType]?.color || '#9E9E9E';
            },
            'width': 40,
            'height': 40,
            'shape': 'ellipse',
            'border-width': 2,
            'border-color': '#ffffff',
            'font-size': '14px',
            'font-weight': 'normal',
            'color': '#ffffff',
            'text-valign': 'center',
            'text-halign': 'center',
            'text-margin-y': 0,
            'text-wrap': 'wrap',
            'text-max-width': '80px',
            'line-height': '1.2',
            'text-outline-width': 1,
            'text-outline-color': '#000000',
            'label': (ele) => ele.data('label')
          }
        },
        // Style des connexions - fines lignes grises avec flèches
        {
          selector: '.classic-edge',
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
            'text-margin-y': -10
          }
        },
        // Style pour les nœuds sélectionnés
        {
          selector: '.classic-node:selected',
          style: {
            'border-width': 2,
            'border-color': '#000000'
          }
        },
        // Style pour les nœuds au survol
        {
          selector: '.classic-node:hover',
          style: {
            'border-width': 2,
            'border-color': '#000000'
          }
        }
      ],
      layout: {
        name: 'cose-bilkent',
        fit: true,
        padding: 80,
        nodeRepulsion: 6000,
        idealEdgeLength: 150,
        edgeElasticity: 0.4,
        nestingFactor: 0.1,
        gravity: 0.2,
        numIter: 2500,
        tile: true,
        animate: true,
        animationDuration: 800,
        randomize: true,
        componentSpacing: 150,
        nodeOverlap: 20,
        refresh: 20,
        quality: 'default'
      },
      userZoomingEnabled: true,
      userPanningEnabled: true,
      boxSelectionEnabled: false,
      selectionType: 'single',
      minZoom: 0.1,
      maxZoom: 3
    });

    // Gestionnaires d'événements
    cy.on('tap', 'node', (event) => {
      event.preventDefault();
      event.stopPropagation();
      const node = event.target;
      if (node.hasClass('classic-node')) {
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
      if (node.hasClass('classic-node')) {
        setHoveredNode(node.id());
      }
    });

    cy.on('mouseout', 'node', () => {
      setHoveredNode(null);
    });

    cyRef.current = cy;

    // Le graph est prêt
    cy.ready(() => {
      console.log('Classic graph ready');
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
      cyRef.current.layout({ name: 'cose-bilkent' }).run();
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
      
      {/* Légende Classic mode sombre */}
      <div className="absolute top-4 right-4 bg-slate-800/95 backdrop-blur-md rounded-lg p-4 border border-slate-600 shadow-lg">
        <h3 className="text-sm font-semibold text-slate-100 mb-3 flex items-center gap-2">
          <span className="text-purple-400">🔍</span>
          Classic Legend
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
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#9C27B0' }}></div>
                <span className="text-slate-300">📡 Routers</span>
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
        </div>
      </div>
    </div>
  );
};

export default ClassicVisualization;

