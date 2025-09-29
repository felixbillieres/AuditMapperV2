import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Button } from './button';
import { Input } from './input';

interface InputDialogProps {
  open: boolean;
  title: string;
  placeholder?: string;
  confirmText?: string;
  cancelText?: string;
  defaultValue?: string;
  type?: 'text' | 'password';
  onConfirm: (value: string) => void;
  onCancel: () => void;
  preserveFullscreen?: boolean;
}

const InputDialog: React.FC<InputDialogProps> = ({ open, title, placeholder, confirmText = 'Ajouter', cancelText = 'Annuler', defaultValue = '', type = 'text', onConfirm, onCancel, preserveFullscreen = false }) => {
  const [value, setValue] = useState(defaultValue);
  useEffect(() => { if (open) setValue(defaultValue || ''); }, [open, defaultValue]);

  if (!open) return null;
  
  // Si preserveFullscreen est true, utiliser un z-index plus élevé et ne pas fermer le mode plein écran
  const zIndex = preserveFullscreen ? 'z-[9999]' : 'z-[250]';
  
  return createPortal(
    <div 
      className={`fixed inset-0 ${zIndex} flex items-center justify-center bg-black/60 p-4`}
      onClick={(e) => {
        // Empêcher la fermeture du modal lors du clic sur le backdrop
        if (preserveFullscreen) {
          e.stopPropagation();
        }
      }}
    >
      <div 
        className="w-full max-w-md rounded-lg border border-slate-700 bg-slate-900 shadow-xl p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-slate-100 font-semibold mb-2">{title}</div>
        <Input 
          value={value} 
          onChange={(e)=>setValue(e.target.value)} 
          placeholder={placeholder} 
          type={type} 
          className="bg-slate-700 border-slate-600 text-slate-100 mb-3"
          onClick={(e) => e.stopPropagation()}
          onFocus={(e) => e.stopPropagation()}
        />
        <div className="flex justify-end gap-2">
          <Button 
            variant="outline" 
            className="bg-slate-800 border-slate-600 text-slate-200 hover:bg-slate-700" 
            onClick={(e) => {
              e.stopPropagation();
              onCancel();
            }}
          >
            {cancelText}
          </Button>
          <Button 
            className="bg-blue-600 hover:bg-blue-700" 
            disabled={!value.trim()} 
            onClick={(e) => {
              e.stopPropagation();
              onConfirm(value.trim());
            }}
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default InputDialog;
