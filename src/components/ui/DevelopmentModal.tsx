import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Construction, Clock, AlertCircle } from 'lucide-react';
import { Button } from './button';

interface DevelopmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  feature?: string;
}

export const DevelopmentModal: React.FC<DevelopmentModalProps> = ({
  isOpen,
  onClose,
  title = "Fonctionnalité en cours de développement",
  feature = "cette section"
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="relative w-full max-w-md mx-4 bg-slate-800 border border-slate-600 rounded-xl shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-slate-700">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-orange-600/20 flex items-center justify-center">
                  <Construction className="w-5 h-5 text-orange-400" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-slate-100">{title}</h2>
                  <p className="text-sm text-slate-400">AuditMapper V2</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="text-slate-400 hover:text-slate-200 hover:bg-slate-700 p-2"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-orange-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-slate-200 mb-2">
                    <strong>{feature}</strong> est actuellement en cours de développement.
                  </p>
                  <p className="text-slate-300 text-sm">
                    Nous travaillons activement sur cette fonctionnalité pour vous offrir une expérience optimale.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Clock className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-slate-200 text-sm font-medium">Version finale bientôt disponible</p>
                  <p className="text-slate-300 text-sm">
                    La version complète sera déployée dans une prochaine mise à jour.
                  </p>
                </div>
              </div>

              <div className="p-4 bg-slate-900/50 border border-slate-700 rounded-lg">
                <p className="text-slate-300 text-sm text-center">
                  Merci pour votre patience et pardon pour le désagrément.
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-3 p-6 border-t border-slate-700">
              <Button
                variant="outline"
                onClick={onClose}
                className="bg-slate-700 border-slate-600 text-slate-200 hover:bg-slate-600"
              >
                Compris
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default DevelopmentModal;
