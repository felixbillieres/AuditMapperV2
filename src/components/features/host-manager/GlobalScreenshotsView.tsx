import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  Download, 
  Camera, 
  Search,
  ExternalLink,
  Copy
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useHostStore } from '@/stores/hostStore';

interface GlobalScreenshotsViewProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GlobalScreenshotsView: React.FC<GlobalScreenshotsViewProps> = ({
  isOpen,
  onClose,
}) => {
  const { hosts } = useHostStore();
  const [searchTerm, setSearchTerm] = useState('');

  // Agrégation de tous les screenshots
  const allScreenshots = React.useMemo(() => {
    const hostArray = Object.values(hosts);
    const screenshots: Array<{
      url: string;
      hostIp: string;
      hostname?: string;
      stepTitle?: string;
      stepDescription?: string;
      severity?: string;
    }> = [];

    hostArray.forEach(host => {
      // Screenshots des étapes d'exploitation
      host.exploitationSteps?.forEach(step => {
        step.screenshots?.forEach(screenshot => {
          screenshots.push({
            url: screenshot,
            hostIp: host.ip,
            hostname: host.hostname,
            stepTitle: step.title,
            stepDescription: step.description,
            severity: step.severity,
          });
        });
      });

      // Screenshots directs du host (si la propriété existe)
      if (host.screenshots) {
        host.screenshots.forEach(screenshot => {
          screenshots.push({
            url: screenshot,
            hostIp: host.ip,
            hostname: host.hostname,
          });
        });
      }
    });

    return screenshots;
  }, [hosts]);

  // Filtrage
  const filteredScreenshots = allScreenshots.filter(screenshot =>
    screenshot.hostIp.includes(searchTerm) ||
    (screenshot.hostname && screenshot.hostname.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (screenshot.stepTitle && screenshot.stepTitle.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const downloadScreenshot = (url: string, filename: string) => {
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.target = '_blank';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4"
        onClick={(e) => e.target === e.currentTarget && onClose()}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="w-full max-w-7xl max-h-[90vh] bg-slate-800 rounded-lg border border-slate-700 overflow-hidden flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-slate-700 bg-gradient-to-r from-slate-800 to-slate-700">
            <div className="flex items-center gap-3">
              <Camera className="w-6 h-6 text-blue-400" />
              <div>
                <h2 className="text-xl font-semibold text-slate-100">
                  Galerie Screenshots ({filteredScreenshots.length})
                </h2>
                <p className="text-sm text-slate-400">
                  Toutes les preuves visuelles collectées
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={onClose}
                className="bg-slate-700 border-slate-600 text-slate-200 hover:bg-slate-600"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Search */}
          <div className="p-4 border-b border-slate-700">
            <div className="relative">
              <Search className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-slate-700 border-slate-600 text-slate-100"
                placeholder="Rechercher par IP, hostname ou titre d'étape..."
              />
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-auto p-6">
            {filteredScreenshots.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredScreenshots.map((screenshot, index) => (
                  <Card key={index} className="border-slate-700 bg-slate-800 hover:bg-slate-700/50 transition-colors">
                    <CardContent className="p-4">
                      <div className="aspect-video mb-3 relative group">
                        <img
                          src={screenshot.url}
                          alt={`Screenshot ${index + 1}`}
                          className="w-full h-full object-cover rounded border border-slate-600"
                          onError={(e) => {
                            e.currentTarget.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjEyMCIgdmlld0JveD0iMCAwIDIwMCAxMjAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMTIwIiBmaWxsPSIjMzM0MTU1Ii8+Cjx0ZXh0IHg9IjEwMCIgeT0iNjAiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzk5QTBCOCIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkltYWdlIG5vbiB0cm91dsOpZTwvdGV4dD4KPC9zdmc+';
                          }}
                        />
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => window.open(screenshot.url, '_blank')}
                            className="bg-slate-800/80 border-slate-600 text-slate-200 hover:bg-slate-700"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => downloadScreenshot(screenshot.url, `screenshot-${screenshot.hostIp}-${index}.png`)}
                            className="bg-slate-800/80 border-slate-600 text-slate-200 hover:bg-slate-700"
                          >
                            <Download className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => copyToClipboard(screenshot.url)}
                            className="bg-slate-800/80 border-slate-600 text-slate-200 hover:bg-slate-700"
                          >
                            <Copy className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-blue-400">{screenshot.hostIp}</span>
                          {screenshot.severity && (
                            <span className={`text-xs px-2 py-1 rounded ${
                              screenshot.severity === 'Critical' ? 'bg-red-900/50 text-red-400' :
                              screenshot.severity === 'High' ? 'bg-orange-900/50 text-orange-400' :
                              screenshot.severity === 'Medium' ? 'bg-yellow-900/50 text-yellow-400' :
                              'bg-green-900/50 text-green-400'
                            }`}>
                              {screenshot.severity}
                            </span>
                          )}
                        </div>

                        {screenshot.hostname && (
                          <p className="text-xs text-slate-400">{screenshot.hostname}</p>
                        )}

                        {screenshot.stepTitle && (
                          <div>
                            <p className="text-sm font-medium text-slate-300 truncate">{screenshot.stepTitle}</p>
                            {screenshot.stepDescription && (
                              <p className="text-xs text-slate-500 line-clamp-2 mt-1">{screenshot.stepDescription}</p>
                            )}
                          </div>
                        )}

                        <div className="flex items-center gap-2 pt-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => copyToClipboard(screenshot.url)}
                            className="flex-1 bg-slate-700 border-slate-600 text-slate-200 hover:bg-slate-600 text-xs"
                          >
                            📋 Copier URL
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => window.open(screenshot.url, '_blank')}
                            className="bg-slate-700 border-slate-600 text-slate-200 hover:bg-slate-600 p-2"
                          >
                            <ExternalLink className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Camera className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                <p className="text-slate-500">
                  {searchTerm ? 'Aucun screenshot trouvé avec ces critères' : 'Aucun screenshot disponible'}
                </p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between p-6 border-t border-slate-700 bg-slate-800/80">
            <div className="text-sm text-slate-400">
              💡 Tip: Survolez les images pour accéder aux actions rapides
            </div>
            <div className="text-sm text-slate-400">
              {filteredScreenshots.length} screenshot{filteredScreenshots.length > 1 ? 's' : ''} trouvé{filteredScreenshots.length > 1 ? 's' : ''}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
