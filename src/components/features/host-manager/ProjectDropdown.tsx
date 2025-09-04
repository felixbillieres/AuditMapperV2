import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChevronDown, 
  Plus, 
  Folder, 
  FolderOpen, 
  Edit3, 
  Trash2, 
  Check,
  X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useProjectStore } from '@/stores/projectStore';
import { Project } from '@/types';

interface ProjectDropdownProps {
  className?: string;
}

export const ProjectDropdown: React.FC<ProjectDropdownProps> = ({ className }) => {
  const {
    projects,
    currentProjectId,
    getCurrentProject,
    getAllProjects,
    addProject,
    updateProject,
    deleteProject,
    setCurrentProject,
  } = useProjectStore();

  const [isOpen, setIsOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isEditing, setIsEditing] = useState<string | null>(null);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDescription, setNewProjectDescription] = useState('');
  const [editingName, setEditingName] = useState('');
  const [editingDescription, setEditingDescription] = useState('');

  const currentProject = getCurrentProject();
  const allProjects = getAllProjects();

  const handleCreateProject = () => {
    if (newProjectName.trim()) {
      addProject({
        name: newProjectName.trim(),
        description: newProjectDescription.trim() || undefined,
      });
      setNewProjectName('');
      setNewProjectDescription('');
      setIsCreating(false);
    }
  };

  const handleEditProject = (project: Project) => {
    setEditingName(project.name);
    setEditingDescription(project.description || '');
    setIsEditing(project.id);
  };

  const handleSaveEdit = (projectId: string) => {
    if (editingName.trim()) {
      updateProject(projectId, {
        name: editingName.trim(),
        description: editingDescription.trim() || undefined,
      });
      setIsEditing(null);
      setEditingName('');
      setEditingDescription('');
    }
  };

  const handleDeleteProject = (projectId: string) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer ce projet ? Tous les hosts associés seront également supprimés.')) {
      deleteProject(projectId);
      if (currentProjectId === projectId) {
        setCurrentProject(null);
      }
    }
  };

  const handleSelectProject = (projectId: string) => {
    setCurrentProject(projectId);
    setIsOpen(false);
  };

  const handleCreateNew = () => {
    setIsCreating(true);
    setNewProjectName('');
    setNewProjectDescription('');
  };

  const cancelCreate = () => {
    setIsCreating(false);
    setNewProjectName('');
    setNewProjectDescription('');
  };

  const cancelEdit = () => {
    setIsEditing(null);
    setEditingName('');
    setEditingDescription('');
  };

  return (
    <div className={`relative ${className}`}>
      {/* Trigger Button */}
      <Button
        variant="outline"
        onClick={() => setIsOpen(!isOpen)}
        className="bg-slate-800 border-slate-600 text-slate-200 hover:bg-slate-700 min-w-[200px] justify-between"
      >
        <div className="flex items-center gap-2">
          {currentProject ? (
            <>
              <div 
                className="w-3 h-3 rounded-full" 
                style={{ backgroundColor: currentProject.color }}
              />
              <span className="truncate">{currentProject.name}</span>
            </>
          ) : (
            <>
              <Folder className="w-4 h-4" />
              <span>Sélectionner un projet</span>
            </>
          )}
        </div>
        <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </Button>

      {/* Dropdown Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-full left-0 right-0 mt-2 bg-slate-800 border border-slate-600 rounded-lg shadow-xl z-50 max-h-96 overflow-y-auto"
          >
            <div className="p-2">
              {/* Create New Project */}
              {isCreating ? (
                <div className="p-3 bg-slate-700 rounded-lg mb-2">
                  <div className="space-y-2">
                    <Input
                      placeholder="Nom du projet"
                      value={newProjectName}
                      onChange={(e) => setNewProjectName(e.target.value)}
                      className="bg-slate-800 border-slate-600 text-slate-100"
                      autoFocus
                    />
                    <Input
                      placeholder="Description (optionnel)"
                      value={newProjectDescription}
                      onChange={(e) => setNewProjectDescription(e.target.value)}
                      className="bg-slate-800 border-slate-600 text-slate-100"
                    />
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={handleCreateProject}
                        className="bg-blue-600 hover:bg-blue-700"
                        disabled={!newProjectName.trim()}
                      >
                        <Check className="w-3 h-3 mr-1" />
                        Créer
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={cancelCreate}
                        className="bg-slate-600 border-slate-500 text-slate-200 hover:bg-slate-500"
                      >
                        <X className="w-3 h-3 mr-1" />
                        Annuler
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <Button
                  variant="outline"
                  onClick={handleCreateNew}
                  className="w-full bg-slate-700 border-slate-600 text-slate-200 hover:bg-slate-600 mb-2"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Nouveau projet
                </Button>
              )}

              {/* Projects List */}
              {allProjects.length === 0 ? (
                <div className="text-center text-slate-400 py-4">
                  <Folder className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>Aucun projet</p>
                  <p className="text-sm">Créez votre premier projet</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {allProjects.map((project) => (
                    <div
                      key={project.id}
                      className={`group flex items-center gap-3 p-2 rounded-lg hover:bg-slate-700 transition-colors ${
                        currentProjectId === project.id ? 'bg-slate-700' : ''
                      }`}
                    >
                      {/* Project Info */}
                      <div className="flex-1 min-w-0">
                        {isEditing === project.id ? (
                          <div className="space-y-2">
                            <Input
                              value={editingName}
                              onChange={(e) => setEditingName(e.target.value)}
                              className="bg-slate-800 border-slate-600 text-slate-100 text-sm"
                              autoFocus
                            />
                            <Input
                              value={editingDescription}
                              onChange={(e) => setEditingDescription(e.target.value)}
                              placeholder="Description (optionnel)"
                              className="bg-slate-800 border-slate-600 text-slate-100 text-sm"
                            />
                            <div className="flex gap-1">
                              <Button
                                size="sm"
                                onClick={() => handleSaveEdit(project.id)}
                                className="bg-blue-600 hover:bg-blue-700 text-xs px-2 py-1"
                                disabled={!editingName.trim()}
                              >
                                <Check className="w-3 h-3" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={cancelEdit}
                                className="bg-slate-600 border-slate-500 text-slate-200 hover:bg-slate-500 text-xs px-2 py-1"
                              >
                                <X className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div
                            className="cursor-pointer"
                            onClick={() => handleSelectProject(project.id)}
                          >
                            <div className="flex items-center gap-2">
                              <div 
                                className="w-3 h-3 rounded-full flex-shrink-0" 
                                style={{ backgroundColor: project.color }}
                              />
                              <span className="text-slate-100 font-medium truncate">
                                {project.name}
                              </span>
                              {currentProjectId === project.id && (
                                <Check className="w-4 h-4 text-blue-400 flex-shrink-0" />
                              )}
                            </div>
                            {project.description && (
                              <p className="text-xs text-slate-400 truncate ml-5">
                                {project.description}
                              </p>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      {isEditing !== project.id && (
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleEditProject(project)}
                            className="text-slate-400 hover:text-slate-200 p-1"
                            title="Modifier le projet"
                          >
                            <Edit3 className="w-3 h-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDeleteProject(project.id)}
                            className="text-slate-400 hover:text-red-400 p-1"
                            title="Supprimer le projet"
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
};

export default ProjectDropdown;
