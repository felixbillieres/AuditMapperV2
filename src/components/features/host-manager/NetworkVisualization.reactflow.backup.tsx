import React, { useState, useCallback, useEffect } from 'react';
import ReactFlow, {
  Node,
  Edge,
  addEdge,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  Connection,
  EdgeTypes,
  NodeTypes,
  ReactFlowProvider,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { 
  Server, 
  Globe, 
  AlertTriangle, 
  Database,
  Monitor,
  Smartphone,
  Router,
  Unlock,
  Eye,
  RotateCcw,
  Plus,
  Minus,
  Link,
  Unlink,
  Target,
  Shield,
  Zap,
  Network,
  Activity,
  CheckCircle,
  Clock
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Host, Category } from '@/types';
import { useHostStore } from '@/stores/hostStore';

// Custom Node Component
const HostNode = ({ data }: { data: any }) => {
  const { host, category, onSelect } = data;
  
  // Déterminer l'icône basée sur l'OS et le type
  const getIcon = () => {
    const os = host.os?.toLowerCase() || '';
    if (os.includes('windows')) return Monitor;
    if (os.includes('linux') || os.includes('ubuntu') || os.includes('debian')) return Server;
    if (os.includes('cisco') || os.includes('router')) return Router;
    if (os.includes('android') || os.includes('ios')) return Smartphone;
    if (os.includes('database') || os.includes('sql')) return Database;
    return Globe;
  };

  // Couleur basée sur le statut
  const getStatusColor = () => {
    if (host.isCompromised) return 'text-red-400';
    if (host.isCritical) return 'text-orange-400';
    if (host.status === 'active') return 'text-green-400';
    return 'text-gray-400';
  };

  // Couleur de bordure basée sur la catégorie
  const getCategoryColor = () => {
    if (!category) return 'border-gray-600';
    const colors = {
      'externe': 'border-red-500',
      'interne': 'border-blue-500',
      'dmz': 'border-yellow-500',
      'critique': 'border-orange-500',
    };
    return colors[category.name?.toLowerCase() as keyof typeof colors] || 'border-purple-500';
  };

  const Icon = getIcon();

  return (
    <div 
      className={`
        px-4 py-3 bg-slate-800 rounded-lg border-2 
        ${getCategoryColor()} 
        hover:bg-slate-700 transition-colors cursor-pointer
        min-w-[120px] text-center shadow-lg
      `}
      onClick={() => onSelect?.(host)}
    >
      <div className="flex flex-col items-center gap-2">
        <div className="flex items-center gap-2">
          <Icon className={`w-5 h-5 ${getStatusColor()}`} />
          {host.isCompromised && <Unlock className="w-4 h-4 text-red-400" />}
          {host.isCritical && <AlertTriangle className="w-4 h-4 text-orange-400" />}
        </div>
        <div>
          <div className="text-sm font-mono text-slate-100">{host.ip}</div>
          <div className="text-xs text-slate-400 truncate max-w-[100px]">
            {host.hostname || 'Sans nom'}
          </div>
          <div className="text-xs text-slate-500">
            {host.os || 'Unknown'}
          </div>
        </div>
      </div>
      
      {/* Indicateurs */}
      <div className="flex justify-center gap-1 mt-2">
        {host.credentials?.usernames?.length > 0 && (
          <div className="w-2 h-2 bg-green-400 rounded-full" title="Credentials" />
        )}
        {host.vulnerabilities?.length > 0 && (
          <div className="w-2 h-2 bg-orange-400 rounded-full" title="Vulnérabilités" />
        )}
        {host.exploitationSteps?.length > 0 && (
          <div className="w-2 h-2 bg-red-400 rounded-full" title="Exploitation" />
        )}
        {host.screenshots?.length > 0 && (
          <div className="w-2 h-2 bg-blue-400 rounded-full" title="Screenshots" />
        )}
      </div>
    </div>
  );
};

// Types de nœuds personnalisés
const nodeTypes: NodeTypes = {
  hostNode: HostNode,
};

// Utilisons les arêtes par défaut de React Flow pour simplifier

// Types d'arêtes personnalisés (vide pour utiliser les defaults)
const edgeTypes: EdgeTypes = {};

interface NetworkVisualizationProps {
  hosts: Host[];
  categories: Category[];
  onNodeSelect?: (host: Host) => void;
  selectedHost?: Host | null;
  onAddConnection?: (fromId: string, toId: string, type: string) => void;
  onRemoveConnection?: (fromId: string, toId: string) => void;
  onConnectionsApplied?: () => void;
}

const NetworkVisualizationInner: React.FC<NetworkVisualizationProps> = ({
  hosts,
  categories,
  onNodeSelect,
  onAddConnection,
}) => {
  const { networkNodes, updateNetworkNode } = useHostStore();
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [showLegend, setShowLegend] = useState(true);
  const [showConnections, setShowConnections] = useState(true);

  // Convertir les hosts en nœuds React Flow
  useEffect(() => {
    const newNodes: Node[] = hosts.map((host, index) => {
      // Récupérer la position sauvegardée ou générer une position par défaut
      const savedNode = networkNodes[host.id];
      const category = categories.find(c => c.id === host.category);
      
      return {
        id: host.id,
        type: 'hostNode',
        position: savedNode ? { x: savedNode.x, y: savedNode.y } : {
          x: (index % 5) * 200 + 100,
          y: Math.floor(index / 5) * 150 + 100,
        },
        data: {
          host,
          category,
          onSelect: onNodeSelect,
        },
        dragHandle: undefined, // Permet le drag de tout le nœud
      };
    });

    setNodes(newNodes);
  }, [hosts, categories, networkNodes, onNodeSelect, setNodes]);

  // Convertir les connexions en arêtes + créer une connexion de test
  useEffect(() => {
    const newEdges: Edge[] = [];
    
    // Connexion de test si on a au moins 2 hosts
    if (hosts.length >= 2) {
      newEdges.push({
        id: 'test-connection',
        source: hosts[0].id,
        target: hosts[1].id,
        type: 'straight',
        style: { stroke: '#ff0000', strokeWidth: 4 },
        animated: true,
        label: 'TEST CONNEXION'
      });
    }
    
    setEdges(newEdges);
  }, [hosts, setEdges]);

  // Fonction pour ajouter une connexion depuis l'extérieur
  const addConnectionFromOutside = useCallback((sourceId: string, targetId: string) => {
    const newEdge = {
      id: `${sourceId}-${targetId}-${Date.now()}`,
      source: sourceId,
      target: targetId,
      type: 'smoothstep',
      style: { stroke: '#3b82f6', strokeWidth: 2 },
      animated: false,
      markerEnd: { type: 'arrow' },
    };
    
    setEdges((eds) => addEdge(newEdge, eds));
  }, [setEdges]);

  // Exposer la fonction via le prop callback
  React.useEffect(() => {
    if (onAddConnection) {
      // Stocker la fonction pour qu'elle puisse être appelée depuis l'extérieur
      (window as any).addNetworkConnection = addConnectionFromOutside;
    }
  }, [addConnectionFromOutside, onAddConnection]);

  // Gestionnaire de connexion par drag (garde l'ancien comportement)
  const onConnect = useCallback(
    (params: Connection) => {
      if (params.source && params.target) {
        const newEdge = {
          ...params,
          id: `${params.source}-${params.target}`,
          type: 'smoothstep',
          style: { stroke: '#3b82f6', strokeWidth: 2 },
          animated: false,
          markerEnd: {
            type: 'arrowclosed',
            color: '#3b82f6',
          },
        };
        
        setEdges((eds) => addEdge(newEdge, eds));
        onAddConnection?.(params.source, params.target, 'connection');
      }
    },
    [onAddConnection, setEdges]
  );

  // Gestionnaire de fin de drag
  const onNodeDragStop = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      // Sauvegarder la position dans le store
      updateNetworkNode(node.id, {
        x: node.position.x,
        y: node.position.y,
      });
    },
    [updateNetworkNode]
  );

  // Auto-layout automatique
  const handleAutoLayout = () => {
    const layoutedNodes = nodes.map((node, index) => ({
      ...node,
      position: {
        x: (index % 5) * 200 + 100,
        y: Math.floor(index / 5) * 150 + 100,
      },
    }));
    
    setNodes(layoutedNodes);
    
    // Sauvegarder les nouvelles positions
    layoutedNodes.forEach(node => {
      updateNetworkNode(node.id, {
        x: node.position.x,
        y: node.position.y,
      });
    });
  };

  return (
    <div className="w-full h-full relative bg-slate-900">
      {/* Contrôles simplifiés */}
      <div className="absolute top-4 left-4 z-10 flex flex-col gap-2">
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleAutoLayout}
            className="bg-slate-800 border-slate-600 text-slate-200 hover:bg-slate-700"
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Auto-layout
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowLegend(!showLegend)}
            className="bg-slate-800 border-slate-600 text-slate-200 hover:bg-slate-700"
          >
            <Eye className="w-4 h-4 mr-2" />
            Légende
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowConnections(!showConnections)}
            className="bg-slate-800 border-slate-600 text-slate-200 hover:bg-slate-700"
          >
            <Network className="w-4 h-4 mr-2" />
            {showConnections ? 'Masquer' : 'Afficher'} connexions
          </Button>
        </div>
        
        {/* Gestion des connexions */}
        {edges.length > 0 && (
          <div className="flex gap-2 p-2 bg-slate-800 rounded-lg border border-slate-600">
            <span className="text-xs text-slate-400">({edges.length} connexions)</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEdges([])}
              className="bg-red-700 border-red-600 text-red-200 hover:bg-red-600"
            >
              <Unlink className="w-4 h-4 mr-2" />
              Supprimer toutes
            </Button>
          </div>
        )}
      </div>

      {/* React Flow */}
      <ReactFlow
        nodes={nodes}
        edges={showConnections ? edges : []}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeDragStop={onNodeDragStop}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        connectionLineStyle={{ stroke: '#3b82f6', strokeWidth: 2 }}
        defaultEdgeOptions={{ 
          type: 'smoothstep', 
          animated: false, 
          style: { stroke: '#3b82f6', strokeWidth: 2 },
          markerEnd: { type: 'arrow' }
        }}
        fitView
        attributionPosition="bottom-left"
      >
        
        <Background color="#475569" />
        <Controls className="!bg-slate-800 !border-slate-600" />
        <MiniMap 
          className="!bg-slate-800 !border-slate-600"
          nodeColor={(node) => {
            const host = node.data?.host;
            if (host?.isCompromised) return '#ef4444';
            if (host?.isCritical) return '#f97316';
            return '#64748b';
          }}
        />
      </ReactFlow>

      {/* Légende */}
      {showLegend && (
        <Card className="absolute top-4 right-4 z-10 w-72 bg-slate-800 border-slate-600">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-slate-100">Légende Pentest</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-xs">
            {/* Statuts des nœuds */}
            <div>
              <div className="text-slate-200 font-semibold mb-2">Statuts des hosts:</div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-red-400 rounded-full" />
                  <span className="text-slate-300">Compromis</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-orange-400 rounded-full" />
                  <span className="text-slate-300">Critique</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-green-400 rounded-full" />
                  <span className="text-slate-300">Actif</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-gray-400 rounded-full" />
                  <span className="text-slate-300">Inactif</span>
                </div>
              </div>
            </div>

            <hr className="border-slate-600" />

            {/* Types de connexions */}
            <div>
              <div className="text-slate-200 font-semibold mb-2">Connexions:</div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-0.5 bg-red-400" />
                  <span className="text-slate-300">Compromission</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-0.5 bg-orange-400" />
                  <span className="text-slate-300">Mouvement latéral</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-0.5 bg-purple-400" />
                  <span className="text-slate-300">Escalade privilèges</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-0.5 bg-blue-400" />
                  <span className="text-slate-300">Découverte</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-0.5 bg-green-400" />
                  <span className="text-slate-300">Persistance</span>
                </div>
              </div>
            </div>

            <hr className="border-slate-600" />

            {/* Indicateurs */}
            <div>
              <div className="text-slate-200 font-semibold mb-2">Indicateurs:</div>
              <div className="text-slate-400 text-xs">
                🔵 Credentials • 🟠 Vulnérabilités<br/>
                🔴 Exploitation • 🔷 Screenshots
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

// Composant principal avec ReactFlowProvider
const NetworkVisualization: React.FC<NetworkVisualizationProps> = (props) => {
  return (
    <ReactFlowProvider>
      <NetworkVisualizationInner {...props} />
    </ReactFlowProvider>
  );
};

export default NetworkVisualization;