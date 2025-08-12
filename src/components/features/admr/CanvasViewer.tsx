import React, { useCallback, useEffect, useMemo, useState } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  Node,
  Edge,
  MarkerType,
  Handle,
  Position,
} from 'reactflow';
import 'reactflow/dist/style.css';
import ReactMarkdown from 'react-markdown';
import { useSearchParams, useNavigate } from 'react-router-dom';

type CanvasNode = {
  id: string;
  type: 'text' | 'group' | 'file';
  x: number;
  y: number;
  width?: number;
  height?: number;
  color?: string;
  label?: string;
  text?: string;
  file?: string; // relative path in canvas json
};

type CanvasEdge = {
  id: string;
  fromNode: string;
  toNode: string;
  fromSide?: 'left' | 'right' | 'top' | 'bottom';
  toSide?: 'left' | 'right' | 'top' | 'bottom';
  color?: string;
};

type CanvasJson = {
  nodes: CanvasNode[];
  edges?: CanvasEdge[];
};

// Eagerly import all canvases under /ADMR so Vite bundles them and we get stable URLs
const canvasAssets = import.meta.glob('/ADMR/**/*.canvas', {
  eager: true,
  as: 'url',
}) as Record<string, string>;

function normalizePath(path: string): string {
  // Ensure leading slash, collapse .. and . segments, and keep spaces unencoded for key lookup
  const url = new URL(path.replace(/^\.\//, '/'), 'https://local');
  return decodeURI(url.pathname).replace(/\\/g, '/');
}

function joinPath(baseDir: string, relative: string): string {
  const base = baseDir.endsWith('/') ? baseDir : baseDir + '/';
  const url = new URL(relative, 'https://local' + base);
  return decodeURI(url.pathname);
}

function getDirname(path: string): string {
  const idx = path.lastIndexOf('/');
  if (idx <= 0) return '/';
  return path.slice(0, idx + 1);
}

function getCanvasAssetUrl(logicalPath: string): string | undefined {
  // logicalPath must start with /ADMR/
  const norm = normalizePath(logicalPath);
  return canvasAssets[norm] ?? canvasAssets[decodeURI(norm)] ?? canvasAssets[norm.replace(/%20/g, ' ')];
}

// reserved: sideToPosition is not needed for now as we don't render handles

const nodeBaseClasses =
  'rounded-md border border-dark-700 text-dark-100 shadow-sm';

function colorToClass(color?: string): string {
  if (!color) return 'bg-dark-900';
  // Map known palette quickly; fallback to inline border color
  const map: Record<string, string> = {
    '#1450f0': 'bg-blue-800/40 border-blue-600',
    '#324bff': 'bg-indigo-800/40 border-indigo-600',
    '#aa8c46': 'bg-amber-800/40 border-amber-600',
    '#e178e1': 'bg-pink-800/40 border-pink-600',
    '#e3e3e3': 'bg-gray-700/40 border-gray-500',
    '#32a5ff': 'bg-sky-800/40 border-sky-600',
    '#a5e178': 'bg-lime-800/40 border-lime-600',
    '#96826e': 'bg-yellow-800/40 border-yellow-600',
  };
  return map[color] ?? 'bg-dark-900';
}

function groupColorToClass(color?: string): string {
  if (!color) return 'border-slate-600';
  const map: Record<string, string> = {
    '#1450f0': 'border-blue-500',
    '#324bff': 'border-indigo-500',
    '#aa8c46': 'border-amber-600',
    '#e178e1': 'border-pink-500',
    '#e3e3e3': 'border-gray-400',
    '#32a5ff': 'border-sky-400',
    '#a5e178': 'border-lime-500',
    '#96826e': 'border-yellow-600',
  };
  return map[color] ?? 'border-slate-600';
}

function transformObsidian(text?: string): string {
  if (!text) return '';
  return text
    .replace(/\[!?\s*info\]\s*([^\n]+)/gi, 'ℹ️ $1')
    .replace(/\[!?\s*example\]\s*([^\n]+)/gi, '🧪 $1')
    .replace(/\[!?\s*warning\]\s*([^\n]+)/gi, '⚠️ $1')
    .replace(/\[!?\s*tip\]\s*([^\n]+)/gi, '💡 $1')
    .replace(/\[!?\s*note\]\s*([^\n]+)/gi, '📝 $1');
}

const TextNode: React.FC<{ data: { text?: string; width?: number; height?: number } }>
  = ({ data }) => {
    const { text, width, height } = data;
    const processed = useMemo(() => transformObsidian(text), [text]);
    return (
      <div
        className={`${nodeBaseClasses} bg-dark-900/70 p-4 text-slate-100 text-[26px] leading-relaxed`} 
        style={{ width: width ?? undefined, height: height ?? undefined, overflow: 'auto', wordBreak: 'break-word' }}
      >
        <ReactMarkdown
          components={{
            h1: ({ children }) => (
              <h1 className="text-2xl font-extrabold underline underline-offset-4 decoration-sky-400 mb-2">
                {children}
              </h1>
            ),
            h2: ({ children }) => (
              <h2 className="text-xl font-bold underline underline-offset-4 decoration-slate-500 mb-2">
                {children}
              </h2>
            ),
            h3: ({ children }) => (
              <h3 className="text-lg font-semibold mb-2">
                {children}
              </h3>
            ),
            pre: ({ children }) => (
              <pre className="bg-black/40 p-3 rounded-md overflow-auto">
                {children}
              </pre>
            ),
            code: ({ inline, children }) => (
              inline ? (
                <code className="bg-black/30 px-1.5 py-1 rounded font-mono text-blue-300 text-[22px]">
                  {children}
                </code>
              ) : (
                <code className="font-mono text-[22px]">{children}</code>
              )
            ),
            a: ({ children, href }) => (
              <a href={href} target="_blank" rel="noreferrer" className="text-sky-300 underline">
                {children}
              </a>
            ),
            li: ({ children }) => <li className="ml-4 list-disc">{children}</li>,
          }}
        >
          {processed}
        </ReactMarkdown>
        {/* Invisible handles at 4 sides for edge connections */}
        <Handle id="left" type="source" position={Position.Left} style={{ opacity: 0 }} />
        <Handle id="right" type="source" position={Position.Right} style={{ opacity: 0 }} />
        <Handle id="top" type="source" position={Position.Top} style={{ opacity: 0 }} />
        <Handle id="bottom" type="source" position={Position.Bottom} style={{ opacity: 0 }} />
        <Handle id="left" type="target" position={Position.Left} style={{ opacity: 0 }} />
        <Handle id="right" type="target" position={Position.Right} style={{ opacity: 0 }} />
        <Handle id="top" type="target" position={Position.Top} style={{ opacity: 0 }} />
        <Handle id="bottom" type="target" position={Position.Bottom} style={{ opacity: 0 }} />
      </div>
    );
  };

const GroupNode: React.FC<{ data: { label?: string; width?: number; height?: number; color?: string } }>
  = ({ data }) => {
    const { label, width, height, color } = data;
    return (
      <div
        className={`rounded-md relative border-4 ${groupColorToClass(color)} bg-transparent`} 
        style={{ width: width ?? 300, height: height ?? 200, background: 'transparent' }}
      >
        {label && (
          <div className="absolute top-2 left-2 text-sm font-semibold px-2.5 py-1.5 rounded-md bg-slate-900/85 text-slate-100 border border-slate-700 shadow-lg">
            {label}
          </div>
        )}
        {/* Invisible handles for group boxes too */}
        <Handle id="left" type="source" position={Position.Left} style={{ opacity: 0 }} />
        <Handle id="right" type="source" position={Position.Right} style={{ opacity: 0 }} />
        <Handle id="top" type="source" position={Position.Top} style={{ opacity: 0 }} />
        <Handle id="bottom" type="source" position={Position.Bottom} style={{ opacity: 0 }} />
        <Handle id="left" type="target" position={Position.Left} style={{ opacity: 0 }} />
        <Handle id="right" type="target" position={Position.Right} style={{ opacity: 0 }} />
        <Handle id="top" type="target" position={Position.Top} style={{ opacity: 0 }} />
        <Handle id="bottom" type="target" position={Position.Bottom} style={{ opacity: 0 }} />
      </div>
    );
  };

const FileNode: React.FC<{ data: {
  file: string;
  targetLogicalPath?: string;
  width?: number;
  height?: number;
  color?: string;
  onOpen: (logicalPath: string) => void;
} }>
  = ({ data }) => {
    const { file, targetLogicalPath, width, height, color, onOpen } = data;
    const label = file.split('/').slice(-1)[0];
    const isCanvas = (targetLogicalPath || file).toLowerCase().endsWith('.canvas');
    return (
      <button
        onClick={(e) => { e.stopPropagation(); if (targetLogicalPath) onOpen(targetLogicalPath); }}
        className={`${nodeBaseClasses} ${colorToClass(color)} flex items-center justify-center hover:ring-2 hover:ring-blue-400/70 transition cursor-pointer shadow-md`} 
        style={{ width: width ?? 220, height: height ?? 140 }}
        title={file}
      >
        <span className="text-2xl md:text-3xl font-semibold truncate px-3 text-white drop-shadow">
          {label} {isCanvas ? '↗' : ''}
        </span>
        {/* Invisible handles for file cards */}
        <Handle id="left" type="source" position={Position.Left} style={{ opacity: 0 }} />
        <Handle id="right" type="source" position={Position.Right} style={{ opacity: 0 }} />
        <Handle id="top" type="source" position={Position.Top} style={{ opacity: 0 }} />
        <Handle id="bottom" type="source" position={Position.Bottom} style={{ opacity: 0 }} />
        <Handle id="left" type="target" position={Position.Left} style={{ opacity: 0 }} />
        <Handle id="right" type="target" position={Position.Right} style={{ opacity: 0 }} />
        <Handle id="top" type="target" position={Position.Top} style={{ opacity: 0 }} />
        <Handle id="bottom" type="target" position={Position.Bottom} style={{ opacity: 0 }} />
      </button>
    );
  };

const nodeTypes = {
  text: TextNode,
  group: GroupNode,
  file: FileNode,
};

export const CanvasViewer: React.FC<{ hideInternalHeader?: boolean }> = ({ hideInternalHeader }) => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialPath = searchParams.get('canvas') || '/ADMR/INTERACTIVE-MAP.canvas';
  const [currentLogicalPath, setCurrentLogicalPath] = useState<string>(normalizePath(initialPath));
  const [canvas, setCanvas] = useState<CanvasJson | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const currentDir = useMemo(() => getDirname(currentLogicalPath), [currentLogicalPath]);
  const baseRootDir = '/ADMR/';

  const openCanvas = useCallback((logicalPath: string) => {
    const norm = normalizePath(logicalPath);
    setSearchParams({ canvas: norm });
    setCurrentLogicalPath(norm);
  }, [setSearchParams]);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      setLoading(true);
      setError(null);
      try {
        const url = getCanvasAssetUrl(currentLogicalPath);
        if (!url) throw new Error(`Canvas not found in bundle: ${currentLogicalPath}`);
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status} while loading ${currentLogicalPath}`);
        const data: CanvasJson = await res.json();
        if (!cancelled) setCanvas(data);
      } catch (e: any) {
        if (!cancelled) setError(e?.message || 'Erreur de chargement');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    run();
    return () => { cancelled = true; };
  }, [currentLogicalPath]);

  const rfNodes: Node[] = useMemo(() => {
    if (!canvas) return [];
    return canvas.nodes.map((n) => {
      const common = {
        id: n.id,
        position: { x: n.x, y: n.y },
        draggable: false,
        selectable: false,
      };
      if (n.type === 'text') {
        return {
          ...common,
          type: 'text',
          data: { text: n.text, width: n.width, height: n.height },
        } as Node;
      }
      if (n.type === 'group') {
        return {
          ...common,
          type: 'group',
          data: { label: n.label, width: n.width, height: n.height, color: n.color },
        } as Node;
      }
      // file node
      const targetLogicalPath = n.file
        ? normalizePath(joinPath(baseRootDir, n.file))
        : undefined;
      return {
        ...common,
        type: 'file',
        data: {
          file: n.file || '',
          targetLogicalPath,
          width: n.width,
          height: n.height,
          color: n.color,
          onOpen: (lp: string) => openCanvas(lp),
        },
      } as Node;
    });
  }, [canvas, currentDir, openCanvas]);

  const rfEdges: Edge[] = useMemo(() => {
    if (!canvas?.edges) return [];
    return canvas.edges.map((e) => ({
      id: e.id,
      source: e.fromNode,
      target: e.toNode,
      sourceHandle: e.fromSide,
      targetHandle: e.toSide,
      markerEnd: { type: MarkerType.ArrowClosed, color: '#60a5fa' },
      type: 'straight',
      style: { stroke: e.color || '#60a5fa', strokeWidth: 3.2 },
      animated: true,
    }));
  }, [canvas]);

  const header = (
    <div className="flex items-center justify-between px-4 py-3 border-b border-dark-800 bg-dark-950/80 sticky top-0 z-10">
      <div className="flex items-center gap-2">
        <button
          className="px-2 py-1 rounded bg-dark-800 hover:bg-dark-700 text-sm"
          onClick={() => navigate(-1)}
        >
          ← Retour
        </button>
        <div className="text-sm text-dark-300">{currentLogicalPath.replace('/ADMR/', '')}</div>
      </div>
      <div className="text-sm text-dark-400">Obsidian Canvas Viewer</div>
    </div>
  );

  return (
    <div className="min-h-screen bg-dark-950 text-dark-100 flex flex-col">
      {!hideInternalHeader && header}
      <div className="flex-1">
        {loading && (
          <div className="p-4 text-sm text-dark-300">Chargement…</div>
        )}
        {error && (
          <div className="p-4 text-sm text-red-400">{error}</div>
        )}
        {!loading && !error && (
          <div className="w-full" style={{ height: 'calc(100vh - 56px)' }}>
            <ReactFlow
              key={currentLogicalPath}
              nodes={rfNodes}
              edges={rfEdges}
              nodeTypes={nodeTypes}
              fitView
              fitViewOptions={{ padding: 0.2 }}
              proOptions={{ hideAttribution: true }}
              nodesDraggable={false}
              zoomOnScroll
              panOnScroll
              zoomOnDoubleClick
              minZoom={0.2}
              maxZoom={1.5}
              onInit={(instance) => {
                requestAnimationFrame(() => instance.fitView({ padding: 0.2 }));
              }}
              onNodeClick={(_, n) => {
                if (n.type === 'file') {
                  const lp = (n.data as any)?.targetLogicalPath as string | undefined;
                  if (lp && lp.toLowerCase().endsWith('.canvas')) {
                    openCanvas(lp);
                  }
                }
              }}
            >
              <Background color="#1f2937" gap={28} />
              <MiniMap pannable zoomable nodeStrokeColor={'#93c5fd'} maskColor="rgba(15,23,42,0.8)" />
              <Controls showInteractive={false} />
            </ReactFlow>
          </div>
        )}
      </div>
    </div>
  );
};

export default CanvasViewer;


