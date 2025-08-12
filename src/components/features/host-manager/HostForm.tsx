import React from 'react';
import { motion } from 'framer-motion';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Host } from '@/types';

interface HostFormProps {
  host?: Host;
  onSubmit: (host: Omit<Host, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onCancel: () => void;
}

export const HostForm: React.FC<HostFormProps> = ({
  host,
  onSubmit,
  onCancel,
}) => {
  const [formData, setFormData] = React.useState({
    ip: host?.ip || '',
    hostname: host?.hostname || '',
    os: host?.os || '',
    notes: host?.notes || '',
    status: host?.status || 'active',
    priority: host?.priority || 'medium',
    compromiseLevel: host?.compromiseLevel || 'none',
    usernames: host?.usernames || [],
    passwords: host?.passwords || [],
    hashes: host?.hashes || [],
    tags: host?.tags || [],
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      ...formData,
      services: [],
      vulnerabilities: [],
      credentials: [],
      screenshots: [],
      exploitationSteps: [],
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onCancel}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl"
      >
        <Card variant="dark" className="relative">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-xl">
              {host ? 'Modifier le Host' : 'Ajouter un Host'}
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={onCancel}
              className="h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </CardHeader>
          
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Adresse IP *
                  </label>
                  <Input
                    variant="dark"
                    value={formData.ip}
                    onChange={(e) => setFormData({ ...formData, ip: e.target.value })}
                    placeholder="192.168.1.1"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Hostname
                  </label>
                  <Input
                    variant="dark"
                    value={formData.hostname}
                    onChange={(e) => setFormData({ ...formData, hostname: e.target.value })}
                    placeholder="hostname.local"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">
                  Système d'exploitation
                </label>
                <Input
                  variant="dark"
                  value={formData.os}
                  onChange={(e) => setFormData({ ...formData, os: e.target.value })}
                  placeholder="Linux, Windows, macOS"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">
                  Notes
                </label>
                <textarea
                  className="w-full px-3 py-2 bg-dark-800 border border-dark-600 rounded-md text-dark-100 placeholder-dark-400 focus:outline-none focus:ring-2 focus:ring-cyber-primary"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Notes sur l'hôte..."
                  rows={3}
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Statut
                  </label>
                  <select
                    className="w-full px-3 py-2 bg-dark-800 border border-dark-600 rounded-md text-dark-100"
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                  >
                    <option value="active">Actif</option>
                    <option value="inactive">Inactif</option>
                    <option value="compromised">Compromis</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Priorité
                  </label>
                  <select
                    className="w-full px-3 py-2 bg-dark-800 border border-dark-600 rounded-md text-dark-100"
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value as any })}
                  >
                    <option value="low">Faible</option>
                    <option value="medium">Moyenne</option>
                    <option value="high">Élevée</option>
                    <option value="critical">Critique</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Niveau de compromission
                  </label>
                  <select
                    className="w-full px-3 py-2 bg-dark-800 border border-dark-600 rounded-md text-dark-100"
                    value={formData.compromiseLevel}
                    onChange={(e) => setFormData({ ...formData, compromiseLevel: e.target.value as any })}
                  >
                    <option value="none">Aucun</option>
                    <option value="initial">Initial</option>
                    <option value="partial">Partiel</option>
                    <option value="full">Complet</option>
                  </select>
                </div>
              </div>
              
              <div className="flex justify-end gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onCancel}
                >
                  Annuler
                </Button>
                <Button
                  type="submit"
                  variant="cyber"
                >
                  {host ? 'Modifier' : 'Ajouter'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
};
