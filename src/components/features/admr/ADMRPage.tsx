import React, { useState } from 'react';
import CanvasViewer from '@/components/features/admr/CanvasViewer';
import { Button } from '@/components/ui/button';

const ADMRPage: React.FC = () => {
  const [open, setOpen] = useState(false);

  return (
    <div className="app-layout">
      {/* Header */}
      <div className="main-header p-6">
        <div className="flex-between mb-4">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="AuditMapper" className="w-8 h-8 rounded-lg opacity-80" />
            <div>
              <h1 className="text-2xl font-bold text-slate-100">ADMR - Obsidian Canvas</h1>
              <p className="text-slate-400 text-sm">
                Visualisation interactive de la mindmap AD – basée sur Obsidian Canvas.
              </p>
            </div>
          </div>
          <div className="ml-auto">
            <Button
              variant="outline"
              className="bg-slate-800 border-slate-600 text-slate-200 hover:bg-slate-700"
              onClick={() => setOpen(true)}
            >
              ℹ️ Comment ça marche
            </Button>
          </div>
        </div>

        <div className="rounded-md border border-slate-700 bg-slate-800 p-3 text-slate-200 text-sm">
          <div>
            <span className="text-slate-300">Crédits</span> — Merci à
            {' '}<a className="text-sky-300 underline" href="https://www.linkedin.com/in/aminebpro/" target="_blank" rel="noreferrer">gr0bot</a>
            {' '}et{' '}
            <a className="text-sky-300 underline" href="https://www.linkedin.com/in/evariste-g-43488423a/" target="_blank" rel="noreferrer">bl4ckarch</a>
            {' '}pour la création de cette carte Obsidian inspirée de
            {' '}<a className="text-sky-300 underline" href="https://orange-cyberdefense.github.io/ocd-mindmaps/" target="_blank" rel="noreferrer">OCD mindmaps</a>
            {' '}et{' '}
            <a className="text-sky-300 underline" href="https://www.thehacker.recipes/" target="_blank" rel="noreferrer">The Hacker Recipes</a>.
            {' '}Source originale: {' '}
            <a className="text-sky-300 underline" href="https://github.com/Imp0sters/ADMR" target="_blank" rel="noreferrer">github.com/Imp0sters/ADMR</a>.
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="main-content">
        <div className="content-area">
          <div className="content-main">
            <CanvasViewer hideInternalHeader />
          </div>
        </div>
      </div>

      {/* Modal d'explication */}
      {open && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-3xl rounded-lg border border-slate-700 bg-slate-900 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-700 px-4 py-3">
              <div className="text-slate-100 font-semibold">Comment les fichiers .canvas deviennent une UI interactive</div>
              <button
                className="rounded bg-slate-800 px-2 py-1 text-slate-200 hover:bg-slate-700"
                onClick={() => setOpen(false)}
                aria-label="Fermer"
              >
                ✖
              </button>
            </div>
            <div className="px-4 py-3 text-sm text-slate-200 space-y-3">
              <p>
                Les fichiers <code>.canvas</code> d’Obsidian sont des JSON contenant des <em>nodes</em> (text, group, file) et des <em>edges</em>.
                Nous les chargeons côté web et les rendons avec <strong>React Flow</strong> (positions absolues, pan/zoom).
              </p>
              <ul className="list-disc ml-5 space-y-1">
                <li><strong>Chargement des assets</strong>: Vite regroupe <code>/ADMR/**/*.canvas</code> via <code>import.meta.glob(..., {'{'} eager: true, as: 'url' {'}'})</code>.</li>
                <li><strong>Résolution des liens</strong>: les nodes <code>file</code> pointant vers d’autres canvases sont résolus avec <code>new URL(relative, base)</code> + <code>decodeURI</code>.</li>
                <li><strong>Rendu</strong>: chaque type de node a un composant React (texte, groupe, carte fichier). Les arêtes sont des lignes droites avec flèches.</li>
                <li><strong>Handles</strong>: des <em>handles</em> invisibles sont ajoutés sur 4 côtés pour connecter les arêtes selon <code>fromSide/toSide</code>.</li>
                <li><strong>Markdown</strong>: le node texte est rendu avec <code>react-markdown</code> et un petit parsing pour convertir <code>[info]</code>, <code>[example]</code>, etc. en emojis.</li>
                <li><strong>Navigation</strong>: cliquer une carte <code>file</code> ouvre le canvas cible; l’URL conserve <code>?canvas=...</code>.</li>
              </ul>
              <p>
                Stack: <strong>React</strong> + <strong>Vite</strong> + <strong>React Flow</strong> + <strong>react-markdown</strong>. Aucun backend requis; tout est statique et bundlé.
              </p>
              <p className="text-slate-400">Note: en production, les canvases sont servis comme assets; pas besoin de symlinks côté navigateur.</p>
            </div>
            <div className="flex justify-end gap-2 border-t border-slate-700 px-4 py-3">
              <Button
                variant="outline"
                className="bg-slate-800 border-slate-600 text-slate-200 hover:bg-slate-700"
                onClick={() => setOpen(false)}
              >
                Fermer
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ADMRPage;


