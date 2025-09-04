import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Info, X } from 'lucide-react';

interface LegendItem {
  color: string;
  label: string;
  description?: string;
}

interface LegendButtonProps {
  title: string;
  items: LegendItem[];
  className?: string;
}

export const LegendButton: React.FC<LegendButtonProps> = ({ 
  title, 
  items, 
  className = "absolute top-4 right-4 z-20" 
}) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Bouton légende compact */}
      <div className={className}>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsOpen(true)}
          className="bg-slate-800/95 backdrop-blur-md border-slate-600 text-slate-200 hover:bg-slate-700 shadow-lg"
          title={`Afficher la légende ${title}`}
        >
          <Info className="w-4 h-4" />
        </Button>
      </div>

      {/* Modal légende */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-slate-800 rounded-lg border border-slate-600 shadow-2xl max-w-md w-full max-h-[80vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-600">
              <h3 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
                <Info className="w-5 h-5 text-blue-400" />
                {title}
              </h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsOpen(false)}
                className="text-slate-400 hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            {/* Contenu légende */}
            <div className="p-4 space-y-3">
              {items.map((item, index) => (
                <div key={index} className="flex items-start gap-3">
                  <div 
                    className="w-4 h-4 rounded-full flex-shrink-0 mt-0.5"
                    style={{ backgroundColor: item.color }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-slate-100">
                      {item.label}
                    </div>
                    {item.description && (
                      <div className="text-xs text-slate-400 mt-1">
                        {item.description}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
