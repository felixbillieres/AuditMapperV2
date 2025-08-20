import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Button } from '../../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Input } from '../../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';
import { Trophy, ListTodo, Timer, Trash2, Download, Upload, Search, Filter } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { useHTBStore, type HTBProject } from '../../../stores/htbStore';

// Composant pour les quotes aléatoires
const QuoteRotator: React.FC = () => {
  const quotes = [
    "La douleur que tu ressens aujourd'hui sera ta force demain. — Anonyme",
    "La qualité n'est jamais un accident ; c'est toujours le résultat d'un effort intelligent. — John Ruskin",
    "Ce que tu penses de toi-même est bien plus important que ce que les autres pensent de toi. — Sénèque",
    "Celui qui déplace une montagne commence par déplacer de petites pierres. — Confucius",
    "La discipline est le pont entre les objectifs et l'accomplissement. — Jim Rohn",
    "Le succès, c'est la somme de petits efforts répétés jour après jour. — Robert Collier",
    "Le vrai voyage d'exploration ne consiste pas à chercher de nouveaux paysages, mais à avoir de nouveaux yeux. — Marcel Proust",
    "L'excellence n'est pas un acte, mais une habitude. — Aristote",
    "Si tu veux quelque chose que tu n'as jamais eu, fais quelque chose que tu n'as jamais fait. — Thomas Jefferson",
    "Tu n'échoues jamais tant que tu n'abandonnes pas. — Anonyme",
    "La perfection n'est pas atteignable, mais en la poursuivant, on peut atteindre l'excellence. — Vince Lombardi",
    "Le travail bat le talent quand le talent ne travaille pas assez. — Tim Notke",
    "Maîtriser les autres, c'est la force. Se maîtriser soi-même, c'est le pouvoir. — Lao Tseu",
    "Visez la lune. Même si vous la manquez, vous atteindrez les étoiles. — Norman Vincent Peale",
    "L'obstacle est le chemin. — Marc Aurèle",
    "Deviens la meilleure version de toi-même, pas une copie de quelqu'un d'autre. — Anonyme",
    "Aucun raccourci ne mène à un endroit qui en vaille la peine. — Beverly Sills",
    "J'estime que les souffrances du temps présent ne sauraient être comparées à la gloire à venir qui sera révélée pour nous. - Romans 8:18"
  ];

  const [currentQuote, setCurrentQuote] = useState(() => Math.floor(Math.random() * quotes.length));

  useEffect(() => {
    const interval = setInterval(() => {
      // Éviter de répéter la même quote deux fois de suite
      let newIndex;
      do {
        newIndex = Math.floor(Math.random() * quotes.length);
      } while (newIndex === currentQuote && quotes.length > 1);
      
      setCurrentQuote(newIndex);
    }, 30000); // Change toutes les 30 secondes

    return () => clearInterval(interval);
  }, [currentQuote, quotes.length]);

  return (
    <div className="text-center">
      <blockquote className="text-slate-200 italic text-sm leading-relaxed">
        &ldquo;{quotes[currentQuote]}&rdquo;
      </blockquote>
    </div>
  );
};

interface DashboardProps {
  projects: HTBProject[];
  allProjects: HTBProject[];
  stats: {
    total: number;
    pwned: number;
    active: number;
    cumulative: Array<{ date: string; count: number }>;
    byDifficulty: Array<{ name: string; value: number; color: string }>;
  };
  getDifficultyColor: (difficulty: string) => string;
  onSetCreateModalOpen: (open: boolean) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ 
  projects, 
  allProjects,
  stats, 
  getDifficultyColor, 
  onSetCreateModalOpen 
}) => {
  const [, setSearchParams] = useSearchParams();
  const { deleteProject, closeProject, exportProject, exportProfile, importProject, importProfile } = useHTBStore();
  
  // États pour la recherche et les filtres
  const [searchTerm, setSearchTerm] = useState('');
  const [platformFilter, setPlatformFilter] = useState('all');
  const [difficultyFilter, setDifficultyFilter] = useState('all');
  const [statusFilter] = useState('all');
  
  // États pour le modal de confirmation de suppression
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<HTBProject | null>(null);

  // Filtrer les projets pwnés pour l'historique
  const pwnedProjects = allProjects.filter(p => p.pwnedAt);
  
  // Appliquer les filtres de recherche
  const filteredProjects = pwnedProjects.filter(project => {
    const matchesSearch = project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         project.ip?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         project.os?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesPlatform = platformFilter === 'all' || project.platform === platformFilter;
    const matchesDifficulty = difficultyFilter === 'all' || project.difficultyLabel === difficultyFilter;
    const matchesStatus = statusFilter === 'all' || 
                         (statusFilter === 'pwned' && project.pwnedAt) ||
                         (statusFilter === 'active' && !project.pwnedAt);
    
    return matchesSearch && matchesPlatform && matchesDifficulty && matchesStatus;
  });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <Card className="lg:col-span-2 border-slate-700 bg-slate-800">
        <CardHeader>
          <CardTitle className="text-slate-100">Projets</CardTitle>
        </CardHeader>
        <CardContent>
          {projects.length === 0 ? (
            <div className="text-slate-400">Aucun projet ouvert. Créez votre première box HTB ou consultez l'historique pour voir les projets clôturés.</div>
          ) : (
            <div className={`${projects.length > 6 ? 'max-h-[600px] overflow-y-auto pr-2' : ''}`}>
              <div className="grid md:grid-cols-2 gap-3">
                {projects.map((p) => (
                  <div key={p.id} className={`p-3 rounded border-2 bg-slate-900/40 hover:border-slate-500 transition-colors ${getDifficultyColor(p.difficultyLabel || 'Medium')}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        {p.avatarDataUrl ? (
                          <img src={p.avatarDataUrl} alt={p.name} className="w-10 h-10 rounded flex-shrink-0" />
                        ) : (
                          <div className="w-10 h-10 rounded bg-slate-700 flex items-center justify-center text-slate-300 flex-shrink-0 text-xs">
                            {p.platform === 'HackTheBox' ? 'HTB' : 
                             p.platform === 'Offsec' ? 'PWK' : 
                             p.platform === 'TryHackMe' ? 'THM' : 
                             p.platform === 'VulnLab' ? 'VL' : 
                             p.platform?.slice(0,3) || 'BOX'}
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <div className="text-slate-100 font-semibold truncate">{p.name}</div>
                            {p.difficultyLabel && (
                              <span className={`px-2 py-0.5 rounded text-xs font-medium border ${getDifficultyColor(p.difficultyLabel)}`}>
                                {p.difficultyLabel}
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-slate-400 truncate">
                            {p.platform && <span className="text-slate-300">{p.platform}</span>}
                            {p.ip && <span> • {p.ip}</span>}
                            {p.os && <span> • {p.os}</span>}
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col gap-1 flex-shrink-0">
                        <div className="flex gap-1">
                          <Button size="sm" variant="outline" className="bg-slate-700 border-slate-600 text-slate-200 hover:bg-slate-600 text-xs px-2 py-1" onClick={() => setSearchParams({ project: p.id })}>Ouvrir</Button>
                          <Button size="sm" variant="outline" className="bg-emerald-700 border-emerald-600 text-emerald-100 hover:bg-emerald-600 text-xs px-2 py-1" onClick={() => closeProject(p.id)}><Trophy className="w-3 h-3 mr-1" /> Clôturer</Button>
                        </div>
                        <div className="flex gap-1">
                          <Button size="sm" variant="outline" className="bg-slate-700 border-slate-600 text-slate-200 hover:bg-slate-600 text-xs px-2 py-1" onClick={() => {
                            const data = exportProject(p.id);
                            if (!data) return;
                            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url; a.download = `${p.name.replace(/\s+/g,'_')}.project.json`;
                            document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
                          }}>Export</Button>
                          <Button size="sm" variant="outline" className="bg-red-700 border-red-600 text-red-200 hover:bg-red-600 text-xs px-2 py-1" onClick={() => {
                            setProjectToDelete(p);
                            setDeleteModalOpen(true);
                          }}><Trash2 className="w-3 h-3" /></Button>
                        </div>
                      </div>
                    </div>
                    <div className="mt-2 text-xs text-slate-300 flex items-center gap-4">
                      <span className="flex items-center gap-1"><ListTodo className="w-3 h-3" /> {p.tasks.filter(t=>t.status!=='done').length} tâches en cours</span>
                      {p.pwnedAt && <span className="flex items-center gap-1"><Trophy className="w-3 h-3 text-yellow-400" /> pwned {new Date(p.pwnedAt).toLocaleDateString('fr-FR')}</span>}
                      <span className="flex items-center gap-1"><Timer className="w-3 h-3" /> {(Math.round((p.timeSpentSeconds||0)/3600))}h</span>
                    </div>
                  </div>
                ))}
              </div>
              {projects.length > 6 && (
                <div className="mt-4 text-xs text-slate-400 text-center">
                  {projects.length} projets au total
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Mood of the day card */}
      <Card className="border-slate-700 bg-slate-800">
        <CardHeader>
          <CardTitle className="text-slate-100">Mood du jour</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center">
            <div className="relative w-48 h-48">
              <img 
                src="/1.png" 
                alt="mood"
                className="w-full h-full object-contain"
              />
            </div>
          </div>
          {/* Quote du moment sous l'image */}
          <div className="mt-4 pt-4 border-t border-slate-600">
            <QuoteRotator />
          </div>
        </CardContent>
      </Card>

      {/* Statistiques */}
      <Card className="lg:col-span-2 border-slate-700 bg-slate-800">
        <CardHeader>
          <CardTitle className="text-slate-100">Statistiques</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-blue-400">{stats.total}</div>
              <div className="text-xs text-slate-400">Total</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-400">{stats.pwned}</div>
              <div className="text-xs text-slate-400">Pwnées</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-yellow-400">{stats.active}</div>
              <div className="text-xs text-slate-400">En cours</div>
            </div>
          </div>
          
          <div className="grid lg:grid-cols-2 gap-4">
            {/* Graphique temporel */}
            <div>
              <div className="text-sm text-slate-300 mb-2">Évolution temporelle</div>
              <div className="h-64 bg-slate-900/40 rounded border border-slate-700 p-2">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={stats.cumulative} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis dataKey="date" stroke="#94a3b8" />
                    <YAxis stroke="#94a3b8" allowDecimals={false} />
                    <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #334155', color: '#e2e8f0' }} />
                    <Legend />
                    <Line type="monotone" dataKey="count" name="Boxes pwnées" stroke="#60a5fa" strokeWidth={2} dot={{ r: 2 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
            
            {/* Répartition par difficulté */}
            <div>
              <div className="text-sm text-slate-300 mb-2">Par difficulté</div>
              <div className="h-64 bg-slate-900/40 rounded border border-slate-700 p-2">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie dataKey="value" data={stats.byDifficulty} cx="50%" cy="50%" outerRadius={80} label>
                      <Cell fill="#60a5fa" />
                    </Pie>
                    <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #334155', color: '#e2e8f0' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Historique des boxes */}
      <Card className="border-slate-700 bg-slate-800">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-slate-100 text-sm">Actions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Button 
            size="sm" 
            variant="outline"
            className="w-full bg-slate-700 border-slate-600 text-slate-200 hover:bg-slate-600"
            onClick={() => onSetCreateModalOpen(true)}
          >
            + Nouveau Projet
          </Button>
          <Button 
            size="sm" 
            variant="outline"
            className="w-full bg-slate-700 border-slate-600 text-slate-200 hover:bg-slate-600"
            onClick={() => {
              const data = exportProfile();
              const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url; a.download = `htb_profile_${new Date().toISOString().slice(0,10)}.json`;
              document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
            }}
          >
            <Download className="w-4 h-4 mr-2" /> Export Profil
          </Button>
          <Button 
            size="sm" 
            variant="outline"
            className="w-full bg-slate-700 border-slate-600 text-slate-200 hover:bg-slate-600"
            onClick={async () => {
              const input = document.createElement('input');
              input.type = 'file';
              input.accept = '.project.json';
              input.onchange = async (e) => {
                const file = (e.target as HTMLInputElement).files?.[0];
                if (file) {
                  const text = await file.text();
                  const data = JSON.parse(text);
                  importProject(data);
                }
              };
              input.click();
            }}
          >
            <Upload className="w-4 h-4 mr-2" /> Import Projet (.project.json)
          </Button>
          <Button 
            size="sm" 
            variant="outline"
            className="w-full bg-slate-700 border-slate-600 text-slate-200 hover:bg-slate-600"
            onClick={async () => {
              const input = document.createElement('input');
              input.type = 'file';
              input.accept = '.json';
              input.onchange = async (e) => {
                const file = (e.target as HTMLInputElement).files?.[0];
                if (file) {
                  const text = await file.text();
                  const data = JSON.parse(text);
                  importProfile(data);
                }
              };
              input.click();
            }}
          >
            <Upload className="w-4 h-4 mr-2" /> Import Profil
          </Button>
        </CardContent>
      </Card>

      {/* Historique des boxes */}
      <Card className="lg:col-span-3 border-slate-700 bg-slate-800">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-slate-100">Historique des boxes ({filteredProjects.length})</CardTitle>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Rechercher..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 w-64 bg-slate-700 border-slate-600 text-slate-100"
              />
            </div>
            <Select value={platformFilter} onValueChange={setPlatformFilter}>
              <SelectTrigger className="w-40 bg-slate-700 border-slate-600 text-slate-100">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-600">
                <SelectItem value="all">Toutes plateformes</SelectItem>
                <SelectItem value="HackTheBox">HackTheBox</SelectItem>
                <SelectItem value="Offsec">Offsec</SelectItem>
                <SelectItem value="TryHackMe">TryHackMe</SelectItem>
                <SelectItem value="VulnLab">VulnLab</SelectItem>
                <SelectItem value="Autre">Autre</SelectItem>
              </SelectContent>
            </Select>
            <Select value={difficultyFilter} onValueChange={setDifficultyFilter}>
              <SelectTrigger className="w-32 bg-slate-700 border-slate-600 text-slate-100">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-600">
                <SelectItem value="all">Toutes difficultés</SelectItem>
                <SelectItem value="Easy">Easy</SelectItem>
                <SelectItem value="Medium">Medium</SelectItem>
                <SelectItem value="Hard">Hard</SelectItem>
                <SelectItem value="Insane">Insane</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {filteredProjects.length === 0 ? (
            <div className="text-slate-400 text-center py-8">
              {pwnedProjects.length === 0 ? 
                "Aucune box terminée pour le moment." : 
                "Aucune box ne correspond aux critères de recherche."}
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredProjects.map((p) => (
                <div key={p.id} className={`p-3 rounded border-2 bg-slate-900/40 hover:border-slate-500 transition-colors ${getDifficultyColor(p.difficultyLabel || 'Medium')}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      {p.avatarDataUrl ? (
                        <img src={p.avatarDataUrl} alt={p.name} className="w-8 h-8 rounded flex-shrink-0" />
                      ) : (
                        <div className="w-8 h-8 rounded bg-slate-700 flex items-center justify-center text-slate-300 flex-shrink-0 text-xs">
                          {p.platform === 'HackTheBox' ? 'HTB' : 
                           p.platform === 'Offsec' ? 'PWK' : 
                           p.platform === 'TryHackMe' ? 'THM' : 
                           p.platform === 'VulnLab' ? 'VL' : 
                           p.platform?.slice(0,3) || 'BOX'}
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <div className="text-slate-100 font-semibold truncate text-sm">{p.name}</div>
                          {p.difficultyLabel && (
                            <span className={`px-1 py-0.5 rounded text-xs font-medium border ${getDifficultyColor(p.difficultyLabel)}`}>
                              {p.difficultyLabel}
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-slate-400 truncate">
                          {p.platform && <span className="text-slate-300">{p.platform}</span>}
                          {p.ip && <span> • {p.ip}</span>}
                          {p.os && <span> • {p.os}</span>}
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col gap-1">
                      <Button size="sm" variant="outline" className="bg-slate-700 border-slate-600 text-slate-200 hover:bg-slate-600 text-xs px-2 py-1" onClick={() => setSearchParams({ project: p.id })}>
                        Rouvrir
                      </Button>
                      <Button size="sm" variant="outline" className="bg-slate-700 border-slate-600 text-slate-200 hover:bg-slate-600 text-xs px-2 py-1" onClick={() => {
                        const data = exportProject(p.id);
                        if (!data) return;
                        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url; a.download = `${p.name.replace(/\s+/g,'_')}.project.json`;
                        document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
                      }}>Export</Button>
                    </div>
                  </div>
                  <div className="mt-2 text-xs text-slate-300 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {p.pwnedAt && <span className="flex items-center gap-1"><Trophy className="w-3 h-3 text-yellow-400" /> {new Date(p.pwnedAt).toLocaleDateString('fr-FR')}</span>}
                      <span className="flex items-center gap-1"><Timer className="w-3 h-3" /> {(Math.round((p.timeSpentSeconds||0)/3600))}h</span>
                    </div>
                    <div className="text-xs text-slate-400">
                      {p.services.length} services
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Modal de confirmation de suppression */}
      {deleteModalOpen && projectToDelete && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-lg border border-slate-700 bg-slate-900 shadow-xl">
            <div className="p-4 border-b border-slate-700">
              <h3 className="text-lg font-semibold text-slate-100">Confirmer la suppression</h3>
              <p className="text-slate-400 text-sm mt-1">
                Êtes-vous sûr de vouloir supprimer le projet <span className="text-slate-200 font-medium">"{projectToDelete.name}"</span> ?
              </p>
              <p className="text-slate-400 text-sm mt-2">
                Cette action est irréversible. Voulez-vous d'abord l'exporter pour garder une trace ?
              </p>
            </div>
            <div className="p-4 space-y-3">
              <Button 
                className="w-full bg-blue-600 hover:bg-blue-700"
                onClick={() => {
                  // Exporter d'abord, puis supprimer
                  const data = exportProject(projectToDelete.id);
                  if (data) {
                    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url; 
                    a.download = `${projectToDelete.name.replace(/\s+/g,'_')}.project.json`;
                    document.body.appendChild(a); 
                    a.click(); 
                    document.body.removeChild(a); 
                    URL.revokeObjectURL(url);
                  }
                  // Supprimer après export
                  deleteProject(projectToDelete.id);
                  setDeleteModalOpen(false);
                  setProjectToDelete(null);
                }}
              >
                📁 Exporter puis supprimer
              </Button>
              <Button 
                variant="outline" 
                className="w-full bg-slate-700 border-slate-600 text-slate-200 hover:bg-slate-600"
                onClick={() => {
                  // Supprimer directement
                  deleteProject(projectToDelete.id);
                  setDeleteModalOpen(false);
                  setProjectToDelete(null);
                }}
              >
                🗑️ Supprimer directement
              </Button>
              <Button 
                variant="outline" 
                className="w-full bg-slate-700 border-slate-600 text-slate-200 hover:bg-slate-600"
                onClick={() => {
                  setDeleteModalOpen(false);
                  setProjectToDelete(null);
                }}
              >
                ❌ Annuler
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
