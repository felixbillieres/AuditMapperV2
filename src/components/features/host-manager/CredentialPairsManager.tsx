import React, { useState } from 'react';
import { Plus, X, Copy, Eye, EyeOff, Edit, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Host } from '@/types';

interface CredentialPair {
  id: string;
  username: string;
  password: string;
  domain?: string;
  comment?: string;
  isValid?: boolean;
  source?: string;
}

interface CredentialPairsManagerProps {
  host: Host;
  onUpdateHost: (hostId: string, updates: Partial<Host>) => void;
}

export const CredentialPairsManager: React.FC<CredentialPairsManagerProps> = ({
  host,
  onUpdateHost,
}) => {
  const [showPasswords, setShowPasswords] = useState(false);
  const [editingPair, setEditingPair] = useState<CredentialPair | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newPair, setNewPair] = useState({
    username: '',
    password: '',
    domain: '',
    comment: '',
    isValid: true,
    source: 'manual'
  });

  // Récupérer les paires de credentials du host
  const credentialPairs = (host.credentials || [])
    .filter(cred => cred.type === 'credential_pair')
    .map(cred => ({
      id: cred.id || `${cred.username}-${Date.now()}`,
      username: cred.username || '',
      password: cred.password || '',
      domain: cred.domain,
      comment: cred.comment,
      isValid: cred.isValid,
      source: cred.source
    }));

  const handleAddPair = () => {
    if (!newPair.username || !newPair.password) return;

    const pairId = `pair-${Date.now()}`;
    const newCredential = {
      id: pairId,
      type: 'credential_pair' as const,
      username: newPair.username,
      password: newPair.password,
      domain: newPair.domain || undefined,
      comment: newPair.comment || undefined,
      isValid: newPair.isValid,
      source: newPair.source
    };

    const updatedCredentials = [...(host.credentials || []), newCredential];
    onUpdateHost(host.id, { credentials: updatedCredentials });

    // Reset form
    setNewPair({
      username: '',
      password: '',
      domain: '',
      comment: '',
      isValid: true,
      source: 'manual'
    });
    setShowAddForm(false);
  };

  const handleEditPair = (pair: CredentialPair) => {
    setEditingPair(pair);
    setNewPair({
      username: pair.username,
      password: pair.password,
      domain: pair.domain || '',
      comment: pair.comment || '',
      isValid: pair.isValid || true,
      source: pair.source || 'manual'
    });
    setShowAddForm(true);
  };

  const handleUpdatePair = () => {
    if (!editingPair || !newPair.username || !newPair.password) return;

    const updatedCredentials = (host.credentials || []).map(cred => 
      cred.id === editingPair.id 
        ? {
            ...cred,
            username: newPair.username,
            password: newPair.password,
            domain: newPair.domain || undefined,
            comment: newPair.comment || undefined,
            isValid: newPair.isValid,
            source: newPair.source
          }
        : cred
    );

    onUpdateHost(host.id, { credentials: updatedCredentials });
    setEditingPair(null);
    setShowAddForm(false);
    setNewPair({
      username: '',
      password: '',
      domain: '',
      comment: '',
      isValid: true,
      source: 'manual'
    });
  };

  const handleDeletePair = (pairId: string) => {
    const updatedCredentials = (host.credentials || []).filter(cred => cred.id !== pairId);
    onUpdateHost(host.id, { credentials: updatedCredentials });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const copyPair = (pair: CredentialPair) => {
    const pairText = `${pair.username}:${pair.password}`;
    copyToClipboard(pairText);
  };

  return (
    <Card className="border-slate-700 bg-slate-800">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-purple-400 flex items-center gap-2 text-sm">
            🔗 Paires de Credentials ({credentialPairs.length})
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowPasswords(!showPasswords)}
              className="bg-slate-700 border-slate-600 text-slate-200 hover:bg-slate-600"
            >
              {showPasswords ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setEditingPair(null);
                setShowAddForm(true);
              }}
              className="bg-slate-700 border-slate-600 text-slate-200 hover:bg-slate-600"
            >
              <Plus className="w-3 h-3" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 max-h-80 overflow-y-auto">
        {/* Formulaire d'ajout/modification */}
        {showAddForm && (
          <div className="p-3 bg-slate-700/50 rounded border border-slate-600">
            <h4 className="text-sm font-medium text-slate-200 mb-3">
              {editingPair ? 'Modifier la paire' : 'Nouvelle paire de credentials'}
            </h4>
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <Input
                  placeholder="Username"
                  value={newPair.username}
                  onChange={(e) => setNewPair({ ...newPair, username: e.target.value })}
                  className="bg-slate-800 border-slate-600 text-slate-100 text-sm"
                />
                <Input
                  placeholder="Password"
                  type={showPasswords ? 'text' : 'password'}
                  value={newPair.password}
                  onChange={(e) => setNewPair({ ...newPair, password: e.target.value })}
                  className="bg-slate-800 border-slate-600 text-slate-100 text-sm"
                />
              </div>
              <Input
                placeholder="Domain (optionnel)"
                value={newPair.domain}
                onChange={(e) => setNewPair({ ...newPair, domain: e.target.value })}
                className="bg-slate-800 border-slate-600 text-slate-100 text-sm"
              />
              <Input
                placeholder="Commentaire (optionnel)"
                value={newPair.comment}
                onChange={(e) => setNewPair({ ...newPair, comment: e.target.value })}
                className="bg-slate-800 border-slate-600 text-slate-100 text-sm"
              />
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-2 text-xs text-slate-300">
                  <input
                    type="checkbox"
                    checked={newPair.isValid}
                    onChange={(e) => setNewPair({ ...newPair, isValid: e.target.checked })}
                    className="rounded"
                  />
                  Credentials valides
                </label>
                <Select
                  value={newPair.source}
                  onValueChange={(value) => setNewPair({ ...newPair, source: value })}
                >
                  <SelectTrigger className="bg-slate-800 border-slate-600 text-slate-100 text-xs h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-600">
                    <SelectItem value="manual">Manuel</SelectItem>
                    <SelectItem value="crackmapexec">CrackMapExec</SelectItem>
                    <SelectItem value="hydra">Hydra</SelectItem>
                    <SelectItem value="medusa">Medusa</SelectItem>
                    <SelectItem value="other">Autre</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={editingPair ? handleUpdatePair : handleAddPair}
                  className="bg-blue-600 hover:bg-blue-700 text-white text-xs"
                >
                  {editingPair ? 'Modifier' : 'Ajouter'}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setShowAddForm(false);
                    setEditingPair(null);
                    setNewPair({
                      username: '',
                      password: '',
                      domain: '',
                      comment: '',
                      isValid: true,
                      source: 'manual'
                    });
                  }}
                  className="bg-slate-600 border-slate-500 text-slate-200 hover:bg-slate-500 text-xs"
                >
                  Annuler
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Liste des paires existantes */}
        {credentialPairs.length === 0 ? (
          <p className="text-slate-500 text-sm italic">Aucune paire de credentials</p>
        ) : (
          credentialPairs.map((pair) => (
            <div key={pair.id} className="p-3 bg-slate-700/50 rounded border border-slate-600">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${pair.isValid ? 'bg-green-500' : 'bg-red-500'}`} />
                  <span className="text-slate-100 font-medium text-xs">
                    {pair.isValid ? 'Valides' : 'Invalides'}
                  </span>
                  {pair.source && (
                    <span className="text-xs text-slate-400 bg-slate-600 px-2 py-1 rounded">
                      {pair.source}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyPair(pair)}
                    className="bg-slate-600 border-slate-500 text-slate-200 hover:bg-slate-500 p-1"
                    title="Copier username:password"
                  >
                    <Copy className="w-3 h-3" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEditPair(pair)}
                    className="bg-slate-600 border-slate-500 text-slate-200 hover:bg-slate-500 p-1"
                    title="Modifier"
                  >
                    <Edit className="w-3 h-3" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDeletePair(pair.id)}
                    className="bg-red-600 hover:bg-red-700 text-white p-1"
                    title="Supprimer"
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-slate-400 w-12 text-xs">User:</span>
                  <span className="text-blue-400 font-mono text-xs">{pair.username}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-slate-400 w-12 text-xs">Pass:</span>
                  <span className="text-yellow-400 font-mono text-xs">
                    {showPasswords ? pair.password : '••••••••'}
                  </span>
                </div>
                {pair.domain && (
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400 w-12 text-xs">Domain:</span>
                    <span className="text-slate-300 font-mono text-xs">{pair.domain}</span>
                  </div>
                )}
                {pair.comment && (
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400 w-12 text-xs">Note:</span>
                    <span className="text-slate-300 text-xs">{pair.comment}</span>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
};

export default CredentialPairsManager;
