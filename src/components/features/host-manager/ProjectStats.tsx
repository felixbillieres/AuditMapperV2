import React from 'react';
import { Server, CheckCircle, AlertTriangle, Target, Shield } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Host } from '@/types';

interface ProjectStatsProps {
  hosts: Host[];
  className?: string;
}

export const ProjectStats: React.FC<ProjectStatsProps> = ({ hosts, className }) => {
  const stats = React.useMemo(() => ({
    total: hosts.length,
    active: hosts.filter(h => h.status === 'active').length,
    compromised: hosts.filter(h => h.status === 'compromised').length,
    critical: hosts.filter(h => h.priority === 'critical').length,
    credentials: hosts.reduce((sum, h) => sum + h.usernames.length + h.passwords.length + h.hashes.length, 0),
    vulnerabilities: hosts.reduce((sum, h) => sum + (h.exploitationSteps?.length || 0), 0),
  }), [hosts]);

  return (
    <div className={`grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2 ${className}`}>
      <Card className="stats-card">
        <CardContent className="p-2">
          <div className="flex items-center gap-2">
            <Server className="w-4 h-4 text-blue-400" />
            <div>
              <p className="text-lg font-bold text-slate-100">{stats.total}</p>
              <p className="text-xs text-slate-400">Total</p>
            </div>
          </div>
        </CardContent>
      </Card>
      <Card className="stats-card">
        <CardContent className="p-2">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-green-400" />
            <div>
              <p className="text-lg font-bold text-slate-100">{stats.active}</p>
              <p className="text-xs text-slate-400">Actifs</p>
            </div>
          </div>
        </CardContent>
      </Card>
      <Card className="stats-card">
        <CardContent className="p-2">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-orange-400" />
            <div>
              <p className="text-lg font-bold text-slate-100">{stats.compromised}</p>
              <p className="text-xs text-slate-400">Compromis</p>
            </div>
          </div>
        </CardContent>
      </Card>
      <Card className="stats-card">
        <CardContent className="p-2">
          <div className="flex items-center gap-2">
            <Target className="w-4 h-4 text-red-400" />
            <div>
              <p className="text-lg font-bold text-slate-100">{stats.critical}</p>
              <p className="text-xs text-slate-400">Critiques</p>
            </div>
          </div>
        </CardContent>
      </Card>
      <Card className="stats-card">
        <CardContent className="p-2">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-purple-400" />
            <div>
              <p className="text-lg font-bold text-slate-100">{stats.credentials}</p>
              <p className="text-xs text-slate-400">Credentials</p>
            </div>
          </div>
        </CardContent>
      </Card>
      <Card className="stats-card">
        <CardContent className="p-2">
          <div className="flex items-center gap-2">
            <Target className="w-4 h-4 text-orange-400" />
            <div>
              <p className="text-lg font-bold text-slate-100">{stats.vulnerabilities}</p>
              <p className="text-xs text-slate-400">Étapes d'exploitation</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ProjectStats;
