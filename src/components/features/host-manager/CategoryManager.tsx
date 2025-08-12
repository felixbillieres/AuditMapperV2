import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  Plus, 
  Edit, 
  Trash2, 
  Folder, 
  Server, 
  Globe, 
  Shield, 
  Database,
  Users,
  Target,
  Zap,
  Search
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea'; // Added Textarea import
import { useHostStore } from '@/stores/hostStore';
import { Category, Host } from '@/types';

interface CategoryManagerProps {
  onClose: () => void;
}

const categoryIcons = [
  { name: 'Server', icon: Server },
  { name: 'Globe', icon: Globe },
  { name: 'Shield', icon: Shield },
  { name: 'Database', icon: Database },
  { name: 'Users', icon: Users },
  { name: 'Target', icon: Target },
  { name: 'Zap', icon: Zap },
  { name: 'Folder', icon: Folder },
];

const categoryColors = [
  { name: 'Bleu', value: '#3b82f6' },
  { name: 'Vert', value: '#10b981' },
  { name: 'Rouge', value: '#ef4444' },
  { name: 'Orange', value: '#f97316' },
  { name: 'Violet', value: '#8b5cf6' },
  { name: 'Rose', value: '#ec4899' },
  { name: 'Jaune', value: '#eab308' },
  { name: 'Gris', value: '#6b7280' },
];

export const CategoryManager: React.FC<CategoryManagerProps> = ({
  onClose,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');


  const [newCategory, setNewCategory] = useState({
    name: '',
    description: '',
    color: '#3b82f6',
    icon: 'Folder' as string,
  });

  const { categories, addCategory, updateCategory, deleteCategory, hosts } = useHostStore();

  const filteredCategories = Array.isArray(categories) 
    ? categories.filter(category => 
        category.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        category.description?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : [];

  const getHostsByCategory = (categoryId: string) => {
    return Object.values(hosts).filter((host: Host) => host.category === categoryId);
  };

  const getCategoryIcon = (iconName: string) => {
    const icon = categoryIcons.find(i => i.name === iconName);
    return icon ? icon.icon : Folder;
  };



  const iconOptions = categoryIcons.map(icon => icon.name);
  const colorOptions = categoryColors.map(color => color.value);

  const handleAddCategory = () => {
    if (newCategory.name.trim()) {
      addCategory({
        name: newCategory.name.trim(),
        description: newCategory.description.trim(),
        icon: newCategory.icon,
        color: newCategory.color,
      });
      setNewCategory({ name: '', description: '', icon: 'Folder', color: '#3b82f6' });
      setShowAddForm(false);
    }
  };

  const handleUpdateCategory = () => {
    if (editingCategory && newCategory.name.trim()) {
      updateCategory(editingCategory.id, {
        name: newCategory.name.trim(),
        description: newCategory.description.trim(),
        icon: newCategory.icon,
        color: newCategory.color,
      });
      setEditingCategory(null);
      setNewCategory({ name: '', description: '', icon: 'Folder', color: '#3b82f6' });
    }
  };





  return (
    <div className="fixed inset-0 bg-slate-900/80 flex items-center justify-center z-50">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="w-full max-w-4xl max-h-[90vh] overflow-hidden"
      >
        <Card className="h-full border-slate-700 bg-slate-800">
          <CardHeader className="border-b border-slate-700">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-slate-100">Gestion des Catégories</CardTitle>
                <p className="text-sm text-slate-400 mt-1">
                  Organisez vos hôtes par catégories pour une meilleure organisation
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={onClose}
                className="bg-slate-700 border-slate-600 text-slate-200 hover:bg-slate-600"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </CardHeader>

          <CardContent className="p-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Liste des catégories */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-slate-100">Catégories existantes</h3>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowAddForm(true)}
                    className="bg-slate-700 border-slate-600 text-slate-200 hover:bg-slate-600"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Nouvelle catégorie
                  </Button>
                </div>

                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 bg-slate-700 border-slate-600 text-slate-100"
                    placeholder="Rechercher des catégories..."
                  />
                </div>

                <div className="space-y-2 max-h-96 overflow-auto">
                  {filteredCategories.map((category) => (
                    <Card
                      key={category.id}
                      className={`border-slate-700 bg-slate-700 cursor-pointer transition-colors ${
                        selectedCategory?.id === category.id ? 'ring-2 ring-blue-500' : 'hover:border-slate-600'
                      }`}
                      onClick={() => setSelectedCategory(category)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div
                              className="w-8 h-8 rounded-lg flex items-center justify-center"
                              style={{ 
                                backgroundColor: `${category.color}20`, 
                                color: category.color 
                              }}
                            >
                              {React.createElement(getCategoryIcon(category.icon || 'Folder'), { className: 'w-4 h-4' })}
                            </div>
                            <div>
                              <h4 className="font-medium text-slate-200">{category.name || 'Sans nom'}</h4>
                              <p className="text-sm text-slate-400">{category.description || ''}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-slate-400">
                              {getHostsByCategory(category.id).length} hôtes
                            </span>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingCategory(category);
                                setNewCategory({
                                  name: category.name || '',
                                  description: category.description || '',
                                  color: category.color || '#3b82f6',
                                  icon: category.icon || 'Folder',
                                });
                                setShowAddForm(true);
                              }}
                              className="bg-slate-600 border-slate-500 text-slate-200 hover:bg-slate-500"
                            >
                              <Edit className="w-3 h-3" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (confirm(`Êtes-vous sûr de vouloir supprimer la catégorie "${category.name || 'Sans nom'}" ?`)) {
                                  deleteCategory(category.id);
                                }
                              }}
                              className="bg-red-600 hover:bg-red-700 text-white"
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

              {/* Formulaire d'ajout/modification */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-slate-100">
                  {editingCategory ? 'Modifier la catégorie' : 'Nouvelle catégorie'}
                </h3>

                <AnimatePresence>
                  {showAddForm && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                    >
                      <Card className="border-slate-700 bg-slate-700">
                        <CardContent className="p-4 space-y-4">
                          <div>
                            <label className="text-sm font-medium text-slate-400">Nom</label>
                            <Input
                              value={newCategory.name}
                              onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}
                              className="mt-1 bg-slate-600 border-slate-500 text-slate-100"
                              placeholder="Nom de la catégorie"
                            />
                          </div>

                          <div>
                            <label className="text-sm font-medium text-slate-400">Description</label>
                            <Textarea
                              value={newCategory.description}
                              onChange={(e) => setNewCategory({ ...newCategory, description: e.target.value })}
                              className="mt-1 bg-slate-600 border-slate-500 text-slate-100"
                              placeholder="Description de la catégorie"
                            />
                          </div>

                          <div>
                            <label className="text-sm font-medium text-slate-400">Couleur</label>
                            <div className="mt-2 grid grid-cols-6 gap-2">
                              {colorOptions.map((color) => (
                                <button
                                  key={color}
                                  type="button"
                                  className={`w-8 h-8 rounded-full border-2 transition-colors ${
                                    newCategory.color === color
                                      ? 'border-slate-300 scale-110'
                                      : 'border-slate-600 hover:border-slate-400'
                                  }`}
                                  style={{ backgroundColor: color }}
                                  onClick={() => setNewCategory({ ...newCategory, color })}
                                />
                              ))}
                            </div>
                          </div>

                          <div>
                            <label className="text-sm font-medium text-slate-400">Icône</label>
                            <div className="mt-2 grid grid-cols-6 gap-2">
                              {iconOptions.map((icon) => {
                                const IconComponent = getCategoryIcon(icon);
                                return (
                                  <button
                                    key={icon}
                                    type="button"
                                    className={`w-8 h-8 rounded flex items-center justify-center transition-colors ${
                                      newCategory.icon === icon
                                        ? 'bg-blue-500 text-white'
                                        : 'bg-slate-600 text-slate-400 hover:bg-slate-500'
                                    }`}
                                    onClick={() => setNewCategory({ ...newCategory, icon })}
                                  >
                                    <IconComponent className="w-4 h-4" />
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          <div className="flex gap-2 pt-4">
                            <Button
                              variant="default"
                              onClick={editingCategory ? handleUpdateCategory : handleAddCategory}
                              disabled={!newCategory.name.trim()}
                              className="bg-blue-600 hover:bg-blue-700"
                            >
                              {editingCategory ? 'Modifier' : 'Ajouter'}
                            </Button>
                            <Button
                              variant="outline"
                              onClick={() => {
                                setShowAddForm(false);
                                setEditingCategory(null);
                                setNewCategory({
                                  name: '',
                                  description: '',
                                  color: '#3b82f6',
                                  icon: 'Folder',
                                });
                              }}
                              className="bg-slate-700 border-slate-600 text-slate-200 hover:bg-slate-600"
                            >
                              Annuler
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Aperçu de la catégorie sélectionnée */}
                {selectedCategory && (
                  <Card className="border-slate-700 bg-slate-700">
                    <CardHeader>
                      <CardTitle className="text-slate-200">Aperçu de la catégorie</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-12 h-12 rounded-lg flex items-center justify-center"
                          style={{ 
                            backgroundColor: `${selectedCategory.color}20`, 
                            color: selectedCategory.color 
                          }}
                        >
                          {React.createElement(getCategoryIcon(selectedCategory.icon || 'Folder'), { className: 'w-4 h-4' })}
                        </div>
                        <div>
                          <h4 className="font-semibold text-slate-200">{selectedCategory.name || 'Sans nom'}</h4>
                          <p className="text-sm text-slate-400">{selectedCategory.description}</p>
                        </div>
                      </div>

                      <div>
                        <h5 className="text-sm font-medium text-slate-300 mb-2">Hôtes dans cette catégorie</h5>
                        <div className="space-y-2 max-h-32 overflow-auto">
                          {getHostsByCategory(selectedCategory.id).map((host) => (
                            <div
                              key={host.id}
                              className="flex items-center justify-between p-2 bg-slate-800 rounded border border-slate-600"
                            >
                              <div>
                                <p className="font-mono text-sm text-slate-200">{host.ip}</p>
                                <p className="text-xs text-slate-400">{host.hostname || 'Sans nom'}</p>
                              </div>
                              <span className={`text-xs px-2 py-1 rounded ${
                                host.status === 'active' ? 'bg-green-900/50 text-green-400 border border-green-700' :
                                host.status === 'compromised' ? 'bg-orange-900/50 text-orange-400 border border-orange-700' :
                                'bg-slate-700 text-slate-400 border border-slate-600'
                              }`}>
                                {host.status}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};
