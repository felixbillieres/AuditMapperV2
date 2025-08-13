import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Home, Server, Calendar as CalendarIcon, Network, FileText, Shield, Search, Zap, Code } from 'lucide-react';

const sections = [
  {
    title: 'Large Scale Audits',
    items: [
      { to: '/host-manager', label: 'Host Manager', icon: Server },
      { to: '/report', label: 'Live Report', icon: FileText },
    ],
  },
  {
    title: 'Small Scale Audits',
    items: [
      { to: '/standalone-playground', label: 'Standalone Playground', icon: Code },
    ],
  },
  {
    title: 'Tools',
    items: [
      { to: '/grep-master', label: 'Grep Master', icon: Search },
      { to: '/config-generator', label: 'Config Generator', icon: Network },
      { to: '/file-transfer', label: 'File Transfer', icon: FileText },
      { to: '/calendar', label: 'Calendar', icon: CalendarIcon },
      { to: '/pivot-master', label: 'Pivot Master', icon: Zap },
      { to: '/admr', label: 'ADMR (Canvas)', icon: Network },
    ],
  },
];

export const GlobalNav: React.FC = () => {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {/* Glowing logo button */}
      <button
        onClick={() => setOpen(true)}
        title="Menu AuditMapper"
        className="w-14 h-14 rounded-full bg-slate-900 border border-cyan-400/40 shadow-[0_0_20px_rgba(34,211,238,0.35)] hover:shadow-[0_0_30px_rgba(34,211,238,0.55)] transition-all flex items-center justify-center"
      >
        <img src="/1.png" alt="AuditMapper" className="w-10 h-10 rounded" />
      </button>

      {/* Central modal */}
      {open && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4" onClick={(e)=> e.target === e.currentTarget && setOpen(false)}>
          <div className="w-full max-w-4xl bg-slate-900 border border-slate-700 rounded-xl shadow-2xl overflow-hidden">
            <div className="p-4 border-b border-slate-700 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <img src="/logo.png" className="w-8 h-8 rounded" />
                <div className="text-slate-100 font-semibold">Navigation centrale</div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  className="px-3 py-1 rounded bg-slate-800 text-slate-200 border border-slate-600 hover:bg-slate-700"
                  onClick={() => { navigate('/'); setOpen(false); }}
                  title="Accueil"
                >
                  <Home className="inline-block w-4 h-4 mr-1" /> Accueil
                </button>
                <button className="px-3 py-1 rounded bg-slate-800 text-slate-200 border border-slate-600 hover:bg-slate-700" onClick={()=>setOpen(false)}>Fermer</button>
              </div>
            </div>
            <div className="p-6 grid md:grid-cols-2 gap-6 relative">
              <img src="/4.png" alt="easter" className="hidden md:block opacity-10 absolute -right-6 -bottom-6 w-72 h-72 pointer-events-none select-none" />
              {sections.map((sec) => (
                <div key={sec.title} className="bg-slate-800/60 border border-slate-700 rounded-lg p-4">
                  <div className="text-slate-300 text-sm mb-3">{sec.title}</div>
                  <div className="space-y-2">
                    {sec.items.map((it) => (
                      <button
                        key={it.to}
                        onClick={() => { navigate(it.to); setOpen(false); }}
                        className="w-full flex items-center gap-2 p-3 rounded hover:bg-slate-700/50 text-slate-200 border border-transparent hover:border-slate-600"
                      >
                        <it.icon className="w-4 h-4 text-slate-300" />
                        <span>{it.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GlobalNav;


