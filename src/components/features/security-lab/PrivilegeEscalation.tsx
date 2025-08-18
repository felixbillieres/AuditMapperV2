import React from 'react';
import { Button } from '../../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Input } from '../../ui/input';
import { Trash2, Copy } from 'lucide-react';
import { useHTBStore, type HTBProject } from '../../../stores/htbStore';

interface PrivilegeEscalationProps {
  selected: HTBProject;
  setEditingStep: (step: any) => void;
  setExploitModalOpen: (open: boolean) => void;
}

export const PrivilegeEscalation: React.FC<PrivilegeEscalationProps> = ({
  selected,
  setEditingStep,
  setExploitModalOpen
}) => {
  const { updateProject } = useHTBStore();

  return (
    <div className="space-y-6">
      {/* OS-Specific Privesc Commands */}
      <Card className="border-yellow-600 bg-slate-800">
        <CardHeader>
          <CardTitle className="text-yellow-300">🔓 Commandes Privesc par OS</CardTitle>
          <p className="text-slate-400 text-sm">Commandes d'énumération et d'escalade selon l'OS de la cible</p>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-6">
            
            {/* Linux Privesc */}
            <Card className="border-green-600 bg-slate-700">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm text-green-300 flex items-center gap-2">
                  🐧 Linux Privilege Escalation
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Automated Enumeration */}
                <div>
                  <div className="text-xs text-green-300 font-medium mb-2">Énumération automatisée</div>
                  <div className="space-y-1">
                    <div className="relative group">
                      <code className="block bg-slate-900 border border-slate-600 rounded px-2 py-1 text-green-400 text-xs cursor-pointer" onClick={() => navigator.clipboard.writeText('linpeas.sh')}>
                        linpeas.sh
                      </code>
                      <Button 
                        variant="ghost"
                        size="sm"
                        className="absolute right-1 top-1 h-4 w-4 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => navigator.clipboard.writeText('linpeas.sh')}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                    <div className="relative group">
                      <code className="block bg-slate-900 border border-slate-600 rounded px-2 py-1 text-green-400 text-xs cursor-pointer" onClick={() => navigator.clipboard.writeText('linenum.sh')}>
                        linenum.sh
                      </code>
                      <Button 
                        variant="ghost"
                        size="sm"
                        className="absolute right-1 top-1 h-4 w-4 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => navigator.clipboard.writeText('linenum.sh')}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                    <div className="relative group">
                      <code className="block bg-slate-900 border border-slate-600 rounded px-2 py-1 text-green-400 text-xs cursor-pointer" onClick={() => navigator.clipboard.writeText('unix-privesc-check')}>
                        unix-privesc-check
                      </code>
                      <Button 
                        variant="ghost"
                        size="sm"
                        className="absolute right-1 top-1 h-4 w-4 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => navigator.clipboard.writeText('unix-privesc-check')}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Manual Enumeration */}
                <div>
                  <div className="text-xs text-green-300 font-medium mb-2">Énumération manuelle</div>
                  <div className="space-y-1">
                    {[
                      'id',
                      'sudo -l',
                      'find / -perm -u=s -type f 2>/dev/null',
                      'find / -perm -4000 -type f -exec ls -la {} 2>/dev/null \\;',
                      'find / -writable -type d 2>/dev/null',
                      'cat /etc/passwd',
                      'cat /etc/group',
                      'crontab -l',
                      'cat /etc/crontab',
                      'ps aux',
                      'netstat -antup',
                      'ss -anp'
                    ].map((cmd, i) => (
                      <div key={i} className="relative group">
                        <code className="block bg-slate-900 border border-slate-600 rounded px-2 py-1 text-green-400 text-xs cursor-pointer" onClick={() => navigator.clipboard.writeText(cmd)}>
                          {cmd}
                        </code>
                        <Button 
                          variant="ghost"
                          size="sm"
                          className="absolute right-1 top-1 h-4 w-4 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => navigator.clipboard.writeText(cmd)}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Credentials */}
                <div>
                  <div className="text-xs text-green-300 font-medium mb-2">Recherche de credentials</div>
                  <div className="space-y-1">
                    {[
                      'find / -name "*.txt" -exec grep -l "password" {} \\; 2>/dev/null',
                      'grep -r "password" /var/log/ 2>/dev/null',
                      'find /home -name ".*" -type f 2>/dev/null',
                      'cat ~/.bash_history',
                      'cat ~/.ssh/id_rsa',
                      'cat ~/.ssh/id_dsa'
                    ].map((cmd, i) => (
                      <div key={i} className="relative group">
                        <code className="block bg-slate-900 border border-slate-600 rounded px-2 py-1 text-green-400 text-xs cursor-pointer" onClick={() => navigator.clipboard.writeText(cmd)}>
                          {cmd}
                        </code>
                        <Button 
                          variant="ghost"
                          size="sm"
                          className="absolute right-1 top-1 h-4 w-4 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => navigator.clipboard.writeText(cmd)}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Windows Privesc */}
            <Card className="border-blue-600 bg-slate-700">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm text-blue-300 flex items-center gap-2">
                  🪟 Windows Privilege Escalation
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Automated Enumeration */}
                <div>
                  <div className="text-xs text-blue-300 font-medium mb-2">Énumération automatisée</div>
                  <div className="space-y-1">
                    {[
                      'winpeas.exe',
                      'powerup.ps1',
                      'privesc.ps1',
                      'jaws-enum.ps1'
                    ].map((cmd, i) => (
                      <div key={i} className="relative group">
                        <code className="block bg-slate-900 border border-slate-600 rounded px-2 py-1 text-blue-400 text-xs cursor-pointer" onClick={() => navigator.clipboard.writeText(cmd)}>
                          {cmd}
                        </code>
                        <Button 
                          variant="ghost"
                          size="sm"
                          className="absolute right-1 top-1 h-4 w-4 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => navigator.clipboard.writeText(cmd)}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Manual Enumeration */}
                <div>
                  <div className="text-xs text-blue-300 font-medium mb-2">Énumération manuelle</div>
                  <div className="space-y-1">
                    {[
                      'whoami',
                      'whoami /priv',
                      'net user',
                      'net localgroup administrators',
                      'systeminfo',
                      'wmic qfe list',
                      'netstat -ano',
                      'tasklist /svc',
                      'schtasks /query /fo LIST',
                      'wmic service list',
                      'reg query HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\Installer\\AlwaysInstallElevated',
                      'reg query HKCU\\SOFTWARE\\Policies\\Microsoft\\Windows\\Installer\\AlwaysInstallElevated'
                    ].map((cmd, i) => (
                      <div key={i} className="relative group">
                        <code className="block bg-slate-900 border border-slate-600 rounded px-2 py-1 text-blue-400 text-xs cursor-pointer" onClick={() => navigator.clipboard.writeText(cmd)}>
                          {cmd}
                        </code>
                        <Button 
                          variant="ghost"
                          size="sm"
                          className="absolute right-1 top-1 h-4 w-4 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => navigator.clipboard.writeText(cmd)}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Registry & Passwords */}
                <div>
                  <div className="text-xs text-blue-300 font-medium mb-2">Registre et mots de passe</div>
                  <div className="space-y-1">
                    {[
                      'reg query HKLM /f password /t REG_SZ /s',
                      'reg query HKCU /f password /t REG_SZ /s',
                      'dir /s *pass* == *cred* == *vnc* == *.config*',
                      'findstr /si password *.xml *.ini *.txt',
                      'reg query "HKLM\\SOFTWARE\\Microsoft\\Windows NT\\Currentversion\\Winlogon"'
                    ].map((cmd, i) => (
                      <div key={i} className="relative group">
                        <code className="block bg-slate-900 border border-slate-600 rounded px-2 py-1 text-blue-400 text-xs cursor-pointer" onClick={() => navigator.clipboard.writeText(cmd)}>
                          {cmd}
                        </code>
                        <Button 
                          variant="ghost"
                          size="sm"
                          className="absolute right-1 top-1 h-4 w-4 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => navigator.clipboard.writeText(cmd)}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Common Exploits */}
                <div>
                  <div className="text-xs text-blue-300 font-medium mb-2">Exploits courants</div>
                  <div className="space-y-1">
                    {[
                      'MS17-010 (EternalBlue)',
                      'MS16-032',
                      'MS15-051',
                      'MS14-068 (Kerberos)',
                      'Hot Potato',
                      'Rotten Potato',
                      'Juicy Potato'
                    ].map((exploit, i) => (
                      <div key={i} className="bg-slate-900 border border-slate-600 rounded px-2 py-1">
                        <span className="text-blue-400 text-xs">{exploit}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>

      <div className="grid lg:grid-cols-2 gap-4">
        <Card className="border-slate-700 bg-slate-800">
          <CardHeader>
            <CardTitle className="text-slate-100">Checklist Privesc</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex gap-2">
              <Input placeholder="Nouvel item" className="bg-slate-700 border-slate-600 text-slate-100" id="peItem" />
              <Button className="bg-blue-600 hover:bg-blue-700" onClick={()=>{
                const item = (document.getElementById('peItem') as HTMLInputElement).value;
                if(item.trim()) {
                  const newTask = { id: `${Date.now()}`, text: item.trim(), status: 'todo' as const };
                  updateProject(selected.id,{ privescChecklist: [...(selected.privescChecklist || []), newTask] });
                  (document.getElementById('peItem') as HTMLInputElement).value = '';
                }
              }}>Ajouter</Button>
            </div>
            <div className="space-y-2">
              {(selected.privescChecklist || []).map((task, i) => (
                <div key={i} className="flex items-center justify-between p-2 bg-slate-700 rounded border border-slate-600">
                  <div className="flex items-center gap-2">
                    <input type="checkbox" checked={task.status === 'done'} onChange={(e) => {
                      const copy = [...(selected.privescChecklist || [])];
                      copy[i] = { ...task, status: e.target.checked ? 'done' as const : 'todo' as const };
                      updateProject(selected.id, { privescChecklist: copy });
                    }} className="accent-blue-500" />
                    <span className={`text-sm ${task.status === 'done' ? 'line-through text-slate-400' : 'text-slate-100'}`}>{task.text}</span>
                  </div>
                  <Button size="sm" variant="outline" className="bg-red-700 border-red-600 text-red-200 hover:bg-red-600" onClick={()=>{
                    const copy = [...(selected.privescChecklist || [])]; copy.splice(i,1); updateProject(selected.id,{ privescChecklist: copy });
                  }}><Trash2 className="w-3 h-3" /></Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-slate-700 bg-slate-800">
          <CardHeader>
            <CardTitle className="text-slate-100">Journal des exploits (Privesc)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex justify-end mb-2">
              <Button variant="outline" className="bg-slate-700 border-slate-600 text-slate-200 hover:bg-slate-600" onClick={()=> { setEditingStep(null); setExploitModalOpen(true); }}>+ Nouvelle étape</Button>
            </div>
            {selected.exploitLog.length === 0 ? (
              <div className="text-slate-400 text-center py-8">
                Aucune étape d'exploitation documentée.
              </div>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {selected.exploitLog.map((step) => (
                  <Card key={step.id} className="border-slate-600 bg-slate-700">
                    <CardContent className="p-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-slate-100 font-medium text-sm">{step.title}</span>
                            <span className="text-xs text-slate-400">{new Date(step.timestamp).toLocaleString('fr-FR')}</span>
                          </div>
                          {step.command && (
                            <code className="block bg-slate-900 border border-slate-600 rounded px-2 py-1 text-green-400 text-xs mb-1">{step.command}</code>
                          )}
                          {step.result && (
                            <pre className="text-xs bg-slate-900 border border-slate-600 rounded px-2 py-1 text-slate-300 whitespace-pre-wrap max-h-20 overflow-y-auto">{step.result}</pre>
                          )}
                        </div>
                        <div className="flex gap-1">
                          <Button size="sm" variant="outline" className="bg-slate-700 border-slate-600 text-slate-200 hover:bg-slate-600 text-xs px-2" onClick={() => setEditingStep(step)}>Éditer</Button>
                          <Button size="sm" variant="outline" className="bg-red-700 border-red-600 text-red-200 hover:bg-red-600 text-xs px-2" onClick={() => {
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
    </div>
  );
};
