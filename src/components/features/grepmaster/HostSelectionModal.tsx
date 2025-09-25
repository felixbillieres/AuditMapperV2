import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Search, Check, Edit3, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useHostStore } from '@/stores/hostStore';
import { Host } from '@/types';

interface HostSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (hostId: string, modifiedOutput: string) => void;
  outputToInject: string[];
  extractionType: string;
}

export const HostSelectionModal: React.FC<HostSelectionModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  outputToInject,
  extractionType,
}) => {
  const { hosts } = useHostStore();
  const [selectedHostId, setSelectedHostId] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [modifiedOutput, setModifiedOutput] = useState<string>('');
  const [showPreview, setShowPreview] = useState(false);

  // Initialiser l'output modifiable
  React.useEffect(() => {
    if (outputToInject.length > 0) {
      setModifiedOutput(outputToInject.join('\n'));
    }
  }, [outputToInject]);

  // Filtrer les hosts selon la recherche
  const filteredHosts = useMemo(() => {
    const allHosts = Object.values(hosts);
    if (!searchTerm.trim()) return allHosts;
    
    return allHosts.filter(host => 
      host.ip.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (host.hostname && host.hostname.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (host.os && host.os.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [hosts, searchTerm]);

  const selectedHost = selectedHostId ? hosts[selectedHostId] : null;

  const handleConfirm = () => {
    if (selectedHostId && modifiedOutput.trim()) {
      onConfirm(selectedHostId, modifiedOutput);
      onClose();
    }
  };

  const getTypeLabel = (type: string) => {
    const typeLabels: Record<string, string> = {
      'users': 'Utilisateurs',
      'hashes': 'Hashes',
      'passwords': 'Mots de passe',
      'domains': 'Domaines',
      'ips': 'IPs',
      'emails': 'Emails',
      'credentials': 'Credentials',
      'kerberos': 'Kerberos',
      'secrets': 'Secrets',
      'machineAccounts': 'Comptes Machine',
      'services': 'Services',
      'ports': 'Ports',
      'ntlm': 'Hashes NTLM',
      'aes': 'Clés AES',
      'sam': 'SAM Hashes',
      'lsass': 'LSASS Credentials',
    };
    return typeLabels[type] || type;
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="relative w-full max-w-6xl max-h-[90vh] mx-4 bg-slate-800 border border-slate-600 rounded-xl shadow-2xl overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-slate-700 bg-gradient-to-r from-slate-800 to-slate-700">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-600/20 flex items-center justify-center">
                <Check className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-slate-100">
                  Cibler un host pour injection
                </h2>
                <p className="text-sm text-slate-400">
                  Sélectionnez un host et ajustez l'output avant injection
                </p>
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

          <div className="flex h-[calc(90vh-120px)]">
            {/* Panel de gauche - Sélection des hosts */}
            <div className="w-1/2 border-r border-slate-700 flex flex-col">
              <div className="p-4 border-b border-slate-700">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                  <Input
                    placeholder="Rechercher par IP, hostname, OS..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 bg-slate-700 border-slate-600 text-slate-100"
                  />
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4">
                <div className="space-y-3">
                  {filteredHosts.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-slate-400">Aucun host trouvé</p>
                    </div>
                  ) : (
                    filteredHosts.map((host) => (
                      <Card
                        key={host.id}
                        className={`cursor-pointer transition-all duration-200 ${
                          selectedHostId === host.id
                            ? 'bg-blue-600/20 border-blue-500 ring-2 ring-blue-500/50'
                            : 'bg-slate-700/50 border-slate-600 hover:bg-slate-700 hover:border-slate-500'
                        }`}
                        onClick={() => setSelectedHostId(host.id)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <div className="w-3 h-3 rounded-full bg-green-500" />
                                <h3 className="font-mono text-lg font-semibold text-slate-100">
                                  {host.ip}
                                </h3>
                                {selectedHostId === host.id && (
                                  <Check className="w-4 h-4 text-blue-400" />
                                )}
                              </div>
                              <p className="text-sm text-slate-300">
                                {host.hostname || 'Sans nom'}
                              </p>
                              <p className="text-xs text-slate-400">
                                {host.os || 'OS inconnu'} • {host.status}
                              </p>
                            </div>
                            <div className="text-right">
                              <div className="text-xs text-slate-400">
                                {host.usernames?.length || 0} users
                              </div>
                              <div className="text-xs text-slate-400">
                                {host.passwords?.length || 0} passwords
                              </div>
                              <div className="text-xs text-slate-400">
                                {host.hashes?.length || 0} hashes
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Panel de droite - Aperçu et modification */}
            <div className="w-1/2 flex flex-col">
              {selectedHost ? (
                <>
                  <div className="p-4 border-b border-slate-700">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h3 className="text-lg font-semibold text-slate-100">
                          {selectedHost.ip} - {selectedHost.hostname || 'Sans nom'}
                        </h3>
                        <p className="text-sm text-slate-400">
                          Injection de {getTypeLabel(extractionType)} ({outputToInject.length} éléments)
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowPreview(!showPreview)}
                        className="bg-slate-700 border-slate-600 text-slate-200 hover:bg-slate-600"
                      >
                        <Edit3 className="w-4 h-4 mr-2" />
                        {showPreview ? 'Masquer' : 'Aperçu'}
                      </Button>
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto p-4">
                    {showPreview ? (
                      <div className="space-y-4">
                        {/* Avertissement */}
                        <div className="p-3 bg-orange-900/20 border border-orange-700/50 rounded-lg">
                          <div className="flex items-start gap-2">
                            <AlertCircle className="w-4 h-4 text-orange-400 mt-0.5 flex-shrink-0" />
                            <div>
                              <p className="text-orange-200 text-sm font-medium">
                                Mes regex marchent ou y'a besoin de modifier un peu l'output avant ?
                              </p>
                              <p className="text-orange-300 text-xs mt-1">
                                Vous pouvez ajuster l'output ci-dessous avant l'injection dans le host.
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Zone d'édition */}
                        <div>
                          <label className="text-sm font-medium text-slate-300 mb-2 block">
                            Output à injecter (modifiable)
                          </label>
                          <Textarea
                            value={modifiedOutput}
                            onChange={(e) => setModifiedOutput(e.target.value)}
                            rows={12}
                            className="bg-slate-900 border-slate-600 text-slate-100 font-mono text-sm"
                            placeholder="Ajustez l'output ici..."
                          />
                          <div className="mt-2 text-xs text-slate-400">
                            {modifiedOutput.split('\n').filter(line => line.trim()).length} lignes • {modifiedOutput.length} caractères
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <Edit3 className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                        <p className="text-slate-400">
                          Cliquez sur "Aperçu" pour voir et modifier l'output
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Footer avec boutons */}
                  <div className="p-4 border-t border-slate-700 bg-slate-800/80">
                    <div className="flex justify-between items-center">
                      <div className="text-sm text-slate-400">
                        {selectedHost.usernames?.length || 0} users • {selectedHost.passwords?.length || 0} passwords • {selectedHost.hashes?.length || 0} hashes
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          onClick={onClose}
                          className="bg-slate-700 border-slate-600 text-slate-200 hover:bg-slate-600"
                        >
                          Annuler
                        </Button>
                        <Button
                          onClick={handleConfirm}
                          disabled={!selectedHostId || !modifiedOutput.trim()}
                          className="bg-blue-600 hover:bg-blue-700 text-white"
                        >
                          Injecter dans le host
                        </Button>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-center">
                    <Check className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                    <p className="text-slate-400">
                      Sélectionnez un host pour voir l'aperçu
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default HostSelectionModal;
