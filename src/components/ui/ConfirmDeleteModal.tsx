import React from 'react';
import { Button } from '@/components/ui/button';
import { createPortal } from 'react-dom';
import { AlertTriangle, X, Trash2 } from 'lucide-react';

interface ConfirmDeleteModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  details?: {
    hostsCount: number;
    categoriesCount: number;
    networkNodesCount: number;
  };
  isLoading?: boolean;
}

export const ConfirmDeleteModal: React.FC<ConfirmDeleteModalProps> = ({ 
  open, 
  onClose, 
  onConfirm,
  title, 
  message, 
  details,
  isLoading = false
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
        className="w-full max-w-md rounded-lg border border-red-600/30 bg-slate-900 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-700 px-6 py-4">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-6 w-6 text-red-500" />
            <div className="text-slate-100 font-semibold text-lg">{title}</div>
          </div>
          <button 
            className="rounded bg-slate-800 p-2 text-slate-400 hover:bg-slate-700 hover:text-slate-200 transition-colors" 
            onClick={onClose} 
            aria-label="Fermer"
            disabled={isLoading}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        
        <div className="px-6 py-4">
          <p className="text-slate-200 text-sm mb-4">{message}</p>
          
          {details && (
            <div className="bg-red-900/20 border border-red-600/30 rounded-lg p-4 space-y-3">
              <h4 className="text-red-300 font-medium text-sm">Données qui seront supprimées :</h4>
              <div className="space-y-2 text-xs text-slate-300">
                <div className="flex justify-between">
                  <span>Hôtes :</span>
                  <span className="text-red-400 font-medium">{details.hostsCount}</span>
                </div>
                <div className="flex justify-between">
                  <span>Catégories :</span>
                  <span className="text-red-400 font-medium">{details.categoriesCount}</span>
                </div>
                <div className="flex justify-between">
                  <span>Nœuds réseau :</span>
                  <span className="text-red-400 font-medium">{details.networkNodesCount}</span>
                </div>
              </div>
              <div className="mt-3 p-2 bg-red-900/30 rounded text-xs text-red-200">
                ⚠️ Cette action est irréversible !
              </div>
            </div>
          )}
        </div>
        
        <div className="flex justify-end gap-3 border-t border-slate-700 px-6 py-4">
          <Button 
            variant="outline" 
            className="bg-slate-800 border-slate-600 text-slate-200 hover:bg-slate-700" 
            onClick={onClose}
            disabled={isLoading}
          >
            Annuler
          </Button>
          <Button 
            variant="destructive"
            className="bg-red-600 hover:bg-red-700 text-white"
            onClick={onConfirm}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Suppression...
              </>
            ) : (
              <>
                <Trash2 className="h-4 w-4 mr-2" />
                Supprimer
              </>
            )}
          </Button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default ConfirmDeleteModal;
