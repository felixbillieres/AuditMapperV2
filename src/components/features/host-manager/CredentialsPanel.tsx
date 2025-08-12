import React from 'react';
import { motion } from 'framer-motion';
import { X, Copy, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AggregatedCredentials } from '@/types';
import { copyToClipboard } from '@/utils';

interface CredentialsPanelProps {
  credentials: AggregatedCredentials;
  onClose: () => void;
}

export const CredentialsPanel: React.FC<CredentialsPanelProps> = ({
  credentials,
  onClose,
}) => {
  const handleCopyAll = async () => {
    const text = `
=== CREDENTIALS AGGREGÉS ===

Usernames (${credentials.uniqueUsernames}):
${credentials.usernames.join('\n')}

Passwords (${credentials.uniquePasswords}):
${credentials.passwords.join('\n')}

Hashes (${credentials.uniqueHashes}):
${credentials.hashes.join('\n')}
    `.trim();
    
    await copyToClipboard(text);
  };

  const handleExport = () => {
    const data = {
      usernames: credentials.usernames,
      passwords: credentials.passwords,
      hashes: credentials.hashes,
      stats: {
        total: credentials.totalCredentials,
        uniqueUsernames: credentials.uniqueUsernames,
        uniquePasswords: credentials.uniquePasswords,
        uniqueHashes: credentials.uniqueHashes,
      },
      exportedAt: new Date().toISOString(),
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `auditmapper-credentials-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

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
            <CardTitle className="text-xl">Credentials Agrégés</CardTitle>
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
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Usernames */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">Usernames ({credentials.uniqueUsernames})</h3>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(credentials.usernames.join('\n'))}
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
                <div className="bg-dark-800 border border-dark-600 rounded-md p-4 max-h-64 overflow-y-auto">
                  {credentials.usernames.length > 0 ? (
                    <div className="space-y-1">
                      {credentials.usernames.map((username, index) => (
                        <div key={index} className="font-mono text-sm text-cyber-primary">
                          {username}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-dark-400 text-sm">Aucun username trouvé</div>
                  )}
                </div>
              </div>
              
              {/* Passwords */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">Passwords ({credentials.uniquePasswords})</h3>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(credentials.passwords.join('\n'))}
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
                <div className="bg-dark-800 border border-dark-600 rounded-md p-4 max-h-64 overflow-y-auto">
                  {credentials.passwords.length > 0 ? (
                    <div className="space-y-1">
                      {credentials.passwords.map((password, index) => (
                        <div key={index} className="font-mono text-sm text-cyber-secondary">
                          {password}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-dark-400 text-sm">Aucun password trouvé</div>
                  )}
                </div>
              </div>
              
              {/* Hashes */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">Hashes ({credentials.uniqueHashes})</h3>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(credentials.hashes.join('\n'))}
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
                <div className="bg-dark-800 border border-dark-600 rounded-md p-4 max-h-64 overflow-y-auto">
                  {credentials.hashes.length > 0 ? (
                    <div className="space-y-1">
                      {credentials.hashes.map((hash, index) => (
                        <div key={index} className="font-mono text-sm text-cyber-accent">
                          {hash}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-dark-400 text-sm">Aucun hash trouvé</div>
                  )}
                </div>
              </div>
            </div>
            
            {/* Actions */}
            <div className="flex justify-center gap-4 mt-6 pt-6 border-t border-dark-600">
              <Button
                variant="cyber"
                onClick={handleCopyAll}
                className="flex items-center gap-2"
              >
                <Copy className="w-4 h-4" />
                Copier Tout
              </Button>
              
              <Button
                variant="outline"
                onClick={handleExport}
                className="flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Exporter JSON
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
};
