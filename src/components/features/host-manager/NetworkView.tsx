import React from 'react';
import { motion } from 'framer-motion';
import { X, Server, Network } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Host } from '@/types';

interface NetworkViewProps {
  hosts: Host[];
  onClose: () => void;
}

export const NetworkView: React.FC<NetworkViewProps> = ({
  hosts,
  onClose,
}) => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-6xl max-h-[90vh] overflow-hidden"
      >
        <Card variant="dark" className="h-full flex flex-col">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-xl flex items-center gap-2">
              <Network className="w-5 h-5" />
              Visualisation Réseau
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </CardHeader>
          
          <CardContent className="flex-1 overflow-auto">
            <div className="text-center py-12">
              <Server className="w-16 h-16 text-dark-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">Visualisation Réseau</h3>
              <p className="text-dark-400 mb-4">
                Cette fonctionnalité sera implémentée dans une prochaine version.
              </p>
              <div className="text-sm text-dark-400">
                {hosts.length} host(s) disponible(s) pour la visualisation
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
};
