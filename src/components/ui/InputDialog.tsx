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
}

const InputDialog: React.FC<InputDialogProps> = ({ open, title, placeholder, confirmText = 'Ajouter', cancelText = 'Annuler', defaultValue = '', type = 'text', onConfirm, onCancel }) => {
  const [value, setValue] = useState(defaultValue);
  useEffect(() => { if (open) setValue(defaultValue || ''); }, [open, defaultValue]);

  if (!open) return null;
  return createPortal(
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md rounded-lg border border-slate-700 bg-slate-900 shadow-xl p-4">
        <div className="text-slate-100 font-semibold mb-2">{title}</div>
        <Input value={value} onChange={(e)=>setValue(e.target.value)} placeholder={placeholder} type={type} className="bg-slate-700 border-slate-600 text-slate-100 mb-3" />
        <div className="flex justify-end gap-2">
          <Button variant="outline" className="bg-slate-800 border-slate-600 text-slate-200 hover:bg-slate-700" onClick={onCancel}>{cancelText}</Button>
          <Button className="bg-blue-600 hover:bg-blue-700" disabled={!value.trim()} onClick={()=> onConfirm(value.trim())}>{confirmText}</Button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default InputDialog;
