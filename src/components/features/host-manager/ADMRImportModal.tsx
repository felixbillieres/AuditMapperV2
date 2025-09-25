import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  Search, 
  ExternalLink, 
  Terminal, 
  AlertTriangle,
  ChevronRight,
  Loader2
} from 'lucide-react';
import { createPortal } from 'react-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ADMRSection, ADMRAttack, loadADMRSection } from '@/utils/admrParser';

interface ADMRImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportAttack: (attack: ADMRAttack) => void;
}

export const ADMRImportModal: React.FC<ADMRImportModalProps> = ({
  isOpen,
  onClose,
  onImportAttack,
}) => {
  const [sections, setSections] = useState<ADMRSection[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSection, setSelectedSection] = useState<string | null>(null);
  const [selectedAttack, setSelectedAttack] = useState<ADMRAttack | null>(null);
  const [currentSectionAttacks, setCurrentSectionAttacks] = useState<ADMRAttack[]>([]);

  // Charger la liste des sections disponibles au montage
  useEffect(() => {
    if (isOpen) {
      loadAvailableSections();
    }
  }, [isOpen]);

  const loadAvailableSections = async () => {
    setLoading(true);
    try {
      // Charger seulement les métadonnées des sections, pas les attaques
      const sectionNames = [
        'NO CREDENTIALS VULNS',
        'GOT USERNAME', 
        'GOT CREDENTIALS',
        'GOT LOW ACCESS',
        'GOT LOCAL ADMIN ACCESS',
        'GOT DOMAIN ADMIN ACCESS',
        'ADCS ABUSE',
        'CRACKING HASH',
        'KERBEROS DELEGATION ABUSE',
        'LATERAL MOVE',
        'MITM (LISTEN & RELAY)',
        'NEED CREDENTIALS VULNS',
        'PERMISSIONS ABUSE',
        'PERSISTENCE',
        'TRUST ABUSE'
      ];
      
      const sectionsMetadata = sectionNames.map(name => ({
        name,
        color: getSectionColor(name),
        attacks: [] // Pas d'attaques chargées pour l'instant
      }));
      
      setSections(sectionsMetadata);
    } catch (error) {
      console.error('Erreur lors du chargement des sections ADMR:', error);
    } finally {
      setLoading(false);
    }
  };

  const getSectionColor = (sectionName: string): string => {
    const colorMap: { [key: string]: string } = {
      'NO CREDENTIALS VULNS': '#ff6b6b',
      'GOT USERNAME': '#1450f0',
      'GOT CREDENTIALS': '#4ecdc4',
      'GOT LOW ACCESS': '#e3e3e3',
      'GOT LOCAL ADMIN ACCESS': '#e178e1',
      'GOT DOMAIN ADMIN ACCESS': '#ff9f43',
      'ADCS ABUSE': '#7806a0',
      'CRACKING HASH': '#ff6b6b',
      'KERBEROS DELEGATION ABUSE': '#32a5ff',
      'LATERAL MOVE': '#4ecdc4',
      'MITM (LISTEN & RELAY)': '#ff6b6b',
      'NEED CREDENTIALS VULNS': '#aa8c46',
      'PERMISSIONS ABUSE': '#324bff',
      'PERSISTENCE': '#ff6b6b',
      'TRUST ABUSE': '#ff6b6b'
    };
    return colorMap[sectionName] || '#60a5fa';
  };

  const loadSectionAttacks = async (sectionName: string) => {
    setLoading(true);
    try {
      const sectionPath = `/ADMR/ATTACKS/${sectionName}.canvas`;
      const sectionData = await loadADMRSection(sectionPath);
      setCurrentSectionAttacks(sectionData[0]?.attacks || []);
    } catch (error) {
      console.error('Erreur lors du chargement des attaques de la section:', error);
      setCurrentSectionAttacks([]);
    } finally {
      setLoading(false);
    }
  };

  // Filtrer les sections selon la recherche
  const filteredSections = sections.filter(section => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return section.name.toLowerCase().includes(searchLower);
  });

  // Filtrer les attaques de la section courante selon la recherche
  const filteredAttacks = currentSectionAttacks.filter(attack => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return attack.title.toLowerCase().includes(searchLower) ||
           attack.description.toLowerCase().includes(searchLower);
  });

  // Gérer la sélection d'une section
  const handleSectionSelect = async (sectionName: string) => {
    setSelectedSection(sectionName);
    setSelectedAttack(null);
    await loadSectionAttacks(sectionName);
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'Critical': return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'High': return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
      case 'Medium': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'Low': return 'bg-green-500/20 text-green-400 border-green-500/30';
      default: return 'bg-slate-500/20 text-slate-400 border-slate-500/30';
    }
  };

  const handleImportAttack = () => {
    if (selectedAttack) {
      onImportAttack(selectedAttack);
      onClose();
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div 
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <motion.div 
        className="w-full max-w-6xl max-h-[90vh] rounded-lg border border-slate-700 bg-slate-900 shadow-xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
      >
        {/* Header */}
        <div className="p-4 border-b border-slate-700">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-100">Importer depuis ADMR</h2>
              <p className="text-slate-400 text-sm">
                Sélectionnez une section et une attaque à importer dans votre étape d'exploitation
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="text-slate-400 hover:text-slate-100"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <div className="flex h-[calc(90vh-120px)]">
          {/* Sidebar - Sections */}
          <div className="w-1/3 border-r border-slate-700 bg-slate-800/50">
            <div className="p-4 border-b border-slate-700">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                <Input
                  placeholder="Rechercher une section ou attaque..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-slate-700 border-slate-600 text-slate-100"
                />
              </div>
            </div>

            <div className="p-4 space-y-2 overflow-y-auto h-full">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
                  <span className="ml-2 text-slate-400">Chargement des sections...</span>
                </div>
              ) : (
                filteredSections.map((section) => (
                  <Card
                    key={section.name}
                    className={`cursor-pointer transition-all duration-200 ${
                      selectedSection === section.name
                        ? 'border-blue-500 bg-blue-500/10'
                        : 'border-slate-600 hover:border-slate-500 hover:bg-slate-700/50'
                    }`}
                    onClick={() => handleSectionSelect(section.name)}
                  >
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: section.color }}
                          />
                          <span className="text-sm font-medium text-slate-100">
                            {section.name}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <ChevronRight className="w-4 h-4 text-slate-400" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </div>

          {/* Main Content - Attacks */}
          <div className="flex-1 flex flex-col">
            {selectedSection ? (
              <>
                {/* Attacks List */}
                <div className="flex-1 overflow-y-auto p-4">
                  {loading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
                      <span className="ml-2 text-slate-400">Chargement des attaques...</span>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {filteredAttacks.length === 0 ? (
                        <div className="text-center py-8">
                          <AlertTriangle className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                          <p className="text-slate-400">
                            {searchTerm ? 'Aucune attaque trouvée pour cette recherche' : 'Aucune attaque disponible dans cette section'}
                          </p>
                        </div>
                      ) : (
                        filteredAttacks.map((attack) => (
                        <Card
                          key={attack.id}
                          className={`cursor-pointer transition-all duration-200 ${
                            selectedAttack?.id === attack.id
                              ? 'border-blue-500 bg-blue-500/10'
                              : 'border-slate-600 hover:border-slate-500 hover:bg-slate-700/50'
                          }`}
                          onClick={() => setSelectedAttack(attack)}
                        >
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex-1">
                                <h3 className="font-semibold text-slate-100 mb-1">
                                  {attack.title}
                                </h3>
                                {attack.description && (
                                  <p className="text-sm text-slate-400 mb-2">
                                    {attack.description}
                                  </p>
                                )}
                                {attack.cve && (
                                  <Badge variant="outline" className="text-xs mb-2">
                                    {attack.cve}
                                  </Badge>
                                )}
                              </div>
                              <Badge 
                                className={`text-xs ${getSeverityColor(attack.severity)}`}
                              >
                                {attack.severity}
                              </Badge>
                            </div>
                            
                            {attack.command && (
                              <div className="bg-slate-800/50 rounded p-2 mb-2">
                                <div className="flex items-center gap-1 mb-1">
                                  <Terminal className="w-3 h-3 text-slate-400" />
                                  <span className="text-xs text-slate-400">Commande</span>
                                </div>
                                <code className="text-xs text-slate-300 font-mono">
                                  {attack.command.split('\n')[0]}
                                  {attack.command.split('\n').length > 1 && '...'}
                                </code>
                              </div>
                            )}

                            <div className="flex items-center gap-2 text-xs text-slate-500">
                              {attack.theory.length > 0 && (
                                <span>{attack.theory.length} lien(s) théorie</span>
                              )}
                              {attack.tools.length > 0 && (
                                <span>{attack.tools.length} outil(s)</span>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                        ))
                      )}
                    </div>
                  )}
                </div>

                {/* Preview & Import */}
                {selectedAttack && (
                  <div className="border-t border-slate-700 p-4 bg-slate-800/30">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-semibold text-slate-100">Aperçu de l'importation</h4>
                      <Button
                        onClick={handleImportAttack}
                        className="bg-blue-600 hover:bg-blue-700 text-white"
                      >
                        Importer cette attaque
                      </Button>
                    </div>
                    
                    <div className="space-y-3">
                      <div>
                        <label className="text-xs text-slate-400">Titre</label>
                        <p className="text-sm text-slate-100">{selectedAttack.title}</p>
                      </div>
                      
                      {selectedAttack.description && (
                        <div>
                          <label className="text-xs text-slate-400">Description</label>
                          <p className="text-sm text-slate-100">{selectedAttack.description}</p>
                        </div>
                      )}
                      
                      {selectedAttack.command && (
                        <div>
                          <label className="text-xs text-slate-400">Commande</label>
                          <div className="bg-slate-800 rounded p-2">
                            <code className="text-xs text-slate-300 font-mono whitespace-pre-wrap">
                              {selectedAttack.command}
                            </code>
                          </div>
                        </div>
                      )}
                      
                      {(selectedAttack.theory.length > 0 || selectedAttack.tools.length > 0) && (
                        <div>
                          <label className="text-xs text-slate-400">Ressources</label>
                          <div className="space-y-1">
                            {selectedAttack.theory.map((link, index) => (
                              <div key={index} className="flex items-center gap-1 text-xs">
                                <ExternalLink className="w-3 h-3 text-blue-400" />
                                <span className="text-blue-400">{link}</span>
                              </div>
                            ))}
                            {selectedAttack.tools.map((tool, index) => (
                              <div key={index} className="flex items-center gap-1 text-xs">
                                <AlertTriangle className="w-3 h-3 text-orange-400" />
                                <span className="text-orange-400">{tool}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <Search className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                  <p className="text-slate-400">Sélectionnez une section pour voir les attaques disponibles</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </div>,
    document.body
  );
};
