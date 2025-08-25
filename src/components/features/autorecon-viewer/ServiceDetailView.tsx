import React, { useState } from 'react';
import { useAutoReconStore } from '../../../stores/autoReconStore';
import { Card } from '../../ui/card';
import { Button } from '../../ui/button';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { 
  ArrowLeft,
  Terminal, 
  Shield, 
  Activity,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  Eye,
  Copy,
  Download,
  Code,
  FileText,
  Maximize2,
  Minimize2,
  ChevronLeft,
  ChevronRight,
  Grid3X3
} from 'lucide-react';

interface ServiceDetailViewProps {
  hostIp: string;
  serviceName: string;
  port: number;
  onBack: () => void;
}

const ServiceDetailView: React.FC<ServiceDetailViewProps> = ({ 
  hostIp, 
  serviceName, 
  port, 
  onBack 
}) => {
  const { getHostByIP } = useAutoReconStore();
  const [viewMode, setViewMode] = useState<'markdown' | 'raw'>('markdown');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [currentPage, setCurrentPage] = useState<'overview' | 'vulnerabilities' | 'scans'>('overview');
  const [currentScanIndex, setCurrentScanIndex] = useState(0);
  
  const host = getHostByIP(hostIp);
  const service = host?.services.find(s => s.name === serviceName && s.port === port);
  
  if (!host || !service) {
    return (
      <div className="text-center py-12">
        <Terminal className="w-16 h-16 text-slate-400 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-white mb-2">Service non trouvé</h3>
        <p className="text-slate-400 mb-4">
          Le service {serviceName} sur le port {port} de l'hôte {hostIp} n'a pas été trouvé.
        </p>
        <Button onClick={onBack} variant="outline">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Retour
        </Button>
      </div>
    );
  }

  const generateOverviewMarkdown = () => {
    let markdown = `# Service ${service.name} - ${hostIp}:${port}\n\n`;
    
    // Service Information
    markdown += `## 📋 Informations du service\n\n`;
    markdown += `- **Service**: ${service.name}\n`;
    markdown += `- **Port**: ${port}/${service.protocol}\n`;
    markdown += `- **Hôte**: ${hostIp}\n`;
    if (service.version) {
      markdown += `- **Version**: ${service.version}\n`;
    }
    markdown += `- **Nombre de scans**: ${service.scans.length}\n`;
    markdown += `- **Vulnérabilités**: ${service.vulnerabilities.length}\n\n`;

    // Banner
    if (service.banner) {
      markdown += `## 🏷️ Banner\n\n`;
      markdown += `\`\`\`\n${service.banner}\n\`\`\`\n\n`;
    }

    return markdown;
  };

  const generateVulnerabilitiesMarkdown = () => {
    let markdown = `# Vulnérabilités - ${service.name}:${port}\n\n`;
    
    if (service.vulnerabilities.length === 0) {
      markdown += `## ✅ Aucune vulnérabilité détectée\n\n`;
      markdown += `Ce service ne présente aucune vulnérabilité connue lors de l'analyse.\n\n`;
      return markdown;
    }

    const vulnsBySeverity = {
      critical: service.vulnerabilities.filter(v => v.severity === 'critical'),
      high: service.vulnerabilities.filter(v => v.severity === 'high'),
      medium: service.vulnerabilities.filter(v => v.severity === 'medium'),
      low: service.vulnerabilities.filter(v => v.severity === 'low')
    };

    markdown += `## 🛡️ Résumé des vulnérabilités\n\n`;
    markdown += `| Sévérité | Nombre |\n`;
    markdown += `|----------|--------|\n`;
    Object.entries(vulnsBySeverity).forEach(([severity, vulns]) => {
      if (vulns.length > 0) {
        const emoji = severity === 'critical' ? '🔴' : 
                     severity === 'high' ? '🟠' : 
                     severity === 'medium' ? '🟡' : '🔵';
        markdown += `| ${emoji} ${severity.charAt(0).toUpperCase() + severity.slice(1)} | ${vulns.length} |\n`;
      }
    });
    markdown += `\n`;

    Object.entries(vulnsBySeverity).forEach(([severity, vulns]) => {
      if (vulns.length > 0) {
        const emoji = severity === 'critical' ? '🔴' : 
                     severity === 'high' ? '🟠' : 
                     severity === 'medium' ? '🟡' : '🔵';
        
        markdown += `## ${emoji} ${severity.charAt(0).toUpperCase() + severity.slice(1)} (${vulns.length})\n\n`;
        
        vulns.forEach((vuln, index) => {
          markdown += `### ${index + 1}. ${vuln.title}\n\n`;
          markdown += `${vuln.description}\n\n`;
          
          if (vuln.cve) {
            markdown += `**CVE**: [${vuln.cve}](https://cve.mitre.org/cgi-bin/cvename.cgi?name=${vuln.cve})\n\n`;
          }
          
          if (vuln.cvss) {
            markdown += `**Score CVSS**: ${vuln.cvss}/10\n\n`;
          }
          
          if (vuln.references && vuln.references.length > 0) {
            markdown += `**Références**:\n`;
            vuln.references.forEach(ref => {
              markdown += `- [${ref}](${ref})\n`;
            });
            markdown += `\n`;
          }
          markdown += `---\n\n`;
        });
      }
    });

    return markdown;
  };

  const generateScanMarkdown = (scanIndex: number) => {
    if (scanIndex >= service.scans.length) return '';
    
    const scan = service.scans[scanIndex];
    let markdown = `# Scan ${scanIndex + 1}/${service.scans.length} - ${scan.tool.toUpperCase()}\n\n`;
    
    markdown += `## 📊 Informations du scan\n\n`;
    markdown += `- **Outil**: ${scan.tool}\n`;
    markdown += `- **Fichier source**: \`${scan.outputFile}\`\n`;
    if (scan.timestamp) {
      markdown += `- **Date d'exécution**: ${scan.timestamp}\n`;
    }
    markdown += `\n`;

    if (scan.command) {
      markdown += `## 💻 Commande exécutée\n\n`;
      markdown += `\`\`\`bash\n${scan.command}\n\`\`\`\n\n`;
    }
    
    markdown += `## 📝 Sortie complète\n\n`;
    markdown += `\`\`\`\n${scan.output}\n\`\`\`\n\n`;

    return markdown;
  };

  const getCurrentMarkdown = () => {
    switch (currentPage) {
      case 'overview':
        return generateOverviewMarkdown();
      case 'vulnerabilities':
        return generateVulnerabilitiesMarkdown();
      case 'scans':
        return generateScanMarkdown(currentScanIndex);
      default:
        return generateOverviewMarkdown();
    }
  };

  const currentMarkdown = getCurrentMarkdown();

  const copyToClipboard = () => {
    navigator.clipboard.writeText(currentMarkdown);
    alert('Contenu copié dans le presse-papier !');
  };

  const downloadMarkdown = () => {
    const filename = currentPage === 'scans' 
      ? `${serviceName}-${hostIp}-${port}-scan-${currentScanIndex + 1}.md`
      : `${serviceName}-${hostIp}-${port}-${currentPage}.md`;
    
    const blob = new Blob([currentMarkdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'text-red-400';
      case 'high': return 'text-orange-400'; 
      case 'medium': return 'text-yellow-400';
      case 'low': return 'text-blue-400';
      default: return 'text-slate-400';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button onClick={onBack} variant="outline" size="sm">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Retour
          </Button>
          <div className="flex items-center gap-3">
            <Terminal className="w-8 h-8 text-blue-400" />
            <div>
              <h2 className="text-2xl font-bold text-white">
                {service.name} - {hostIp}:{port}
              </h2>
              <p className="text-slate-400">{service.protocol.toUpperCase()}</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={() => setViewMode(viewMode === 'markdown' ? 'raw' : 'markdown')}
            variant="outline"
            size="sm"
          >
            {viewMode === 'markdown' ? <Code className="w-4 h-4 mr-2" /> : <Eye className="w-4 h-4 mr-2" />}
            {viewMode === 'markdown' ? 'Vue brute' : 'Vue formatée'}
          </Button>
          
          <Button onClick={copyToClipboard} variant="outline" size="sm">
            <Copy className="w-4 h-4 mr-2" />
            Copier
          </Button>
          
          <Button onClick={downloadMarkdown} variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            Télécharger
          </Button>
        </div>
      </div>

      {/* Service Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4 bg-slate-800/50 backdrop-blur-sm border-slate-700">
          <div className="flex items-center gap-3">
            <Activity className="w-6 h-6 text-green-400" />
            <div>
              <p className="text-xl font-bold text-white">{port}</p>
              <p className="text-slate-400 text-sm">Port {service.protocol}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4 bg-slate-800/50 backdrop-blur-sm border-slate-700">
          <div className="flex items-center gap-3">
            <Terminal className="w-6 h-6 text-blue-400" />
            <div>
              <p className="text-xl font-bold text-white">{service.scans.length}</p>
              <p className="text-slate-400 text-sm">Scans</p>
            </div>
          </div>
        </Card>

        <Card className="p-4 bg-slate-800/50 backdrop-blur-sm border-slate-700">
          <div className="flex items-center gap-3">
            <Shield className="w-6 h-6 text-red-400" />
            <div>
              <p className="text-xl font-bold text-white">{service.vulnerabilities.length}</p>
              <p className="text-slate-400 text-sm">Vulnérabilités</p>
            </div>
          </div>
        </Card>

        <Card className="p-4 bg-slate-800/50 backdrop-blur-sm border-slate-700">
          <div className="flex items-center gap-3">
            <FileText className="w-6 h-6 text-purple-400" />
            <div>
              <p className="text-xl font-bold text-white">{service.files.length}</p>
              <p className="text-slate-400 text-sm">Fichiers</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Service Information */}
      <Card className="p-6 bg-slate-800/50 backdrop-blur-sm border-slate-700">
        <h3 className="text-lg font-semibold text-white mb-4">Informations du service</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="text-white font-medium mb-2">Détails</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-400">Service:</span>
                <span className="text-white">{service.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Port:</span>
                <span className="text-white">{port}/{service.protocol}</span>
              </div>
              {service.version && (
                <div className="flex justify-between">
                  <span className="text-slate-400">Version:</span>
                  <span className="text-white">{service.version}</span>
                </div>
              )}
            </div>
          </div>
          
          {service.banner && (
            <div>
              <h4 className="text-white font-medium mb-2">Banner</h4>
              <div className="bg-slate-700/30 p-3 rounded text-sm">
                <pre className="text-slate-300 whitespace-pre-wrap">
                  {service.banner}
                </pre>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Report Content */}
      <div className={`${isFullscreen ? 'fixed inset-0 z-50 bg-slate-900' : ''}`}>
        <Card className={`${isFullscreen ? 'h-full rounded-none border-0' : ''} p-6 bg-slate-800/50 backdrop-blur-sm border-slate-700`}>
          {/* Header with navigation */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <h3 className="text-lg font-semibold text-white">
                Rapport complet - {viewMode === 'markdown' ? 'Vue formatée' : 'Vue brute'}
              </h3>
              
              {/* Page Navigation */}
              <div className="flex items-center gap-2 bg-slate-700/50 rounded-lg p-1">
                <Button
                  onClick={() => setCurrentPage('overview')}
                  variant={currentPage === 'overview' ? 'default' : 'ghost'}
                  size="sm"
                  className={currentPage === 'overview' ? 'bg-blue-600 text-white' : 'text-slate-300'}
                >
                  Vue d'ensemble
                </Button>
                <Button
                  onClick={() => setCurrentPage('vulnerabilities')}
                  variant={currentPage === 'vulnerabilities' ? 'default' : 'ghost'}
                  size="sm"
                  className={currentPage === 'vulnerabilities' ? 'bg-red-600 text-white' : 'text-slate-300'}
                >
                  Vulnérabilités ({service.vulnerabilities.length})
                </Button>
                <Button
                  onClick={() => setCurrentPage('scans')}
                  variant={currentPage === 'scans' ? 'default' : 'ghost'}
                  size="sm"
                  className={currentPage === 'scans' ? 'bg-green-600 text-white' : 'text-slate-300'}
                >
                  Scans ({service.scans.length})
                </Button>
              </div>

              {/* Scan Navigation (only when on scans page) */}
              {currentPage === 'scans' && service.scans.length > 1 && (
                <div className="flex items-center gap-2 bg-slate-700/50 rounded-lg p-1">
                  <Button
                    onClick={() => setCurrentScanIndex(Math.max(0, currentScanIndex - 1))}
                    disabled={currentScanIndex === 0}
                    variant="ghost"
                    size="sm"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <span className="text-slate-300 text-sm px-2">
                    {currentScanIndex + 1} / {service.scans.length}
                  </span>
                  <Button
                    onClick={() => setCurrentScanIndex(Math.min(service.scans.length - 1, currentScanIndex + 1))}
                    disabled={currentScanIndex === service.scans.length - 1}
                    variant="ghost"
                    size="sm"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Button
                onClick={() => setViewMode(viewMode === 'markdown' ? 'raw' : 'markdown')}
                variant="outline"
                size="sm"
              >
                {viewMode === 'markdown' ? <Code className="w-4 h-4 mr-2" /> : <Eye className="w-4 h-4 mr-2" />}
                {viewMode === 'markdown' ? 'Vue brute' : 'Vue formatée'}
              </Button>
              
              <Button onClick={copyToClipboard} variant="outline" size="sm">
                <Copy className="w-4 h-4 mr-2" />
                Copier
              </Button>
              
              <Button onClick={downloadMarkdown} variant="outline" size="sm">
                <Download className="w-4 h-4 mr-2" />
                Télécharger
              </Button>

              <Button
                onClick={() => setIsFullscreen(!isFullscreen)}
                variant="outline"
                size="sm"
              >
                {isFullscreen ? <Minimize2 className="w-4 h-4 mr-2" /> : <Maximize2 className="w-4 h-4 mr-2" />}
                {isFullscreen ? 'Réduire' : 'Plein écran'}
              </Button>
            </div>
          </div>
          
          {/* Content Area */}
          <div className={`bg-slate-900/50 rounded border border-slate-600 p-6 overflow-auto ${
            isFullscreen ? 'h-[calc(100vh-120px)]' : 'min-h-[70vh] max-h-[80vh]'
          }`}>
            {viewMode === 'markdown' ? (
              <div className="prose prose-invert prose-slate max-w-none">
                <ReactMarkdown 
                  remarkPlugins={[remarkGfm]}
                  className="text-slate-300"
                  components={{
                    h1: ({children}) => <h1 className="text-3xl font-bold text-white mb-6">{children}</h1>,
                    h2: ({children}) => <h2 className="text-2xl font-semibold text-white mb-4 mt-8">{children}</h2>,
                    h3: ({children}) => <h3 className="text-xl font-medium text-white mb-3 mt-6">{children}</h3>,
                    h4: ({children}) => <h4 className="text-lg font-medium text-white mb-2 mt-4">{children}</h4>,
                    p: ({children}) => <p className="text-slate-300 mb-4 leading-relaxed">{children}</p>,
                    code: ({children}) => <code className="bg-slate-800 px-2 py-1 rounded text-sm text-slate-200">{children}</code>,
                    pre: ({children}) => <pre className="bg-slate-800 p-6 rounded text-sm text-slate-200 overflow-x-auto mb-6 border border-slate-700">{children}</pre>,
                    ul: ({children}) => <ul className="list-disc list-inside text-slate-300 mb-4 space-y-2 pl-4">{children}</ul>,
                    ol: ({children}) => <ol className="list-decimal list-inside text-slate-300 mb-4 space-y-2 pl-4">{children}</ol>,
                    li: ({children}) => <li className="leading-relaxed">{children}</li>,
                    a: ({href, children}) => <a href={href} className="text-blue-400 hover:text-blue-300 underline" target="_blank" rel="noopener noreferrer">{children}</a>,
                    strong: ({children}) => <strong className="text-white font-semibold">{children}</strong>,
                    hr: () => <hr className="border-slate-600 my-8" />,
                    table: ({children}) => <table className="min-w-full border-collapse border border-slate-600 mb-6">{children}</table>,
                    thead: ({children}) => <thead className="bg-slate-800">{children}</thead>,
                    th: ({children}) => <th className="border border-slate-600 px-4 py-2 text-left text-white font-semibold">{children}</th>,
                    td: ({children}) => <td className="border border-slate-600 px-4 py-2 text-slate-300">{children}</td>,
                  }}
                >
                  {currentMarkdown}
                </ReactMarkdown>
              </div>
            ) : (
              <pre className="text-slate-300 text-sm whitespace-pre-wrap leading-relaxed">
                {currentMarkdown}
              </pre>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};

export default ServiceDetailView;
