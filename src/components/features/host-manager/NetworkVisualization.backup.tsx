import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Server, 
  Globe, 
  Shield, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  X,
  Plus,
  Minus,
  RotateCcw,
  Eye,
  Settings,
  Network,
  Wifi,
  Database,
  Monitor,
  Smartphone,
  Router,
  Lock,
  Unlock,
  Zap,
  Target,
  MapPin,
  Layers,
  Activity,
  Link,
  Unlink,
  Move,
  Hand,
  RefreshCw
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Host, Category } from '@/types';
import { useHostStore } from '@/stores/hostStore';

interface NetworkNode {
  id: string;
  host: Host;
  x: number;
  y: number;
  connections: string[];
  type: 'server' | 'router' | 'firewall' | 'workstation' | 'mobile' | 'database' | 'unknown';
  status: 'active' | 'inactive' | 'compromised';
  level: number;
  category?: Category;
}

interface NetworkVisualizationProps {
  hosts: Host[];
  categories: Category[];
  onNodeSelect?: (host: Host) => void;
  selectedHost?: Host | null;
  onAddConnection?: (fromHostId: string, toHostId: string) => void;
  onRemoveConnection?: (fromHostId: string, toHostId: string) => void;
  onConnectionsApplied?: () => void;
}

export const NetworkVisualization: React.FC<NetworkVisualizationProps> = ({
  hosts,
  categories,
  onNodeSelect,
  selectedHost,
  onAddConnection,
  onRemoveConnection,
  onConnectionsApplied,
}) => {
  const { networkNodes, updateNetworkNode } = useHostStore();
  const [nodes, setNodes] = useState<NetworkNode[]>([]);
  const [connections, setConnections] = useState<{ from: string; to: string; type: string; cause?: string }[]>([]);
  const [draggedNode, setDraggedNode] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
  const [showLegend, setShowLegend] = useState(true);
  const [showGrid, setShowGrid] = useState(true);
  const [autoLayout, setAutoLayout] = useState(true);
  const [showConnectionMenu, setShowConnectionMenu] = useState<string | null>(null);
  const [interactionMode, setInteractionMode] = useState<'select' | 'pan' | 'connect'>('select');
  const canvasRef = useRef<HTMLDivElement>(null);

  // Déterminer le type d'appareil basé sur l'OS et les services
  const getDeviceType = (host: Host): NetworkNode['type'] => {
    const os = host.os?.toLowerCase() || '';
    const hostname = host.hostname?.toLowerCase() || '';
    
    if (os.includes('router') || hostname.includes('router')) return 'router';
    if (os.includes('firewall') || hostname.includes('fw')) return 'firewall';
    if (os.includes('mobile') || os.includes('android') || os.includes('ios')) return 'mobile';
    if (os.includes('database') || hostname.includes('db')) return 'database';
    if (os.includes('windows') && hostname.includes('ws')) return 'workstation';
    if (os.includes('server') || hostname.includes('srv')) return 'server';
    
    return 'unknown';
  };

  // Obtenir l'icône pour le type d'appareil
  const getDeviceIcon = (type: NetworkNode['type']) => {
    switch (type) {
      case 'server': return Server;
      case 'router': return Router;
      case 'firewall': return Shield;
      case 'workstation': return Monitor;
      case 'mobile': return Smartphone;
      case 'database': return Database;
      default: return Globe;
    }
  };

  // Obtenir la couleur pour le statut
  const getStatusColor = (status: NetworkNode['status']) => {
    switch (status) {
      case 'active': return 'text-green-400';
      case 'compromised': return 'text-orange-400';
      case 'inactive': return 'text-slate-400';
      default: return 'text-slate-400';
    }
  };

  // Obtenir la couleur de fond pour le statut
  const getStatusBgColor = (status: NetworkNode['status']) => {
    switch (status) {
      case 'active': return 'bg-green-500/20';
      case 'compromised': return 'bg-orange-500/20';
      case 'inactive': return 'bg-slate-500/20';
      default: return 'bg-slate-500/20';
    }
  };

  // Obtenir la couleur de catégorie
  const getCategoryColor = (categoryId?: string) => {
    if (!categoryId) return 'border-slate-600';
    const category = categories.find(cat => cat.id === categoryId);
    return category?.color ? `border-[${category.color}]` : 'border-slate-600';
  };

  // Obtenir la couleur de fond de catégorie
  const getCategoryBgColor = (categoryId?: string) => {
    if (!categoryId) return 'bg-slate-700/20';
    const category = categories.find(cat => cat.id === categoryId);
    return category?.color ? `bg-[${category.color}]/20` : 'bg-slate-700/20';
  };

  // Initialiser les nœuds et connexions
  useEffect(() => {
    if (hosts.length > 0) {
      // Créer ou mettre à jour les nœuds en préservant les positions existantes
      const newNodes: NetworkNode[] = hosts.map((host, index) => {
        const existingNode = nodes.find(n => n.id === host.id);
        const category = categories.find(cat => cat.id === host.category);
        
        if (existingNode) {
          // Préserver la position et le niveau existants
          return {
            ...existingNode,
            host, // Mettre à jour les données du host
            status: host.status,
            category,
          };
        } else {
          // Vérifier s'il y a des données persistées
          const persistedNode = networkNodes[host.id];
          let x, y, level;
          
          if (persistedNode) {
            // Utiliser les données persistées
            x = persistedNode.x;
            y = persistedNode.y;
            level = persistedNode.level;
          } else {
            // Nouveau nœud : position en spirale pour éviter les chevauchements
            const centerX = 400;
            const centerY = 300;
            const baseRadius = 200;
            const radiusIncrement = 80;
            const angleIncrement = Math.PI / 4;
            
            const radius = baseRadius + Math.floor(index / 8) * radiusIncrement;
            const angle = (index % 8) * angleIncrement + (index * 0.1); // Léger décalage pour éviter l'alignement parfait
            
            x = Math.cos(angle) * radius + centerX;
            y = Math.sin(angle) * radius + centerY;
            level = Math.floor(Math.random() * 3) + 1;
          }
          
          return {
            id: host.id,
            host,
            x,
            y,
            connections: [],
            type: getDeviceType(host),
            status: host.status,
            level,
            category,
          };
        }
      });
      
      setNodes(newNodes);
      
      // Synchroniser les connexions depuis les hôtes
      const allConnections: { from: string; to: string; type: string; cause?: string }[] = [];
      
      hosts.forEach(host => {
        // Connexions sortantes
        host.outgoingConnections?.forEach(conn => {
          // Vérifier que l'hôte de destination existe
          const targetHost = hosts.find(h => h.id === conn.toHostId || h.ip === conn.toHostId);
          if (targetHost) {
            allConnections.push({
              from: host.id,
              to: targetHost.id,
              type: 'outgoing',
              cause: conn.cause,
            });
          }
        });
        
        // Connexions entrantes
        host.incomingConnections?.forEach(conn => {
          // Vérifier que l'hôte source existe
          const sourceHost = hosts.find(h => h.id === conn.fromHostId || h.ip === conn.fromHostId);
          if (sourceHost) {
            allConnections.push({
              from: sourceHost.id,
              to: host.id,
              type: 'incoming',
              cause: conn.cause,
            });
          }
        });
      });
      
      console.log('Connexions initialisées:', allConnections);
      setConnections(allConnections);
    }
  }, [hosts, categories]);

  // Gestion du drag & drop amélioré
  const handleMouseDown = (nodeId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    
    if (interactionMode !== 'select') return; // Ne permettre le drag que en mode select
    
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return;
    
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    // Position de la souris relative au canvas
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    // Position actuelle du nœud (déjà transformée)
    const nodeScreenX = (node.x * zoom) + pan.x;
    const nodeScreenY = (node.y * zoom) + pan.y;
    
    // Calculer l'offset entre la souris et le centre du nœud
    setDragOffset({ 
      x: mouseX - nodeScreenX, 
      y: mouseY - nodeScreenY 
    });
    setDraggedNode(nodeId);
    setIsDragging(true);
    
    console.log('Drag started for node:', nodeId, 'at position:', {x: node.x, y: node.y});
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    // Panning seulement si on ne fait pas de drag & drop
    if (isPanning && !draggedNode) {
      setPan(prev => ({
        x: prev.x + e.movementX,
        y: prev.y + e.movementY
      }));
    }
  };

  const handleMouseUp = () => {
    setDraggedNode(null);
    setIsDragging(false);
    setIsPanning(false);
  };

  // Ajouter les événements globaux pour le drag & drop
  useEffect(() => {
    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (draggedNode && canvasRef.current) {
        const rect = canvasRef.current.getBoundingClientRect();
        
        // Position de la souris relative au canvas
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        
        // Nouvelle position en coordonnées du monde
        const worldX = (mouseX - dragOffset.x - pan.x) / zoom;
        const worldY = (mouseY - dragOffset.y - pan.y) / zoom;
        
        console.log('Dragging to:', {worldX, worldY, mouseX, mouseY, dragOffset, pan, zoom});
        
        setNodes(prev => prev.map(node => 
          node.id === draggedNode 
            ? { ...node, x: worldX, y: worldY }
            : node
        ));
        
        // Persister la position avec un délai pour éviter trop d'appels
        if (updateNetworkNode) {
          updateNetworkNode(draggedNode, { x: worldX, y: worldY });
        }
      }
    };

    const handleGlobalMouseUp = () => {
      setDraggedNode(null);
      setIsDragging(false);
      setIsPanning(false);
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleGlobalMouseMove);
      document.addEventListener('mouseup', handleGlobalMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleGlobalMouseMove);
      document.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [draggedNode, isDragging, dragOffset, pan, zoom, updateNetworkNode]);

  // Gestion du zoom et pan
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setZoom(prev => Math.max(0.1, Math.min(3, prev * delta)));
  };

  const handleMouseDownCanvas = (e: React.MouseEvent) => {
    if (e.button === 0 && interactionMode === 'pan') { // Clic gauche en mode pan
      setIsPanning(true);
    } else if (e.button === 1) { // Bouton du milieu
      setIsPanning(true);
    }
  };

  const handleMouseMoveCanvas = (e: React.MouseEvent) => {
    if (isPanning && !draggedNode) {
      setPan(prev => ({
        x: prev.x + e.movementX,
        y: prev.y + e.movementY
      }));
    }
  };

  // Layout automatique avec chemin d'attaque
  const applyAutoLayout = () => {
    // Trier les nœuds par niveau de compromission (du plus faible au plus élevé)
    const sortedNodes = [...nodes].sort((a, b) => a.level - b.level);
    
    const newNodes = sortedNodes.map((node, index) => {
      // Créer un chemin d'attaque en spirale pour éviter les chevauchements
      const centerX = 400;
      const centerY = 300;
      const radius = 200 + index * 50; // Rayon croissant
      const angle = (index * Math.PI / 3) + (node.level * Math.PI / 6); // Angle avec décalage par niveau
      
      const x = centerX + Math.cos(angle) * radius;
      const y = centerY + Math.sin(angle) * radius;
      
      // Persister la nouvelle position
      updateNetworkNode(node.id, { x, y });
      
      return { ...node, x, y };
    });
    setNodes(newNodes);
  };

  // Reset view
  const resetView = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  const centerView = () => {
    if (nodes.length === 0) return;
    
    // Calculer le centre de tous les nœuds
    const centerX = nodes.reduce((sum, node) => sum + node.x, 0) / nodes.length;
    const centerY = nodes.reduce((sum, node) => sum + node.y, 0) / nodes.length;
    
    // Centrer la vue
    const canvasWidth = canvasRef.current?.clientWidth || 800;
    const canvasHeight = canvasRef.current?.clientHeight || 600;
    
    setPan({
      x: canvasWidth / 2 - centerX,
      y: canvasHeight / 2 - centerY,
    });
  };

  // Gestion des connexions
  const handleAddConnection = (fromHostId: string, toHostId: string) => {
    const newConnection = { from: fromHostId, to: toHostId, type: 'manual' };
    setConnections(prev => [...prev, newConnection]);
    
    // Synchroniser avec la sidebar en ajoutant la connexion au host
    const fromHost = hosts.find(h => h.id === fromHostId);
    if (fromHost) {
      const updatedConnections = [...(fromHost.outgoingConnections || []), {
        fromHostId,
        toHostId,
        type: 'outgoing' as const,
        cause: 'Connexion manuelle',
        method: 'manual',
        timestamp: new Date().toISOString(),
      }];
      
      // Mettre à jour le host via le store
      const { updateHost } = useHostStore.getState();
      updateHost(fromHostId, { outgoingConnections: updatedConnections });
    }
    
    onAddConnection?.(fromHostId, toHostId);
    setShowConnectionMenu(null);
  };

  const handleRemoveConnection = (fromHostId: string, toHostId: string) => {
    setConnections(prev => prev.filter(conn => 
      !(conn.from === fromHostId && conn.to === toHostId)
    ));
    
    // Synchroniser avec la sidebar en supprimant la connexion du host
    const fromHost = hosts.find(h => h.id === fromHostId);
    if (fromHost) {
      const updatedConnections = (fromHost.outgoingConnections || []).filter(
        conn => conn.toHostId !== toHostId
      );
      
      // Mettre à jour le host via le store
      const { updateHost } = useHostStore.getState();
      updateHost(fromHostId, { outgoingConnections: updatedConnections });
    }
    
    onRemoveConnection?.(fromHostId, toHostId);
  };

  // Forcer la mise à jour des connexions
  const forceUpdateConnections = () => {
    const allConnections: { from: string; to: string; type: string; cause?: string }[] = [];
    
    hosts.forEach(host => {
      // Connexions sortantes
      host.outgoingConnections?.forEach(conn => {
        // Vérifier que l'hôte de destination existe
        const targetHost = hosts.find(h => h.id === conn.toHostId || h.ip === conn.toHostId);
        if (targetHost) {
          allConnections.push({
            from: host.id,
            to: targetHost.id,
            type: 'outgoing',
            cause: conn.cause,
          });
        }
      });
      
      // Connexions entrantes
      host.incomingConnections?.forEach(conn => {
        // Vérifier que l'hôte source existe
        const sourceHost = hosts.find(h => h.id === conn.fromHostId || h.ip === conn.fromHostId);
        if (sourceHost) {
          allConnections.push({
            from: sourceHost.id,
            to: host.id,
            type: 'incoming',
            cause: conn.cause,
          });
        }
      });
    });
    
    console.log('Connexions mises à jour:', allConnections);
    setConnections(allConnections);
    onConnectionsApplied?.();
  };

  // Exposer la fonction via useEffect
  useEffect(() => {
    if (onConnectionsApplied) {
      forceUpdateConnections();
    }
  }, [hosts]);

  // Écouter les événements de mise à jour
  useEffect(() => {
    const handleUpdateConnections = () => {
      console.log('Événement updateNetworkConnections reçu');
      forceUpdateConnections();
    };

    window.addEventListener('updateNetworkConnections', handleUpdateConnections);
    
    return () => {
      window.removeEventListener('updateNetworkConnections', handleUpdateConnections);
    };
  }, [hosts]);

  // Mettre à jour les connexions quand les hosts changent
  useEffect(() => {
    if (hosts.length > 0) {
      forceUpdateConnections();
    }
  }, [hosts]);

  return (
    <div className="h-full bg-slate-900 relative overflow-hidden">
      {/* Toolbar */}
      <div className="absolute top-4 left-4 z-10 flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setZoom(prev => Math.min(3, prev + 0.1))}
          className="bg-slate-800 border-slate-600 text-slate-200 hover:bg-slate-700"
        >
          <Plus className="w-4 h-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setZoom(prev => Math.max(0.1, prev - 0.1))}
          className="bg-slate-800 border-slate-600 text-slate-200 hover:bg-slate-700"
        >
          <Minus className="w-4 h-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={resetView}
          className="bg-slate-800 border-slate-600 text-slate-200 hover:bg-slate-700"
        >
          <RotateCcw className="w-4 h-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={centerView}
          className="bg-slate-800 border-slate-600 text-slate-200 hover:bg-slate-700"
        >
          <Target className="w-4 h-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowLegend(!showLegend)}
          className="bg-slate-800 border-slate-600 text-slate-200 hover:bg-slate-700"
        >
          <Eye className="w-4 h-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowGrid(!showGrid)}
          className="bg-slate-800 border-slate-600 text-slate-200 hover:bg-slate-700"
        >
          <Layers className="w-4 h-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={applyAutoLayout}
          className="bg-slate-800 border-slate-600 text-slate-200 hover:bg-slate-700"
        >
          <Network className="w-4 h-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={forceUpdateConnections}
          className="bg-slate-800 border-slate-600 text-slate-200 hover:bg-slate-700"
        >
          <RefreshCw className="w-4 h-4" />
        </Button>
      </div>

      {/* Interaction Mode Controls */}
      <div className="absolute top-4 right-4 z-10 flex gap-2">
        <Button
          variant={interactionMode === 'select' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setInteractionMode('select')}
          className={interactionMode === 'select' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-slate-800 border-slate-600 text-slate-200 hover:bg-slate-700'}
          title="Mode Sélection - Cliquer et glisser pour déplacer les nœuds"
        >
          <Hand className="w-4 h-4 mr-1" />
          {interactionMode === 'select' && <span className="text-xs">Drag & Drop</span>}
        </Button>
        <Button
          variant={interactionMode === 'pan' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setInteractionMode('pan')}
          className={interactionMode === 'pan' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-slate-800 border-slate-600 text-slate-200 hover:bg-slate-700'}
        >
          <Move className="w-4 h-4" />
        </Button>
        <Button
          variant={interactionMode === 'connect' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setInteractionMode('connect')}
          className={interactionMode === 'connect' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-slate-800 border-slate-600 text-slate-200 hover:bg-slate-700'}
        >
          <Link className="w-4 h-4" />
        </Button>
      </div>

      {/* Canvas */}
      <div
        ref={canvasRef}
        className={`w-full h-full relative ${interactionMode === 'pan' ? 'cursor-grab active:cursor-grabbing' : 'cursor-default'}`}
        onMouseDown={handleMouseDownCanvas}
        onMouseMove={handleMouseMoveCanvas}
        onMouseUp={handleMouseUp}
        onWheel={handleWheel}
      >
        {/* Grid */}
        {showGrid && (
          <svg className="absolute inset-0 w-full h-full pointer-events-none">
            <defs>
              <pattern id="grid" width="50" height="50" patternUnits="userSpaceOnUse">
                <path d="M 50 0 L 0 0 0 50" fill="none" stroke="rgba(148, 163, 184, 0.1)" strokeWidth="1"/>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>
        )}

        {/* Connections */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 1 }}>
          {connections.map((connection, index) => {
            const fromNode = nodes.find(n => n.id === connection.from);
            const toNode = nodes.find(n => n.id === connection.to);
            
            if (!fromNode || !toNode) return null;
            
            // Calculer les points de connexion au bord des nœuds
            const nodeRadius = 32; // Rayon du nœud
            const dx = toNode.x - fromNode.x;
            const dy = toNode.y - fromNode.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance === 0) return null;
            
            // Normaliser le vecteur de direction
            const unitX = dx / distance;
            const unitY = dy / distance;
            
            // Points de connexion au bord des nœuds
            const fromX = (fromNode.x + unitX * nodeRadius) * zoom + pan.x;
            const fromY = (fromNode.y + unitY * nodeRadius) * zoom + pan.y;
            const toX = (toNode.x - unitX * nodeRadius) * zoom + pan.x;
            const toY = (toNode.y - unitY * nodeRadius) * zoom + pan.y;
            
            const midX = (fromX + toX) / 2;
            const midY = (fromY + toY) / 2;
            
            return (
              <g key={index}>
                <line
                  x1={fromX}
                  y1={fromY}
                  x2={toX}
                  y2={toY}
                  stroke="rgba(59, 130, 246, 0.9)"
                  strokeWidth="4"
                  markerEnd="url(#arrowhead)"
                  filter="drop-shadow(0 0 4px rgba(59, 130, 246, 0.5))"
                />
                {connection.cause && (
                  <g>
                    <rect
                      x={midX - 60}
                      y={midY - 15}
                      width="120"
                      height="30"
                      fill="rgba(15, 23, 42, 0.98)"
                      stroke="rgba(59, 130, 246, 0.9)"
                      strokeWidth="2"
                      rx="4"
                      filter="drop-shadow(0 0 6px rgba(0, 0, 0, 0.7))"
                    />
                    <text
                      x={midX}
                      y={midY + 4}
                      textAnchor="middle"
                      fill="rgba(59, 130, 246, 1)"
                      fontSize="10"
                      fontFamily="monospace"
                      fontWeight="bold"
                      style={{ pointerEvents: 'none' }}
                      filter="drop-shadow(0 0 2px rgba(0, 0, 0, 0.8))"
                    >
                      {connection.cause.length > 15 ? connection.cause.substring(0, 12) + '...' : connection.cause}
                    </text>
                  </g>
                )}
              </g>
            );
          })}
          <defs>
            <marker
              id="arrowhead"
              markerWidth="10"
              markerHeight="7"
              refX="9"
              refY="3.5"
              orient="auto"
            >
              <polygon points="0 0, 10 3.5, 0 7" fill="rgba(59, 130, 246, 0.8)" />
            </marker>
          </defs>
        </svg>

        {/* Nodes */}
        <div
          className="absolute inset-0"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: '0 0',
            zIndex: 2,
          }}
        >
          {nodes.map((node) => {
            const IconComponent = getDeviceIcon(node.type);
            const isSelected = selectedHost?.id === node.id;
            
            return (
              <motion.div
                key={node.id}
                className={`absolute cursor-grab select-none ${
                  isSelected ? 'ring-2 ring-blue-500' : ''
                } ${isDragging && draggedNode === node.id ? 'cursor-grabbing' : ''}`}
                style={{
                  left: (node.x * zoom) + pan.x - 32,
                  top: (node.y * zoom) + pan.y - 32,
                  transform: `scale(${zoom})`,
                  transformOrigin: 'center',
                }}
                onMouseDown={(e) => handleMouseDown(node.id, e)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={(e) => {
                  if (!isDragging) {
                    onNodeSelect?.(node.host);
                  }
                }}
              >
                <div className={`
                  w-16 h-16 rounded-lg border-2 flex items-center justify-center
                  ${getStatusBgColor(node.status)}
                  ${getCategoryBgColor(node.category?.id)}
                  ${isSelected ? 'border-blue-500' : getCategoryColor(node.category?.id)}
                  hover:border-blue-400 transition-colors shadow-lg
                `}>
                  <IconComponent className={`w-8 h-8 ${getStatusColor(node.status)}`} />
                  
                  {/* Connection Menu Button */}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute -top-2 -right-2 w-6 h-6 p-0 bg-slate-800 border border-slate-600 hover:bg-slate-700"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowConnectionMenu(showConnectionMenu === node.id ? null : node.id);
                    }}
                  >
                    <Link className="w-3 h-3 text-slate-300" />
                  </Button>
                </div>
                
                {/* Node Label */}
                <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2">
                  <div className="bg-slate-800 border border-slate-600 rounded px-2 py-1 text-xs whitespace-nowrap shadow-lg backdrop-blur-sm">
                    <div className="font-mono text-slate-200 font-bold">{node.host.ip}</div>
                    {node.host.hostname && (
                      <div className="text-slate-400 text-xs">{node.host.hostname}</div>
                    )}
                    {node.category && (
                      <div className="text-xs text-blue-400 font-semibold">{node.category.name}</div>
                    )}
                  </div>
                </div>

                {/* Status Indicator */}
                <div className="absolute -top-1 -right-1">
                  <div className={`
                    w-3 h-3 rounded-full border-2 border-slate-800
                    ${node.status === 'active' ? 'bg-green-500' :
                      node.status === 'compromised' ? 'bg-orange-500' :
                      'bg-slate-500'}
                  `} />
                </div>

                {/* Security Level Indicator */}
                <div className="absolute -bottom-1 -left-1">
                  <div 
                    className="text-xs rounded-full w-6 h-6 flex items-center justify-center font-bold cursor-pointer hover:scale-110 transition-transform"
                    style={{
                      backgroundColor: node.level === 1 ? '#10b981' : node.level === 2 ? '#f59e0b' : '#ef4444',
                      color: 'white'
                    }}
                    title={`Niveau de sécurité: ${node.level === 1 ? 'Faible' : node.level === 2 ? 'Moyen' : 'Élevé'}`}
                                         onClick={() => {
                       // Cycle through security levels
                       const newLevel = node.level === 1 ? 2 : node.level === 2 ? 3 : 1;
                       setNodes(prev => prev.map(n => 
                         n.id === node.id ? { ...n, level: newLevel } : n
                       ));
                       // Persister le niveau
                       updateNetworkNode(node.id, { level: newLevel });
                     }}
                  >
                    {node.level === 1 ? '🛡️' : node.level === 2 ? '⚠️' : '🚨'}
                  </div>
                </div>

                {/* Connection Menu */}
                <AnimatePresence>
                  {showConnectionMenu === node.id && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      className="absolute top-full left-0 mt-2 z-50"
                    >
                      <Card className="w-64 bg-slate-800 border-slate-600">
                        <CardHeader>
                          <CardTitle className="text-sm text-slate-200">Connexions sortantes</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                          {nodes
                            .filter(otherNode => otherNode.id !== node.id)
                            .map(otherNode => {
                              const isConnected = connections.some(conn => 
                                conn.from === node.id && conn.to === otherNode.id
                              );
                              
                              return (
                                <div key={otherNode.id} className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <div className={`w-3 h-3 rounded-full ${getCategoryBgColor(otherNode.category?.id)}`} />
                                    <span className="text-xs text-slate-300">{otherNode.host.ip}</span>
                                  </div>
                                  <Button
                                    variant={isConnected ? "destructive" : "outline"}
                                    size="sm"
                                    onClick={() => {
                                      if (isConnected) {
                                        handleRemoveConnection(node.id, otherNode.id);
                                      } else {
                                        handleAddConnection(node.id, otherNode.id);
                                      }
                                    }}
                                    className={isConnected ? "bg-red-600 hover:bg-red-700" : "bg-slate-700 border-slate-600 hover:bg-slate-600"}
                                  >
                                    {isConnected ? <Unlink className="w-3 h-3" /> : <Link className="w-3 h-3" />}
                                  </Button>
                                </div>
                              );
                            })}
                        </CardContent>
                      </Card>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <AnimatePresence>
        {showLegend && (
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="absolute bottom-4 right-4 z-10"
          >
            <Card className="w-80 bg-slate-800 border-slate-600 max-h-96 overflow-y-auto">
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2 text-slate-200">
                  <Activity className="w-4 h-4" />
                  Légende Réseau
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Interaction Modes */}
                <div>
                  <h4 className="text-xs font-semibold text-slate-300 mb-2">Modes d'Interaction</h4>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-xs">
                      <Hand className="w-3 h-3 text-blue-400" />
                      <span className="text-slate-300">Sélection/Déplacement</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <Move className="w-3 h-3 text-green-400" />
                      <span className="text-slate-300">Navigation</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <Link className="w-3 h-3 text-purple-400" />
                      <span className="text-slate-300">Connexions</span>
                    </div>
                  </div>
                </div>

                {/* Categories */}
                <div>
                  <h4 className="text-xs font-semibold text-slate-300 mb-2">Catégories</h4>
                  <div className="space-y-1">
                    {categories.map((category) => (
                      <div key={category.id} className="flex items-center gap-2 text-xs">
                        <div 
                          className="w-3 h-3 rounded border"
                          style={{ backgroundColor: `${category.color}20`, borderColor: category.color }}
                        />
                        <span className="text-slate-300">{category.name}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Device Types */}
                <div>
                  <h4 className="text-xs font-semibold text-slate-300 mb-2">Types d'Appareils</h4>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { type: 'server', label: 'Serveur', icon: Server },
                      { type: 'router', label: 'Routeur', icon: Router },
                      { type: 'firewall', label: 'Firewall', icon: Shield },
                      { type: 'workstation', label: 'Station', icon: Monitor },
                      { type: 'mobile', label: 'Mobile', icon: Smartphone },
                      { type: 'database', label: 'Base de données', icon: Database },
                    ].map(({ type, label, icon: Icon }) => (
                      <div key={type} className="flex items-center gap-2 text-xs">
                        <Icon className="w-4 h-4 text-blue-400" />
                        <span className="text-slate-300">{label}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Status */}
                <div>
                  <h4 className="text-xs font-semibold text-slate-300 mb-2">Statuts</h4>
                  <div className="space-y-1">
                    {[
                      { status: 'active', label: 'Actif', color: 'bg-green-500' },
                      { status: 'compromised', label: 'Compromis', color: 'bg-orange-500' },
                      { status: 'inactive', label: 'Inactif', color: 'bg-slate-500' },
                    ].map(({ status, label, color }) => (
                      <div key={status} className="flex items-center gap-2 text-xs">
                        <div className={`w-3 h-3 rounded-full ${color}`} />
                        <span className="text-slate-300">{label}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Security Levels */}
                <div>
                  <h4 className="text-xs font-semibold text-slate-300 mb-2">Niveaux de Sécurité</h4>
                  <div className="text-xs text-slate-400 space-y-1">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded-full bg-green-500 flex items-center justify-center text-xs">🛡️</div>
                      <span>Faible (1)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded-full bg-yellow-500 flex items-center justify-center text-xs">⚠️</div>
                      <span>Moyen (2)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded-full bg-red-500 flex items-center justify-center text-xs">🚨</div>
                      <span>Élevé (3)</span>
                    </div>
                    <div className="text-xs text-slate-500 mt-2">Clic pour changer le niveau</div>
                  </div>
                </div>

                {/* Controls */}
                <div>
                  <h4 className="text-xs font-semibold text-slate-300 mb-2">Contrôles</h4>
                  <div className="text-xs text-slate-400 space-y-1">
                    <div>• Clic gauche : Sélectionner un nœud</div>
                    <div>• Drag & drop : Déplacer les nœuds</div>
                    <div>• Molette : Zoom</div>
                    <div>• Mode pan : Déplacer la vue</div>
                    <div>• Bouton lien : Gérer les connexions</div>
                    <div>• Indicateur de sécurité : Clic pour changer</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Zoom Level Indicator */}
      <div className="absolute bottom-4 right-4 z-10">
        <Card className="px-3 py-2 bg-slate-800 border-slate-600">
          <div className="text-xs text-slate-300">
            Zoom: {Math.round(zoom * 100)}%
          </div>
        </Card>
      </div>
    </div>
  );
};
