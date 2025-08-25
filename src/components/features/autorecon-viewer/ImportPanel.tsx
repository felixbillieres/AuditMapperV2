import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { useAutoReconStore } from '../../../stores/autoReconStore';
import { Card } from '../../ui/card';
import { Button } from '../../ui/button';
import { Upload, FolderOpen, AlertTriangle, CheckCircle, X } from 'lucide-react';

interface ImportPanelProps {
  onImportSuccess: () => void;
  onCancel: () => void;
}

const ImportPanel: React.FC<ImportPanelProps> = ({ onImportSuccess, onCancel }) => {
  const { loadAutoReconData, isLoading, error } = useAutoReconStore();
  const [dragActive, setDragActive] = useState(false);

  const clearBrowserCache = () => {
    try {
      // Clear localStorage
      localStorage.clear();
      // Clear sessionStorage
      sessionStorage.clear();
      // Clear IndexedDB if possible
      if ('indexedDB' in window) {
        indexedDB.databases().then(databases => {
          databases.forEach(db => {
            if (db.name) {
              indexedDB.deleteDatabase(db.name);
            }
          });
        });
      }
      alert('Cache du navigateur vidé. Vous pouvez maintenant réessayer l\'import.');
    } catch (err) {
      console.error('Erreur lors du vidage du cache:', err);
      alert('Impossible de vider automatiquement le cache. Veuillez vider manuellement le cache dans les paramètres du navigateur.');
    }
  };

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;

    try {
      console.log('Files received:', acceptedFiles.map(f => ({ name: f.name, path: f.webkitRelativePath || f.name, size: f.size })));
      
      // Convert File[] to FileList
      const fileList = {
        length: acceptedFiles.length,
        item: (index: number) => acceptedFiles[index] || null,
        [Symbol.iterator]: function* () {
          for (let i = 0; i < acceptedFiles.length; i++) {
            yield acceptedFiles[i];
          }
        }
      } as FileList;

      await loadAutoReconData(fileList);
      onImportSuccess();
    } catch (err) {
      console.error('Erreur lors de l\'import:', err);
    }
  }, [loadAutoReconData, onImportSuccess]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/plain': ['.txt', '.log'],
      'text/html': ['.html'],
      'application/xml': ['.xml'],
      'text/markdown': ['.md']
    },
    multiple: true,
    onDragEnter: () => setDragActive(true),
    onDragLeave: () => setDragActive(false),
    onDropAccepted: () => setDragActive(false),
    onDropRejected: () => setDragActive(false)
  });

  const handleDirectoryUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      console.log('Directory files received:', Array.from(files).map(f => ({ name: f.name, path: f.webkitRelativePath || f.name, size: f.size })));
      
      loadAutoReconData(files).then(() => {
        onImportSuccess();
      }).catch(err => {
        console.error('Erreur lors de l\'import du dossier:', err);
      });
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <Card className="p-8 bg-slate-800/80 border-slate-700">
        <div className="text-center mb-8">
          <Upload className="w-16 h-16 text-emerald-400 mx-auto mb-4" />
          <h2 className="text-3xl font-bold text-slate-100 mb-2">
            Importer des résultats AutoRecon
          </h2>
          <p className="text-slate-400">
            Glissez-déposez un dossier de résultats AutoRecon ou sélectionnez des fichiers individuels
          </p>
        </div>

      {/* Error Display */}
      {error && (
        <div className="mb-6 p-4 bg-red-900/20 border border-red-500/50 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 text-red-300">
              <AlertTriangle className="w-5 h-5" />
              <span>{error}</span>
            </div>
            {error.includes('volumineux') && (
              <Button
                onClick={clearBrowserCache}
                variant="outline"
                size="sm"
                className="border-red-500 text-red-300 hover:bg-red-900/30"
              >
                Vider le cache
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Drop Zone */}
      <div
        {...getRootProps()}
        className={`
          border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-all duration-200
          ${dragActive || isDragActive
            ? 'border-purple-400 bg-purple-900/20' 
            : 'border-slate-600 hover:border-slate-500'
          }
          ${isLoading ? 'opacity-50 pointer-events-none' : ''}
        `}
      >
        <input {...getInputProps()} />
        
        {isLoading ? (
          <div className="text-white">
            <div className="animate-spin w-8 h-8 border-2 border-purple-400 border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-lg font-medium">Analyse en cours...</p>
            <p className="text-slate-400 mt-2">Cela peut prendre quelques instants</p>
          </div>
        ) : (
          <div className="text-white">
            <FolderOpen className="w-12 h-12 text-slate-400 mx-auto mb-4" />
            <p className="text-lg font-medium mb-2">
              Glissez et déposez vos fichiers AutoRecon ici
            </p>
            <p className="text-slate-400 mb-4">
              ou cliquez pour sélectionner des fichiers
            </p>
            <p className="text-sm text-slate-500">
              Formats supportés: .txt, .log, .html, .xml, .md
            </p>
          </div>
        )}
      </div>

      {/* Directory Upload */}
      <div className="mt-6 text-center">
        <label className="inline-block">
          <input
            type="file"
            {...({ webkitdirectory: "", directory: "" } as any)}
            multiple
            onChange={handleDirectoryUpload}
            className="hidden"
            disabled={isLoading}
          />
          <span className="inline-flex items-center px-4 py-2 border border-slate-600 rounded-md text-sm font-medium text-slate-300 bg-transparent hover:bg-slate-700 cursor-pointer transition-colors disabled:opacity-50">
            <FolderOpen className="w-4 h-4 mr-2" />
            Sélectionner un dossier complet
          </span>
        </label>
      </div>

      {/* Instructions */}
      <div className="mt-8 p-6 bg-slate-700/30 rounded-lg">
        <h3 className="text-lg font-semibold text-white mb-4">
          Comment importer vos résultats AutoRecon :
        </h3>
        
        <div className="space-y-4 text-slate-300">
          <div className="flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium">Option 1 : Dossier complet</p>
              <p className="text-sm text-slate-400">
                Utilisez "Sélectionner un dossier complet" pour importer tout le dossier de résultats AutoRecon
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium">Option 2 : Fichiers individuels</p>
              <p className="text-sm text-slate-400">
                Glissez-déposez ou sélectionnez des fichiers spécifiques (.txt, .log, .xml, etc.)
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-yellow-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium">Conseils pour gros volumes</p>
              <p className="text-sm text-slate-400">
                Pour éviter les erreurs de quota : importez par sous-dossiers ou sélectionnez uniquement les fichiers essentiels (nmap, nikto, etc.)
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium">Structure recommandée</p>
              <p className="text-sm text-slate-400">
                results/[IP]/scans/*, results/[IP]/report/*, results/[IP]/screenshots/*
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-end gap-4 mt-8">
        <Button
          onClick={onCancel}
          variant="outline"
          className="border-slate-600 text-slate-300 hover:bg-slate-700"
          disabled={isLoading}
        >
          <X className="w-4 h-4 mr-2" />
          Annuler
        </Button>
      </div>
    </Card>
    </div>
  );
};

export default ImportPanel;
