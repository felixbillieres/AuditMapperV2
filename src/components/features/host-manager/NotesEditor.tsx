import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  Save, 
  Edit3, 
  Eye, 
  Download, 
  Upload, 
  Copy, 
  Bold, 
  Italic, 
  List, 
  Code, 
  Link,
  Hash,
  Type,
  Maximize2,
  Minimize2,
  FileText,
  Clock,
  User
} from 'lucide-react';
import { createPortal } from 'react-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Host } from '@/types';

interface NotesEditorProps {
  host: Host;
  onClose: () => void;
  onSave: (notes: string) => void;
}

export const NotesEditor: React.FC<NotesEditorProps> = ({
  host,
  onClose,
  onSave,
}) => {
  const [content, setContent] = useState(host.notes || '');
  const [isPreview, setIsPreview] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [wordCount, setWordCount] = useState(0);
  const [lineCount, setLineCount] = useState(1);
  const [savedContent, setSavedContent] = useState(host.notes || '');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSave = () => {
    onSave(content);
    setSavedContent(content);
    setHasUnsavedChanges(false);
  };

  useEffect(() => {
    const words = content.trim().split(/\s+/).filter(word => word.length > 0).length;
    const lines = content.split('\n').length;
    setWordCount(content.trim() === '' ? 0 : words);
    setLineCount(lines);
    setHasUnsavedChanges(content !== savedContent);
  }, [content, savedContent]);

  // Raccourcis clavier
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case 's':
            e.preventDefault();
            if (hasUnsavedChanges) handleSave();
            break;
          case 'p':
            e.preventDefault();
            setIsPreview(!isPreview);
            break;
          case 'Escape':
            e.preventDefault();
            onClose();
            break;
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [hasUnsavedChanges, isPreview, handleSave, onClose]);

  // Empêcher le scroll de la page pendant l'affichage de la modale
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  const insertMarkdown = (syntax: string, placeholder: string = '') => {
    if (!textareaRef.current) return;
    
    const textarea = textareaRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = content.substring(start, end);
    const replacement = selectedText || placeholder;
    
    let newText = '';
    if (syntax.includes('[]')) {
      newText = content.substring(0, start) + syntax.replace('[]', replacement) + content.substring(end);
    } else {
      newText = content.substring(0, start) + syntax + replacement + syntax + content.substring(end);
    }
    
    setContent(newText);
    
    // Restore cursor position
    setTimeout(() => {
      if (textareaRef.current) {
        const newPosition = start + syntax.length + (selectedText ? 0 : placeholder.length);
        textareaRef.current.setSelectionRange(newPosition, newPosition);
        textareaRef.current.focus();
      }
    }, 0);
  };

  const formatMarkdown = (text: string) => {
    // Gestion des blocs de code ```lang\n...\n```
    let html = '';
    const lines = text.split(/\r?\n/);
    let inCode = false;
    let codeLang = '';
    let buffer: string[] = [];
    const flushParagraph = (para: string) => {
      if (!para.trim()) return '';
      return `<p class="text-slate-300 mb-3">${para
        .replace(/^# (.*$)/gm, '<h1 class="text-2xl font-bold text-blue-400 mb-4">$1</h1>')
        .replace(/^## (.*$)/gm, '<h2 class="text-xl font-bold text-blue-300 mb-3">$1</h2>')
        .replace(/^### (.*$)/gm, '<h3 class="text-lg font-bold text-blue-200 mb-2">$1</h3>')
        .replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold text-white">$1</strong>')
        .replace(/\*(.*?)\*/g, '<em class="italic text-slate-300">$1</em>')
        .replace(/`([^`]+)`/g, '<code class="bg-slate-700 px-1 py-0.5 rounded text-green-400 font-mono text-sm">$1</code>')
        .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-blue-400 hover:text-blue-300 underline" target="_blank">$1</a>')
        .replace(/^\- (.*$)/gm, '<li class="ml-4 text-slate-300">• $1</li>')
      }</p>`;
    };
    let paraBuf: string[] = [];
    const flushParaBuf = () => {
      if (paraBuf.length) {
        html += flushParagraph(paraBuf.join('\n'));
        paraBuf = [];
      }
    };
    for (const rawLine of lines) {
      const line = rawLine.replace(/\t/g, '    ');
      const fenceMatch = line.match(/^```\s*([a-zA-Z0-9_-]*)\s*$/);
      if (fenceMatch) {
        if (!inCode) {
          // opening fence
          flushParaBuf();
          inCode = true; codeLang = fenceMatch[1] || '';
          buffer = [];
        } else {
          // closing fence
          const codeHtml = buffer.join('\n').replace(/</g,'&lt;').replace(/>/g,'&gt;');
          html += `<pre class="bg-slate-900 border border-slate-700 rounded p-3 overflow-auto mb-3"><code class="language-${codeLang}">${codeHtml}</code></pre>`;
          inCode = false; codeLang = ''; buffer = [];
        }
        continue;
      }
      if (inCode) { buffer.push(line); continue; }
      if (line.trim() === '') { flushParaBuf(); continue; }
      paraBuf.push(line);
    }
    flushParaBuf();
    if (inCode && buffer.length) {
      const codeHtml = buffer.join('\n').replace(/</g,'&lt;').replace(/>/g,'&gt;');
      html += `<pre class="bg-slate-900 border border-slate-700 rounded p-3 overflow-auto mb-3"><code>${codeHtml}</code></pre>`;
    }
    return html || '<p class="text-slate-500 italic">Aucune note...</p>';
  };

  const exportNotes = () => {
    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `notes-${host.hostname || host.ip}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(content);
  };

  const modal = (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[9999] bg-slate-900/90 backdrop-blur-sm flex items-center justify-center p-4"
      >
        <motion.div
          initial={{ scale: 0.98, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.98, opacity: 0 }}
          className={`bg-slate-900 overflow-hidden flex flex-col border border-slate-700 rounded-lg ${
            isFullscreen ? 'h-full w-full rounded-none' : 'h-[85vh] w-[85vw] max-w-6xl max-h-[800px]'
          }`}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-slate-700 bg-slate-800/90 backdrop-blur-md">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-400" />
                <div>
                  <h2 className="text-lg font-semibold text-slate-100">
                    Notes - {host.hostname || host.ip}
                  </h2>
                  <div className="flex items-center gap-4 text-xs text-slate-400">
                    <span className="flex items-center gap-1">
                      <Type className="w-3 h-3" />
                      {wordCount} mots
                    </span>
                    <span className="flex items-center gap-1">
                      <Hash className="w-3 h-3" />
                      {lineCount} lignes
                    </span>
                    {hasUnsavedChanges && (
                      <span className="text-amber-400 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        Non sauvegardé
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {/* Toolbar */}
              <div className="hidden md:flex items-center gap-1 mr-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => insertMarkdown('**', 'texte en gras')}
                  className="bg-slate-700 border-slate-600 text-slate-300 hover:bg-slate-600"
                  title="Gras"
                >
                  <Bold className="w-3 h-3" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => insertMarkdown('*', 'texte en italique')}
                  className="bg-slate-700 border-slate-600 text-slate-300 hover:bg-slate-600"
                  title="Italique"
                >
                  <Italic className="w-3 h-3" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => insertMarkdown('`', 'code')}
                  className="bg-slate-700 border-slate-600 text-slate-300 hover:bg-slate-600"
                  title="Code"
                >
                  <Code className="w-3 h-3" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => insertMarkdown('[](', 'url')}
                  className="bg-slate-700 border-slate-600 text-slate-300 hover:bg-slate-600"
                  title="Lien"
                >
                  <Link className="w-3 h-3" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => insertMarkdown('- ', '')}
                  className="bg-slate-700 border-slate-600 text-slate-300 hover:bg-slate-600"
                  title="Liste"
                >
                  <List className="w-3 h-3" />
                </Button>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsPreview(!isPreview)}
                className={`${
                  isPreview 
                    ? 'bg-blue-600 border-blue-500 text-white' 
                    : 'bg-slate-700 border-slate-600 text-slate-300 hover:bg-slate-600'
                }`}
              >
                {isPreview ? <Edit3 className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                {isPreview ? 'Éditer' : 'Aperçu'}
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsFullscreen(!isFullscreen)}
                className="bg-slate-700 border-slate-600 text-slate-300 hover:bg-slate-600"
              >
                {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={copyToClipboard}
                className="bg-slate-700 border-slate-600 text-slate-300 hover:bg-slate-600"
                title="Copier"
              >
                <Copy className="w-4 h-4" />
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={exportNotes}
                className="bg-slate-700 border-slate-600 text-slate-300 hover:bg-slate-600"
                title="Exporter"
              >
                <Download className="w-4 h-4" />
              </Button>

              <div className="w-px h-6 bg-slate-600 mx-2" />

              <Button
                variant="default"
                size="sm"
                onClick={handleSave}
                disabled={!hasUnsavedChanges}
                className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
              >
                <Save className="w-4 h-4 mr-2" />
                Sauvegarder
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={onClose}
                className="bg-red-600 border-red-500 text-white hover:bg-red-700 hover:border-red-600"
              >
                <X className="w-4 h-4 mr-1" />
                Fermer
              </Button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 flex overflow-hidden">
            {isPreview ? (
              // Preview Mode
              <div className="flex-1 p-6 overflow-auto">
                <div className="max-w-4xl mx-auto">
                  <div 
                    className="prose prose-invert prose-blue max-w-none"
                    dangerouslySetInnerHTML={{ __html: formatMarkdown(content) }}
                  />
                </div>
              </div>
            ) : (
              // Edit Mode  
              <div className="flex-1 overflow-hidden bg-slate-900">
                <Textarea
                  ref={textareaRef}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="w-full h-full resize-none bg-slate-900 border-none text-slate-100 text-lg leading-relaxed font-mono p-8 focus:ring-0 focus:outline-none"
                  placeholder={`# Notes pour ${host.hostname || host.ip}

## Vue d'ensemble
Décrivez ici les informations importantes sur ce host...

## Découvertes
- Point important 1
- Point important 2

## Exploitation
### Étape 1
Description de l'étape...

\`\`\`bash
commande_example
\`\`\`

### Résultats
Ce qui a été découvert...

## Todo
- [ ] Action à faire
- [ ] Autre action

## Notes supplémentaires
Autres observations...`}
                  style={{ fontFamily: 'JetBrains Mono, Consolas, Monaco, monospace' }}
                />
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between p-4 border-t border-slate-700 bg-slate-800/90 backdrop-blur-md text-xs text-slate-400">
            <div className="flex items-center gap-4">
              <span>Raccourcis: Ctrl+S (sauvegarder), Ctrl+P (aperçu), Escape (fermer)</span>
            </div>
            <div className="flex items-center gap-2">
              {host.updatedAt && (
                <span className="flex items-center gap-1">
                  <User className="w-3 h-3" />
                  Modifié le {new Date(host.updatedAt).toLocaleString('fr-FR')}
                </span>
              )}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );

  return createPortal(modal, document.body);
};
