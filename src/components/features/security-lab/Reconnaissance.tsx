import React from 'react';
import { Button } from '../../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Input } from '../../ui/input';
import { Textarea } from '../../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';
import { Target, Plus } from 'lucide-react';
import { useHTBStore, type HTBProject, type HTBService } from '../../../stores/htbStore';

interface ReconnaissanceProps {
  selected: HTBProject;
  parsePortScanOutput: (text: string) => HTBService[];
  setServiceIdx: (idx: number) => void;
  setServicePageIdx: (idx: number) => void;
  setServiceNotesDraft: (notes: string) => void;
  setServiceNotesOpen: (open: boolean) => void;
  setDetailTab: (tab: 'recon'|'initial'|'privesc'|'post'|'writeup') => void;
  showAddService: boolean;
  setShowAddService: (show: boolean) => void;
  newService: { port: string; proto: 'tcp' | 'udp'; service: string; version: string };
  setNewService: (service: { port: string; proto: 'tcp' | 'udp'; service: string; version: string }) => void;
}

export const Reconnaissance: React.FC<ReconnaissanceProps> = ({
  selected,
  parsePortScanOutput,
  setServiceIdx,
  setServicePageIdx,
  setServiceNotesDraft,
  setServiceNotesOpen,
  setDetailTab,
  showAddService,
  setShowAddService,
  newService,
  setNewService
}) => {
  const { updateProject } = useHTBStore();

  return (
    <div className="space-y-4">
      <Card className="border-slate-700 bg-slate-800">
        <CardHeader>
          <CardTitle className="text-slate-100 flex items-center gap-2"><Target className="w-4 h-4" /> Projet</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-3 mb-4">
            <div>
              <label className="text-sm text-slate-400">Nom</label>
              <Input value={selected.name} onChange={(e)=>updateProject(selected.id,{ name: e.target.value })} className="mt-1 bg-slate-700 border-slate-600 text-slate-100" />
            </div>
            <div>
              <label className="text-sm text-slate-400">IP</label>
              <Input value={selected.ip||''} onChange={(e)=>updateProject(selected.id,{ ip: e.target.value })} className="mt-1 bg-slate-700 border-slate-600 text-slate-100" />
            </div>
            <div>
              <label className="text-sm text-slate-400">OS</label>
              <Input value={selected.os||''} onChange={(e)=>updateProject(selected.id,{ os: e.target.value })} className="mt-1 bg-slate-700 border-slate-600 text-slate-100" />
            </div>
          </div>
          <div className="grid md:grid-cols-2 gap-3">
            <div>
              <label className="text-sm text-slate-400">Plateforme</label>
              <Select value={selected.platform || 'HackTheBox'} onValueChange={(value: 'HackTheBox' | 'Offsec' | 'TryHackMe' | 'VulnLab' | 'Autre') => updateProject(selected.id, { platform: value })}>
                <SelectTrigger className="mt-1 bg-slate-700 border-slate-600 text-slate-100">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-600">
                  <SelectItem value="HackTheBox">🟢 HackTheBox</SelectItem>
                  <SelectItem value="Offsec">🔴 Offsec (PWK/OSCP)</SelectItem>
                  <SelectItem value="TryHackMe">🟠 TryHackMe</SelectItem>
                  <SelectItem value="VulnLab">🔵 VulnLab</SelectItem>
                  <SelectItem value="Autre">⚪ Autre</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm text-slate-400">Difficulté</label>
              <Select value={selected.difficultyLabel || 'Medium'} onValueChange={(value: 'Easy' | 'Medium' | 'Hard' | 'Insane') => updateProject(selected.id, { difficultyLabel: value })}>
                <SelectTrigger className="mt-1 bg-slate-700 border-slate-600 text-slate-100">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-600">
                  <SelectItem value="Easy">🟢 Easy</SelectItem>
                  <SelectItem value="Medium">🟡 Medium</SelectItem>
                  <SelectItem value="Hard">🔴 Hard</SelectItem>
                  <SelectItem value="Insane">🟣 Insane</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <div className="grid lg:grid-cols-2 gap-4">
        <Card className="border-slate-700 bg-slate-800">
          <CardHeader>
            <CardTitle className="text-slate-100">Reconnaissance passive</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-3">
              <Textarea rows={8} value={selected.passiveNotes} onChange={(e)=>updateProject(selected.id,{ passiveNotes: e.target.value })} className="w-full bg-slate-700 border-slate-600 text-slate-100" placeholder="Domaines, emails, infos publiques…" />
              <div className="space-y-2 text-sm text-slate-300">
                <div className="text-slate-200 font-medium">Raccourcis utiles</div>
                <code className="block bg-slate-900 border border-slate-700 rounded px-2 py-1">whatweb http://{selected.ip || 'TARGET'}</code>
                <code className="block bg-slate-900 border border-slate-700 rounded px-2 py-1">curl -I http://{selected.ip || 'TARGET'}</code>
                <code className="block bg-slate-900 border border-slate-700 rounded px-2 py-1">theHarvester -d example.com -b all</code>
                <code className="block bg-slate-900 border border-slate-700 rounded px-2 py-1">shodan host {selected.ip || 'TARGET'}</code>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-slate-700 bg-slate-800">
          <CardHeader>
            <CardTitle className="text-slate-100">Nmap</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="grid md:grid-cols-2 gap-3">
              <Textarea rows={8} value={selected.nmapRaw} onChange={(e)=>updateProject(selected.id,{ nmapRaw: e.target.value })} className="w-full bg-slate-700 border-slate-600 text-slate-100" placeholder="Collez le résultat de nmap, rustscan, ou tout scan de ports..." />
              <div className="space-y-2 text-sm text-slate-300">
                <div className="text-slate-200 font-medium">Scans rapides</div>
                <code className="block bg-slate-900 border border-slate-700 rounded px-2 py-1">nmap -sV -sC {selected.ip || 'TARGET'}</code>
                <code className="block bg-slate-900 border border-slate-700 rounded px-2 py-1">nmap -p- --min-rate 2000 -sS {selected.ip || 'TARGET'}</code>
                <code className="block bg-slate-900 border border-slate-700 rounded px-2 py-1">rustscan -a {selected.ip || 'TARGET'} -- -sV -sC</code>
                <div className="text-slate-200 font-medium mt-3">Formats supportés</div>
                <div className="text-xs text-slate-400">✅ Nmap standard, nmap détaillé, rustscan, nmap discovery</div>
                <div className="text-xs text-slate-400">✅ Ports simples (80, 443/tcp) ou listes de ports</div>
              </div>
            </div>
            <div className="flex gap-2">
              <Button className="bg-blue-600 hover:bg-blue-700" onClick={()=>{
                const parsed = parsePortScanOutput(selected.nmapRaw);
                updateProject(selected.id,{ services: parsed });
              }}>Analyser</Button>
              <Button variant="outline" className="bg-slate-700 border-slate-600 text-slate-200 hover:bg-slate-600" onClick={()=>updateProject(selected.id,{ nmapRaw: '', services: [] })}>Effacer</Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Services découverts */}
      <Card className="border-slate-700 bg-slate-800">
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-slate-100">Services découverts</CardTitle>
          <Button size="sm" variant="outline" className="bg-slate-700 border-slate-600 text-slate-200 hover:bg-slate-600" onClick={() => setShowAddService(!showAddService)}>
            <Plus className="w-4 h-4 mr-1" /> Ajouter
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {selected.services && selected.services.length > 0 ? (
            selected.services.map((s, idx) => (
              <Card key={idx} className="border-slate-600 bg-slate-700">
                <CardContent className="p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                                              <span className="text-slate-300 font-mono">{s.port}/{s.proto}</span>
                      <span className="text-white">{s.service}</span>
                      <span className="text-slate-400 text-sm">{s.version || '—'}</span>
                      {/* Preview & notes modal trigger */}
                      <div className="flex gap-1">
                        <Button size="sm" variant="outline" className="bg-slate-700 border-slate-600 text-slate-200 hover:bg-slate-600" onClick={() => { setServiceIdx(idx); setServicePageIdx(0); setServiceNotesDraft(s.notes || ''); setServiceNotesOpen(true); }}>Notes</Button>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="bg-orange-700 border-orange-600 text-orange-100 hover:bg-orange-600"
                          onClick={() => {
                            // Ajouter le service à la section d'accès
                            const newExploit = {
                              id: `${Date.now()}`,
                              servicePort: s.port,
                              serviceProto: s.proto,
                              serviceName: s.service,
                              serviceVersion: s.version || '',
                              exploitType: '',
                              details: '',
                              commands: '',
                              status: 'testing' as const
                            };
                            
                            const updatedExploits = [...(selected.serviceExploits || []), newExploit];
                            updateProject(selected.id, { serviceExploits: updatedExploits });
                            
                            // Basculer vers l'onglet accès
                            setDetailTab('initial');
                          }}
                        >
                          🎯 Exploiter
                        </Button>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="outline" className="bg-slate-700 border-slate-600 text-slate-200 hover:bg-slate-600" onClick={() => {
                        const copy = [...selected.services]; copy.splice(idx,1); updateProject(selected.id,{ services: copy });
                      }}>Supprimer</Button>
                    </div>
                  </div>
                  <div className="text-xs text-slate-400">{s.version || '—'}</div>
                  
                  {/* HackTricks links for common services */}
                  {(s.service.toLowerCase().includes('http') || s.service.toLowerCase().includes('apache') || s.service.toLowerCase().includes('nginx')) && (
                    <div className="mt-2 text-xs">
                      <a href="https://book.hacktricks.xyz/network-services-pentesting/pentesting-web" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300">
                        📘 HackTricks: Web Pentesting
                      </a>
                    </div>
                  )}
                  
                  {s.service.toLowerCase().includes('ssh') && (
                    <div className="mt-2 text-xs">
                      <a href="https://book.hacktricks.xyz/network-services-pentesting/pentesting-ssh" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300">
                        📘 HackTricks: SSH Pentesting
                      </a>
                    </div>
                  )}
                  
                  {(s.service.toLowerCase().includes('ftp') || s.port === '21') && (
                    <div className="mt-2 text-xs">
                      <a href="https://book.hacktricks.xyz/network-services-pentesting/pentesting-ftp" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300">
                        📘 HackTricks: FTP Pentesting
                      </a>
                    </div>
                  )}
                  
                  {(s.service.toLowerCase().includes('smb') || s.port === '445' || s.port === '139') && (
                    <div className="mt-2 text-xs">
                      <a href="https://book.hacktricks.xyz/network-services-pentesting/pentesting-smb" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300">
                        📘 HackTricks: SMB Pentesting
                      </a>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          ) : (
            <div className="text-slate-400 text-center py-4">
              Aucun service découvert. Analysez un scan nmap pour commencer.
            </div>
          )}

          {/* Formulaire d'ajout manuel */}
          {showAddService && (
            <Card className="border-blue-600 bg-slate-700">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm text-blue-300">Ajouter un service manuellement</CardTitle>
                  <Button size="sm" variant="ghost" className="text-slate-400 hover:text-white" onClick={() => {
                    setShowAddService(false);
                    setNewService({ port: '', proto: 'tcp', service: '', version: '' });
                  }}>✕</Button>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                  <div>
                    <label className="text-xs text-slate-400">Port</label>
                    <Input 
                      type="number" 
                      min="1" 
                      max="65535"
                      value={newService.port}
                      onChange={(e) => setNewService({...newService, port: e.target.value})}
                      className="mt-1 bg-slate-700 border-slate-600 text-slate-100"
                      placeholder="80"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400">Protocole</label>
                    <Select value={newService.proto} onValueChange={(v: 'tcp' | 'udp') => setNewService({...newService, proto: v})}>
                      <SelectTrigger className="mt-1 bg-slate-700 border-slate-600 text-slate-100">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-800 border-slate-600">
                        <SelectItem value="tcp">TCP</SelectItem>
                        <SelectItem value="udp">UDP</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-xs text-slate-400">Service</label>
                    <Input 
                      value={newService.service}
                      onChange={(e) => setNewService({...newService, service: e.target.value})}
                      className="mt-1 bg-slate-700 border-slate-600 text-slate-100"
                      placeholder="http, ssh, mysql..."
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400">Version</label>
                    <Input 
                      value={newService.version}
                      onChange={(e) => setNewService({...newService, version: e.target.value})}
                      className="mt-1 bg-slate-700 border-slate-600 text-slate-100"
                      placeholder="Apache 2.4.29"
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button 
                    className="bg-green-600 hover:bg-green-700"
                    onClick={() => {
                      const port = Number(newService.port);
                      if (port >= 1 && port <= 65535 && newService.service.trim()) {
                        const updatedServices = [
                          ...selected.services,
                          {
                            port: newService.port,
                            proto: newService.proto,
                            service: newService.service.trim(),
                            version: newService.version.trim() || undefined,
                            notes: ''
                          }
                        ];
                        updateProject(selected.id, { services: updatedServices });
                        setShowAddService(false);
                        setNewService({ port: '', proto: 'tcp', service: '', version: '' });
                      } else {
                        alert('Veuillez renseigner un port valide (1-65535) et un nom de service');
                      }
                    }}
                  >
                    Ajouter
                  </Button>
                  <Button 
                    variant="outline" 
                    className="bg-slate-700 border-slate-600 text-slate-200 hover:bg-slate-600"
                    onClick={() => {
                      setShowAddService(false);
                      setNewService({ port: '', proto: 'tcp', service: '', version: '' });
                    }}
                  >
                    Annuler
                  </Button>
                </div>
              </CardHeader>
            </Card>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
