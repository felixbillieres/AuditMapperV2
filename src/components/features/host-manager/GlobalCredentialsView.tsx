import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  Copy, 
  Download, 
  Shield, 
  Search,
  Eye,
  EyeOff
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useHostStore } from '@/stores/hostStore';

interface GlobalCredentialsViewProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GlobalCredentialsView: React.FC<GlobalCredentialsViewProps> = ({
  isOpen,
  onClose,
}) => {
  const { hosts } = useHostStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [showPasswords, setShowPasswords] = useState(false);

  // Agrégation de tous les credentials
  const allCredentials = React.useMemo(() => {
    const hostArray = Object.values(hosts);
    const credentials: Array<{
      type: 'username' | 'password' | 'hash';
      value: string;
      hostIp: string;
      hostname?: string;
    }> = [];

    hostArray.forEach(host => {
      host.usernames?.forEach(username => {
        credentials.push({
          type: 'username',
          value: username,
          hostIp: host.ip,
          hostname: host.hostname,
        });
      });

      host.passwords?.forEach(password => {
        credentials.push({
          type: 'password',
          value: password,
          hostIp: host.ip,
          hostname: host.hostname,
        });
      });

      host.hashes?.forEach(hash => {
        credentials.push({
          type: 'hash',
          value: hash,
          hostIp: host.ip,
          hostname: host.hostname,
        });
      });
    });

    return credentials;
  }, [hosts]);

  // Filtrage par recherche
  const filteredCredentials = allCredentials.filter(cred =>
    cred.value.toLowerCase().includes(searchTerm.toLowerCase()) ||
    cred.hostIp.includes(searchTerm) ||
    (cred.hostname && cred.hostname.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Groupement par type
  const credentialsByType = {
    usernames: filteredCredentials.filter(c => c.type === 'username'),
    passwords: filteredCredentials.filter(c => c.type === 'password'),
    hashes: filteredCredentials.filter(c => c.type === 'hash'),
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const copyAllByType = (type: 'usernames' | 'passwords' | 'hashes') => {
    const values = credentialsByType[type].map(c => c.value).join('\n');
    navigator.clipboard.writeText(values);
  };

  const exportCredentials = () => {
    const data = {
      usernames: credentialsByType.usernames.map(c => ({
        value: c.value,
        host: c.hostIp,
        hostname: c.hostname
      })),
      passwords: credentialsByType.passwords.map(c => ({
        value: c.value,
        host: c.hostIp,
        hostname: c.hostname
      })),
      hashes: credentialsByType.hashes.map(c => ({
        value: c.value,
        host: c.hostIp,
        hostname: c.hostname
      })),
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'all-credentials.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4"
        onClick={(e) => e.target === e.currentTarget && onClose()}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="w-full max-w-6xl max-h-[90vh] bg-slate-800 rounded-lg border border-slate-700 overflow-hidden flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-slate-700 bg-gradient-to-r from-slate-800 to-slate-700">
            <div className="flex items-center gap-3">
              <Shield className="w-6 h-6 text-purple-400" />
              <div>
                <h2 className="text-xl font-semibold text-slate-100">
                  Tous les Credentials ({allCredentials.length})
                </h2>
                <p className="text-sm text-slate-400">
                  Vue globale pour password spraying et enumération
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowPasswords(!showPasswords)}
                className="bg-slate-700 border-slate-600 text-slate-200 hover:bg-slate-600"
              >
                {showPasswords ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                {showPasswords ? 'Masquer' : 'Montrer'} passwords
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={exportCredentials}
                className="bg-slate-700 border-slate-600 text-slate-200 hover:bg-slate-600"
              >
                <Download className="w-4 h-4 mr-2" />
                Exporter
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={onClose}
                className="bg-slate-700 border-slate-600 text-slate-200 hover:bg-slate-600"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Search */}
          <div className="p-4 border-b border-slate-700">
            <div className="relative">
              <Search className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-slate-700 border-slate-600 text-slate-100"
                placeholder="Rechercher par credential, IP ou hostname..."
              />
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-auto p-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Usernames */}
              <Card className="border-slate-700 bg-slate-800">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-green-400 flex items-center gap-2">
                      👤 Usernames ({credentialsByType.usernames.length})
                    </CardTitle>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyAllByType('usernames')}
                      className="bg-slate-700 border-slate-600 text-slate-200 hover:bg-slate-600"
                    >
                      <Copy className="w-3 h-3 mr-1" />
                      Copier tout
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2 max-h-96 overflow-y-auto">
                  {credentialsByType.usernames.map((cred, index) => (
                    <div key={index} className="flex items-center gap-2 p-2 bg-slate-700/50 rounded text-sm">
                      <code className="flex-1 text-green-400 font-mono">{cred.value}</code>
                      <span className="text-xs text-slate-400">{cred.hostname || cred.hostIp}</span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyToClipboard(cred.value)}
                        className="bg-slate-600 border-slate-500 text-slate-200 hover:bg-slate-500 p-1"
                      >
                        📋
                      </Button>
                    </div>
                  ))}
                  {credentialsByType.usernames.length === 0 && (
                    <p className="text-slate-500 text-sm italic">Aucun username trouvé</p>
                  )}
                </CardContent>
              </Card>

              {/* Passwords */}
              <Card className="border-slate-700 bg-slate-800">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-yellow-400 flex items-center gap-2">
                      🔑 Passwords ({credentialsByType.passwords.length})
                    </CardTitle>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyAllByType('passwords')}
                      className="bg-slate-700 border-slate-600 text-slate-200 hover:bg-slate-600"
                    >
                      <Copy className="w-3 h-3 mr-1" />
                      Copier tout
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2 max-h-96 overflow-y-auto">
                  {credentialsByType.passwords.map((cred, index) => (
                    <div key={index} className="flex items-center gap-2 p-2 bg-slate-700/50 rounded text-sm">
                      <code className="flex-1 text-yellow-400 font-mono">
                        {showPasswords ? cred.value : '•'.repeat(cred.value.length)}
                      </code>
                      <span className="text-xs text-slate-400">{cred.hostname || cred.hostIp}</span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyToClipboard(cred.value)}
                        className="bg-slate-600 border-slate-500 text-slate-200 hover:bg-slate-500 p-1"
                      >
                        📋
                      </Button>
                    </div>
                  ))}
                  {credentialsByType.passwords.length === 0 && (
                    <p className="text-slate-500 text-sm italic">Aucun password trouvé</p>
                  )}
                </CardContent>
              </Card>

              {/* Hashes */}
              <Card className="border-slate-700 bg-slate-800">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-orange-400 flex items-center gap-2">
                      🔐 Hashes ({credentialsByType.hashes.length})
                    </CardTitle>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyAllByType('hashes')}
                      className="bg-slate-700 border-slate-600 text-slate-200 hover:bg-slate-600"
                    >
                      <Copy className="w-3 h-3 mr-1" />
                      Copier tout
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2 max-h-96 overflow-y-auto">
                  {credentialsByType.hashes.map((cred, index) => (
                    <div key={index} className="flex items-center gap-2 p-2 bg-slate-700/50 rounded text-sm">
                      <code className="flex-1 text-orange-400 font-mono text-xs truncate">{cred.value}</code>
                      <span className="text-xs text-slate-400">{cred.hostname || cred.hostIp}</span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyToClipboard(cred.value)}
                        className="bg-slate-600 border-slate-500 text-slate-200 hover:bg-slate-500 p-1"
                      >
                        📋
                      </Button>
                    </div>
                  ))}
                  {credentialsByType.hashes.length === 0 && (
                    <p className="text-slate-500 text-sm italic">Aucun hash trouvé</p>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between p-6 border-t border-slate-700 bg-slate-800/80">
            <div className="text-sm text-slate-400">
              💡 Tip: Utilisez ces credentials pour du password spraying avec hydra, medusa ou crackmapexec
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
