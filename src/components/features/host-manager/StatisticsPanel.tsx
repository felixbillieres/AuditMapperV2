import React from 'react';
import { motion } from 'framer-motion';
import { X, BarChart3, Server, Shield, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface StatisticsPanelProps {
  stats: {
    total: number;
    active: number;
    compromised: number;
    byStatus: Record<string, number>;
    byPriority: Record<string, number>;
    byCompromiseLevel: Record<string, number>;
    byOS: Record<string, number>;
    byCategory: Record<string, number>;
  };
  onClose: () => void;
}

export const StatisticsPanel: React.FC<StatisticsPanelProps> = ({
  stats,
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
        className="w-full max-w-4xl max-h-[90vh] overflow-hidden"
      >
        <Card variant="dark" className="h-full flex flex-col">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-xl flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              Statistiques
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Statistiques générales */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Général</h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center p-3 bg-dark-800 rounded-md">
                    <span className="text-dark-300">Total Hosts</span>
                    <span className="text-cyber-primary font-bold">{stats.total}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-dark-800 rounded-md">
                    <span className="text-dark-300">Actifs</span>
                    <span className="text-cyber-accent font-bold">{stats.active}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-dark-800 rounded-md">
                    <span className="text-dark-300">Compromis</span>
                    <span className="text-cyber-secondary font-bold">{stats.compromised}</span>
                  </div>
                </div>
              </div>
              
              {/* Par statut */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Par Statut</h3>
                <div className="space-y-3">
                  {Object.entries(stats.byStatus).map(([status, count]) => (
                    <div key={status} className="flex justify-between items-center p-3 bg-dark-800 rounded-md">
                      <span className="text-dark-300 capitalize">{status}</span>
                      <span className="text-cyber-primary font-bold">{count}</span>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Par priorité */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Par Priorité</h3>
                <div className="space-y-3">
                  {Object.entries(stats.byPriority).map(([priority, count]) => (
                    <div key={priority} className="flex justify-between items-center p-3 bg-dark-800 rounded-md">
                      <span className="text-dark-300 capitalize">{priority}</span>
                      <span className="text-cyber-primary font-bold">{count}</span>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Par niveau de compromission */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Par Compromission</h3>
                <div className="space-y-3">
                  {Object.entries(stats.byCompromiseLevel).map(([level, count]) => (
                    <div key={level} className="flex justify-between items-center p-3 bg-dark-800 rounded-md">
                      <span className="text-dark-300 capitalize">{level}</span>
                      <span className="text-cyber-primary font-bold">{count}</span>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Par OS */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Par OS</h3>
                <div className="space-y-3">
                  {Object.entries(stats.byOS).length > 0 ? (
                    Object.entries(stats.byOS).map(([os, count]) => (
                      <div key={os} className="flex justify-between items-center p-3 bg-dark-800 rounded-md">
                        <span className="text-dark-300">{os}</span>
                        <span className="text-cyber-primary font-bold">{count}</span>
                      </div>
                    ))
                  ) : (
                    <div className="text-dark-400 text-sm p-3">Aucun OS spécifié</div>
                  )}
                </div>
              </div>
              
              {/* Par catégorie */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Par Catégorie</h3>
                <div className="space-y-3">
                  {Object.entries(stats.byCategory).length > 0 ? (
                    Object.entries(stats.byCategory).map(([category, count]) => (
                      <div key={category} className="flex justify-between items-center p-3 bg-dark-800 rounded-md">
                        <span className="text-dark-300">{category}</span>
                        <span className="text-cyber-primary font-bold">{count}</span>
                      </div>
                    ))
                  ) : (
                    <div className="text-dark-400 text-sm p-3">Aucune catégorie</div>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
};
