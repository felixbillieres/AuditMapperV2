import React from 'react';
import { motion } from 'framer-motion';
import { 
  Server, 
  Edit, 
  Trash2, 
  Copy, 
  MoreHorizontal,
  CheckCircle,
  AlertTriangle,
  Clock,
  Shield,
  Hash,
  User
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Host } from '@/types';

interface HostCardProps {
  host: Host;
  viewMode: 'grid' | 'list';
  isSelected: boolean;
  onSelect: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

const getStatusIcon = (status: Host['status']) => {
  switch (status) {
    case 'active':
      return <CheckCircle className="w-4 h-4 text-cyber-accent" />;
    case 'compromised':
      return <AlertTriangle className="w-4 h-4 text-cyber-warning" />;
    case 'inactive':
      return <Clock className="w-4 h-4 text-dark-400" />;
    default:
      return <Server className="w-4 h-4 text-dark-400" />;
  }
};

const getPriorityColor = (priority: Host['priority']) => {
  switch (priority) {
    case 'critical':
      return 'text-cyber-danger';
    case 'high':
      return 'text-cyber-warning';
    case 'medium':
      return 'text-cyber-secondary';
    case 'low':
      return 'text-cyber-primary';
    default:
      return 'text-dark-400';
  }
};

const getCompromiseLevelColor = (level: Host['compromiseLevel']) => {
  switch (level) {
    case 'full':
      return 'border-cyber-danger';
    case 'partial':
      return 'border-cyber-warning';
    case 'initial':
      return 'border-cyber-secondary';
    case 'none':
    default:
      return 'border-dark-600';
  }
};

export const HostCard: React.FC<HostCardProps> = ({
  host,
  viewMode,
  isSelected,
  onSelect,
  onEdit,
  onDelete,
}) => {
  const handleCopyIP = async () => {
    await navigator.clipboard.writeText(host.ip);
  };

  if (viewMode === 'list') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={`relative ${isSelected ? 'ring-2 ring-cyber-primary' : ''}`}
      >
        <Card 
          variant="dark" 
          className={`cursor-pointer transition-all hover:bg-dark-800 ${getCompromiseLevelColor(host.compromiseLevel)}`}
          onClick={onSelect}
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4 flex-1">
                <div className="flex items-center gap-2">
                  {getStatusIcon(host.status)}
                  <div>
                    <h3 className="font-medium text-cyber-primary">{host.ip}</h3>
                    {host.hostname && (
                      <p className="text-sm text-dark-300">{host.hostname}</p>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center gap-4 text-sm">
                  {host.os && (
                    <span className="text-dark-300">{host.os}</span>
                  )}
                  <span className={`font-medium ${getPriorityColor(host.priority)}`}>
                    {host.priority}
                  </span>
                  <span className="text-cyber-secondary">
                    {host.usernames.length + host.passwords.length + host.hashes.length} creds
                  </span>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCopyIP();
                  }}
                >
                  <Copy className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit();
                  }}
                >
                  <Edit className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete();
                  }}
                  className="text-cyber-danger hover:text-cyber-danger"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  // Grid view
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`relative ${isSelected ? 'ring-2 ring-cyber-primary' : ''}`}
    >
      <Card 
        variant="dark" 
        className={`cursor-pointer transition-all hover:bg-dark-800 ${getCompromiseLevelColor(host.compromiseLevel)}`}
        onClick={onSelect}
      >
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {getStatusIcon(host.status)}
              <CardTitle className="text-sm font-medium text-cyber-primary">
                {host.ip}
              </CardTitle>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  handleCopyIP();
                }}
                className="h-6 w-6 p-0"
              >
                <Copy className="w-3 h-3" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit();
                }}
                className="h-6 w-6 p-0"
              >
                <Edit className="w-3 h-3" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete();
                }}
                className="h-6 w-6 p-0 text-cyber-danger hover:text-cyber-danger"
              >
                <Trash2 className="w-3 h-3" />
              </Button>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="pt-0">
          <div className="space-y-2">
            {host.hostname && (
              <p className="text-xs text-dark-300">{host.hostname}</p>
            )}
            
            {host.os && (
              <p className="text-xs text-dark-300">{host.os}</p>
            )}
            
            <div className="flex items-center justify-between text-xs">
              <span className={`font-medium ${getPriorityColor(host.priority)}`}>
                {host.priority}
              </span>
              
              <div className="flex items-center gap-1">
                {host.usernames.length > 0 && (
                  <User className="w-3 h-3 text-cyber-primary" />
                )}
                {host.passwords.length > 0 && (
                  <Shield className="w-3 h-3 text-cyber-secondary" />
                )}
                {host.hashes.length > 0 && (
                  <Hash className="w-3 h-3 text-cyber-accent" />
                )}
              </div>
            </div>
            
            <div className="text-xs text-dark-400">
              {host.usernames.length + host.passwords.length + host.hashes.length} credentials
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};
