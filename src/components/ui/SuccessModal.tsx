import React from 'react';
import { Button } from '@/components/ui/button';
import { createPortal } from 'react-dom';
import { CheckCircle, X } from 'lucide-react';

interface SuccessModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  message: string;
  details?: {
    importedCount: number;
    mode: 'replace' | 'merge';
    options: {
      hosts: boolean;
      categories: boolean;
      networkNodes: boolean;
    };
  };
}

export const SuccessModal: React.FC<SuccessModalProps> = ({ 
  open, 
  onClose, 
  title, 
  message, 
  details 
}) => {
  if (!open) return null;
  
  return createPortal(
    <div 
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4" 
      role="dialog" 
      aria-modal="true"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-md rounded-lg border border-green-600/30 bg-slate-900 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-700 px-6 py-4">
          <div className="flex items-center gap-3">
            <CheckCircle className="h-6 w-6 text-green-500" />
            <div className="text-slate-100 font-semibold text-lg">{title}</div>
          </div>
          <button 
            className="rounded bg-slate-800 p-2 text-slate-400 hover:bg-slate-700 hover:text-slate-200 transition-colors" 
            onClick={onClose} 
            aria-label="Fermer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        
        <div className="px-6 py-4">
          <p className="text-slate-200 text-sm mb-4">{message}</p>
          
          {details && (
            <div className="bg-slate-800/50 rounded-lg p-4 space-y-3">
              <h4 className="text-slate-100 font-medium text-sm">Résumé de l'import :</h4>
              <div className="space-y-2 text-xs text-slate-300">
                <div className="flex justify-between">
                  <span>Éléments importés :</span>
                  <span className="text-green-400 font-medium">{details.importedCount}</span>
                </div>
                <div className="flex justify-between">
                  <span>Mode :</span>
                  <span className="text-blue-400">
                    {details.mode === 'replace' ? 'Remplacement' : 'Fusion'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Hôtes :</span>
                  <span className={details.options.hosts ? 'text-green-400' : 'text-slate-500'}>
                    {details.options.hosts ? 'Oui' : 'Non'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Catégories :</span>
                  <span className={details.options.categories ? 'text-green-400' : 'text-slate-500'}>
                    {details.options.categories ? 'Oui' : 'Non'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Nœuds réseau :</span>
                  <span className={details.options.networkNodes ? 'text-green-400' : 'text-slate-500'}>
                    {details.options.networkNodes ? 'Oui' : 'Non'}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
        
        <div className="flex justify-end gap-3 border-t border-slate-700 px-6 py-4">
          <Button 
            variant="outline" 
            className="bg-slate-800 border-slate-600 text-slate-200 hover:bg-slate-700" 
            onClick={onClose}
          >
            Fermer
          </Button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default SuccessModal;
