import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Home, Server, Calendar as CalendarIcon, Network, FileText, Shield, Search, Zap, Code } from 'lucide-react';
import { Button } from '@/components/ui/button';

const links = [
  { to: '/', label: 'Accueil', icon: Home },
  { to: '/host-manager', label: 'Host Manager', icon: Server },
  { to: '/calendar', label: 'Calendar', icon: CalendarIcon },
  { to: '/config-generator', label: 'Config Generator', icon: Network },
  { to: '/template-generator', label: 'Template Generator', icon: Code },
  { to: '/pivot-master', label: 'Pivot Master', icon: Zap },
  { to: '/grep-master', label: 'Grep Master', icon: Search },
  { to: '/report', label: 'Live Report', icon: FileText },
  { to: '/privesc', label: 'Privesc Helper', icon: Shield },
  { to: '/file-transfer', label: 'File Transfer', icon: FileText },
  { to: '/admr', label: 'ADMR (Canvas)', icon: Network },
];

export const GlobalNav: React.FC = () => {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {/* Toggle button */}
      <Button
        variant="gradient"
        size="icon"
        onClick={() => setOpen((v) => !v)}
        className="shadow-glow"
        title={open ? 'Fermer le menu' : 'Ouvrir le menu'}
      >
        {open ? '✖' : '☰'}
      </Button>

      {/* Panel */}
      {open && (
        <div className="mt-3 w-64 bg-slate-900/95 border border-slate-700 rounded-lg shadow-xl p-2 backdrop-blur-sm">
          {links.map((l) => (
            <button
              key={l.to}
              onClick={() => {
                navigate(l.to);
                setOpen(false);
              }}
              className="w-full text-left flex items-center gap-2 px-3 py-2 rounded hover:bg-slate-700/50 text-slate-200"
            >
              <l.icon className="w-4 h-4 text-slate-300" />
              <span>{l.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default GlobalNav;


