import React, { useState } from 'react';
import { useAutoReconStore } from '../../../stores/autoReconStore';
import { Card } from '../../ui/card';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { 
  File, 
  Folder, 
  Search, 
  Download, 
  Eye,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  FileText,
  Code,
  Image,
  Archive,
  Server,
  Terminal
} from 'lucide-react';
import { FileNode } from '../../../types/autorecon';

const FilesPanel: React.FC = () => {
  const { data } = useAutoReconStore();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedDirs, setExpandedDirs] = useState<Set<string>>(new Set());
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'tree' | 'list'>('tree');

  if (!data) return null;

  const { fileStructure, rawFiles } = data;

  const toggleDirectory = (path: string) => {
    const newExpanded = new Set(expandedDirs);
    if (newExpanded.has(path)) {
      newExpanded.delete(path);
    } else {
      newExpanded.add(path);
    }
    setExpandedDirs(newExpanded);
  };

  const getFileIcon = (node: FileNode) => {
    if (node.type === 'directory') {
      return <Folder className="w-4 h-4 text-blue-400" />;
    }

    const ext = node.extension?.toLowerCase();
    switch (ext) {
      case 'txt':
      case 'log':
      case 'md':
        return <FileText className="w-4 h-4 text-green-400" />;
      case 'xml':
      case 'html':
      case 'json':
        return <Code className="w-4 h-4 text-yellow-400" />;
      case 'png':
      case 'jpg':
      case 'jpeg':
      case 'gif':
        return <Image className="w-4 h-4 text-purple-400" />;
      case 'zip':
      case 'tar':
      case 'gz':
        return <Archive className="w-4 h-4 text-orange-400" />;
      default:
        return <File className="w-4 h-4 text-slate-400" />;
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '';
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  const getFileType = (node: FileNode) => {
    if (node.type === 'directory') return 'Dossier';
    
    const ext = node.extension?.toLowerCase();
    switch (ext) {
      case 'txt': return 'Fichier texte';
      case 'log': return 'Journal';
      case 'xml': return 'Fichier XML';
      case 'html': return 'Page web';
      case 'md': return 'Markdown';
      case 'json': return 'JSON';
      case 'png':
      case 'jpg':
      case 'jpeg': return 'Image';
      case 'py': return 'Script Python';
      default: return 'Fichier';
    }
  };

  const searchInFiles = (nodes: FileNode[], term: string): FileNode[] => {
    const results: FileNode[] = [];
    
    for (const node of nodes) {
      if (node.name.toLowerCase().includes(term.toLowerCase())) {
        results.push(node);
      }
      
      if (node.children) {
        const childResults = searchInFiles(node.children, term);
        results.push(...childResults);
      }
    }
    
    return results;
  };

  const renderFileTree = (nodes: FileNode[], level: number = 0) => {
    return nodes.map((node) => {
      const isExpanded = expandedDirs.has(node.path);
      const isSelected = selectedFile === node.path;
      
      return (
        <div key={node.path} className="select-none">
          <div
            className={`
              flex items-center gap-2 p-2 rounded cursor-pointer transition-colors
              ${isSelected ? 'bg-purple-900/30 text-white' : 'text-slate-300 hover:bg-slate-700/30'}
            `}
            style={{ paddingLeft: `${level * 20 + 8}px` }}
            onClick={() => {
              if (node.type === 'directory') {
                toggleDirectory(node.path);
              } else {
                setSelectedFile(node.path);
              }
            }}
          >
            {node.type === 'directory' && (
              <div className="w-4 h-4 flex items-center justify-center">
                {isExpanded ? (
                  <ChevronDown className="w-3 h-3" />
                ) : (
                  <ChevronRight className="w-3 h-3" />
                )}
              </div>
            )}
            
            {getFileIcon(node)}
            
            <span className="flex-1 truncate">{node.name}</span>
            
            {node.type === 'file' && node.size && (
              <span className="text-xs text-slate-400">
                {formatFileSize(node.size)}
              </span>
            )}
          </div>
          
          {node.type === 'directory' && isExpanded && node.children && (
            <div>
              {renderFileTree(node.children, level + 1)}
            </div>
          )}
        </div>
      );
    });
  };

  const renderFilesList = (nodes: FileNode[]) => {
    const allFiles: FileNode[] = [];
    
    const collectFiles = (nodeList: FileNode[]) => {
      for (const node of nodeList) {
        if (node.type === 'file') {
          allFiles.push(node);
        }
        if (node.children) {
          collectFiles(node.children);
        }
      }
    };
    
    collectFiles(nodes);
    
    const filteredFiles = searchTerm 
      ? allFiles.filter(file => file.name.toLowerCase().includes(searchTerm.toLowerCase()))
      : allFiles;

    return (
      <div className="space-y-2">
        {filteredFiles.map((file) => {
          const isSelected = selectedFile === file.path;
          
          return (
            <div
              key={file.path}
              className={`
                flex items-center justify-between p-3 rounded border cursor-pointer transition-all
                ${isSelected 
                  ? 'bg-purple-900/30 border-purple-500 text-white' 
                  : 'bg-slate-700/30 border-slate-600 text-slate-300 hover:bg-slate-700/50'
                }
              `}
              onClick={() => setSelectedFile(file.path)}
            >
              <div className="flex items-center gap-3">
                {getFileIcon(file)}
                <div>
                  <p className="font-medium">{file.name}</p>
                  <p className="text-xs text-slate-400">{file.path}</p>
                </div>
              </div>
              
              <div className="text-right text-sm">
                <p className="text-slate-400">{getFileType(file)}</p>
                {file.size && (
                  <p className="text-slate-400 text-xs">{formatFileSize(file.size)}</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const selectedFileContent = selectedFile ? rawFiles.get(selectedFile) : null;
  const selectedFileNode = selectedFile ? findFileNode(fileStructure, selectedFile) : null;

  function findFileNode(nodes: FileNode[], path: string): FileNode | null {
    for (const node of nodes) {
      if (node.path === path) return node;
      if (node.children) {
        const found = findFileNode(node.children, path);
        if (found) return found;
      }
    }
    return null;
  }

  const formatContent = (content: string) => {
    // Limit content display to avoid performance issues
    const maxLines = 100;
    const lines = content.split('\n');
    if (lines.length > maxLines) {
      return lines.slice(0, maxLines).join('\n') + `\n\n... (${lines.length - maxLines} lignes supplémentaires)`;
    }
    return content;
  };

  const downloadFile = () => {
    if (!selectedFile || !selectedFileContent) return;
    
    const blob = new Blob([selectedFileContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = selectedFile.split('/').pop() || 'file.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="p-6 bg-slate-800/50 backdrop-blur-sm border-slate-700">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-white">Fichiers et résultats</h2>
            <p className="text-slate-400">Explorez tous les fichiers générés par AutoRecon</p>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Button
                onClick={() => setViewMode('tree')}
                variant={viewMode === 'tree' ? 'default' : 'outline'}
                size="sm"
                className="text-xs"
              >
                Arbre
              </Button>
              <Button
                onClick={() => setViewMode('list')}
                variant={viewMode === 'list' ? 'default' : 'outline'}
                size="sm"
                className="text-xs"
              >
                Liste
              </Button>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
          <Input
            placeholder="Rechercher des fichiers..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 bg-slate-700 border-slate-600 text-white"
          />
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* File Browser */}
        <Card className="lg:col-span-1 p-4 bg-slate-800/50 backdrop-blur-sm border-slate-700">
          <h3 className="text-lg font-semibold text-white mb-4">Navigation</h3>
          
          <div className="max-h-96 overflow-y-auto">
            {viewMode === 'tree' ? (
              renderFileTree(fileStructure)
            ) : (
              renderFilesList(fileStructure)
            )}
          </div>
        </Card>

        {/* File Viewer */}
        <Card className="lg:col-span-2 p-6 bg-slate-800/50 backdrop-blur-sm border-slate-700">
          {selectedFile && selectedFileNode ? (
            <div className="space-y-4">
              {/* File Header */}
              <div className="flex items-center justify-between border-b border-slate-600 pb-4">
                <div className="flex items-center gap-3">
                  {getFileIcon(selectedFileNode)}
                  <div>
                    <h3 className="text-lg font-semibold text-white">{selectedFileNode.name}</h3>
                    <p className="text-slate-400 text-sm">{selectedFile}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  {selectedFileNode.size && (
                    <span className="text-slate-400 text-sm">
                      {formatFileSize(selectedFileNode.size)}
                    </span>
                  )}
                  <Button
                    onClick={downloadFile}
                    variant="outline"
                    size="sm"
                    className="border-slate-600 text-slate-300"
                  >
                    <Download className="w-4 h-4 mr-1" />
                    Télécharger
                  </Button>
                </div>
              </div>

              {/* File Content */}
              {selectedFileContent ? (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-slate-400 text-sm">Contenu du fichier:</p>
                    <span className="text-slate-400 text-xs">
                      {selectedFileContent.split('\n').length} ligne(s)
                    </span>
                  </div>
                  
                  <div className="bg-slate-900/50 rounded border border-slate-600 p-4 max-h-96 overflow-auto">
                    <pre className="text-slate-300 text-sm whitespace-pre-wrap font-mono">
                      {formatContent(selectedFileContent)}
                    </pre>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-slate-400">
                  <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>Impossible de charger le contenu du fichier</p>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-12">
              <File className="w-16 h-16 text-slate-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">
                Sélectionnez un fichier
              </h3>
              <p className="text-slate-400">
                Choisissez un fichier dans la liste de gauche pour voir son contenu
              </p>
            </div>
          )}
        </Card>
      </div>

      {/* File Statistics */}
      <Card className="p-6 bg-slate-800/50 backdrop-blur-sm border-slate-700">
        <h3 className="text-lg font-semibold text-white mb-4">Statistiques des fichiers</h3>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <FileText className="w-8 h-8 text-green-400 mx-auto mb-2" />
            <p className="text-2xl font-bold text-white">
              {rawFiles.size}
            </p>
            <p className="text-slate-400 text-sm">Fichiers total</p>
          </div>
          
          <div className="text-center">
            <Server className="w-8 h-8 text-blue-400 mx-auto mb-2" />
            <p className="text-2xl font-bold text-white">
              {fileStructure.filter(n => n.type === 'directory' && n.name.match(/^\d+\.\d+\.\d+\.\d+$/)).length}
            </p>
            <p className="text-slate-400 text-sm">Hôtes scannés</p>
          </div>
          
          <div className="text-center">
            <Terminal className="w-8 h-8 text-yellow-400 mx-auto mb-2" />
            <p className="text-2xl font-bold text-white">
              {Array.from(rawFiles.values()).join('').split('\n').filter(line => 
                line.includes('nmap') || line.includes('nikto') || line.includes('feroxbuster')
              ).length}
            </p>
            <p className="text-slate-400 text-sm">Commandes exécutées</p>
          </div>
          
          <div className="text-center">
            <Archive className="w-8 h-8 text-purple-400 mx-auto mb-2" />
            <p className="text-2xl font-bold text-white">
              {Math.round(Array.from(rawFiles.values()).join('').length / 1024 / 1024 * 100) / 100}
            </p>
            <p className="text-slate-400 text-sm">MB de données</p>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default FilesPanel;
