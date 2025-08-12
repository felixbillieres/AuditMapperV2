import React from 'react';
import { Button } from '@/components/ui/button';
import { createPortal } from 'react-dom';

interface InfoModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export const InfoModal: React.FC<InfoModalProps> = ({ open, onClose, title, children }) => {
  if (!open) return null;
  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4" role="dialog" aria-modal="true">
      <div className="w-full max-w-3xl rounded-lg border border-slate-700 bg-slate-900 shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-700 px-4 py-3">
          <div className="text-slate-100 font-semibold">{title}</div>
          <button className="rounded bg-slate-800 px-2 py-1 text-slate-200 hover:bg-slate-700" onClick={onClose} aria-label="Fermer">✖</button>
        </div>
        <div className="px-4 py-3 text-sm text-slate-200 space-y-3">{children}</div>
        <div className="flex justify-end gap-2 border-t border-slate-700 px-4 py-3">
          <Button variant="outline" className="bg-slate-800 border-slate-600 text-slate-200 hover:bg-slate-700" onClick={onClose}>Fermer</Button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default InfoModal;


