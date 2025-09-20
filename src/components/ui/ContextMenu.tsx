import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
// Les icônes sont passées en tant que props, pas d'imports nécessaires ici

export interface ContextMenuItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  action: () => void;
  disabled?: boolean;
  separator?: boolean;
}

interface ContextMenuProps {
  isOpen: boolean;
  position: { x: number; y: number };
  items: ContextMenuItem[];
  onClose: () => void;
  className?: string;
}

export const ContextMenu: React.FC<ContextMenuProps> = ({
  isOpen,
  position,
  items,
  onClose,
  className = ''
}) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const [adjustedPosition, setAdjustedPosition] = useState(position);

  // Ajuster la position du menu pour qu'il reste dans la fenêtre
  useEffect(() => {
    if (!isOpen || !menuRef.current) return;

    const menu = menuRef.current;
    const rect = menu.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let newX = position.x;
    let newY = position.y;

    // Ajuster horizontalement
    if (position.x + rect.width > viewportWidth) {
      newX = viewportWidth - rect.width - 10;
    }
    if (newX < 10) {
      newX = 10;
    }

    // Ajuster verticalement
    if (position.y + rect.height > viewportHeight) {
      newY = viewportHeight - rect.height - 10;
    }
    if (newY < 10) {
      newY = 10;
    }

    setAdjustedPosition({ x: newX, y: newY });
  }, [isOpen, position]);

  // Fermer le menu si on clique à l'extérieur
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        ref={menuRef}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.15 }}
        className={`fixed z-50 bg-slate-800 border border-slate-600 rounded-lg shadow-xl py-2 min-w-[200px] ${className}`}
        style={{
          left: adjustedPosition.x,
          top: adjustedPosition.y,
        }}
      >
        {items.map((item, index) => {
          if (item.separator) {
            return (
              <div key={`separator-${index}`} className="border-t border-slate-600 my-1" />
            );
          }

          return (
            <button
              key={item.id}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (!item.disabled) {
                  item.action();
                  onClose();
                }
              }}
              disabled={item.disabled}
              className="w-full flex items-center gap-3 px-4 py-2 text-left text-slate-200 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-150"
            >
              {item.icon && (
                <div className="w-4 h-4 flex items-center justify-center text-slate-400">
                  {item.icon}
                </div>
              )}
              <span className="text-sm font-medium">{item.label}</span>
            </button>
          );
        })}
      </motion.div>
    </AnimatePresence>
  );
};

