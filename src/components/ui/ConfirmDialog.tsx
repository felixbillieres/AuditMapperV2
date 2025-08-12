import React from 'react';
import { createPortal } from 'react-dom';
import { Button } from './button';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

const ConfirmDialog: React.FC<ConfirmDialogProps> = ({ open, title, description, confirmText = 'Confirmer', cancelText = 'Annuler', onConfirm, onCancel }) => {
  if (!open) return null;
  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md rounded-lg border border-slate-700 bg-slate-900 shadow-xl">
        <div className="px-4 py-3 border-b border-slate-700">
          <div className="text-slate-100 font-semibold">{title}</div>
          {description && <div className="text-slate-300 text-sm mt-1">{description}</div>}
        </div>
        <div className="px-4 py-3 flex justify-end gap-2">
          <Button variant="outline" className="bg-slate-800 border-slate-600 text-slate-200 hover:bg-slate-700" onClick={onCancel}>{cancelText}</Button>
          <Button className="bg-red-600 hover:bg-red-700" onClick={onConfirm}>{confirmText}</Button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default ConfirmDialog;
