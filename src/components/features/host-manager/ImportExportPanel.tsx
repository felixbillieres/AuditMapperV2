import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { X, Download, Upload, FileText, Trash2, Server, Folder, FolderOpen, Copy, Check, FileArchive, FileText as Report, Network, Key, AlertTriangle, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SuccessModal } from '@/components/ui/SuccessModal';
import { ConfirmDeleteModal } from '@/components/ui/ConfirmDeleteModal';

import { Textarea } from '@/components/ui/textarea';

import { useHostStore } from '@/stores/hostStore';
import { useProjectStore } from '@/stores/projectStore';
import { downloadFile, readFileAsText } from '@/utils';
import JSZip from 'jszip';

interface ImportExportPanelProps {
  onClose: () => void;
}

interface ExportData {
  metadata: {
    exportedAt: string;
    version: string;
    totalHosts: number;
    totalCategories: number;
    totalConnections: number;
    totalCredentials: number;
    totalVulnerabilities: number;
  };
  hosts: any[];
  categories: any[];
  networkNodes: Record<string, any>;
  reports: {
    executive: string;
    technical: string;
    credentials: string;
    vulnerabilities: string;
    network: string;
  };
}

export const ImportExportPanel: React.FC<ImportExportPanelProps> = ({
  onClose,
}) => {
  const { hosts, categories, networkNodes, clearAllData, addHost, addCategory, updateNetworkNode, exportProjectData, clearProjectData } = useHostStore();
  const { getCurrentProject, getAllProjects } = useProjectStore();
  
  // Get all projects for the dropdown
  const allProjects = getAllProjects();
  
  // Convertir l'objet hosts en tableau
  const hostsArray = Object.values(hosts);
  const [exportDataState, setExportDataState] = useState<string>('');
  const [importDataState, setImportDataState] = useState<string>('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      // Prévisualiser la structure si ZIP
      if (file.name.endsWith('.zip')) {
        const zip = new JSZip();
        zip.loadAsync(file).then((z) => {
          const paths: string[] = [];
          z.forEach((relativePath) => paths.push(relativePath));
          setImportFileTreePaths(paths);
        }).catch(() => setImportFileTreePaths([]));
      } else {
        setImportFileTreePaths(['data.json']);
      }
    }
  };
  const [isImporting, setIsImporting] = useState(false);
  const [importMode, setImportMode] = useState<'merge' | 'replace'>('merge');
  const [importOptions, setImportOptions] = useState({ hosts: true, categories: true, networkNodes: true });
  const [importPreview, setImportPreview] = useState<ExportData | null>(null);
  const [exportType, setExportType] = useState<'json' | 'zip' | 'report'>('json');
  const [exportScope, setExportScope] = useState<'all' | 'current' | 'selected'>('current');
  const [selectedProjects, setSelectedProjects] = useState<string[]>([]);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [exportPreviewPaths, setExportPreviewPaths] = useState<string[]>([]);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successDetails, setSuccessDetails] = useState<{
    importedCount: number;
    mode: 'replace' | 'merge';
    options: { hosts: boolean; categories: boolean; networkNodes: boolean };
  } | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [importFileTreePaths, setImportFileTreePaths] = useState<string[]>([]);

  // Helpers: construire un arbre (objet imbriqué) à partir d'une liste de chemins
  type Tree = { [name: string]: Tree | null };
  const buildTree = (paths: string[]): Tree => {
    const root: Tree = {};
    for (const raw of paths) {
      const parts = raw.split('/').filter(Boolean);
      let node = root;
      parts.forEach((part, idx) => {
        const isFile = idx === parts.length - 1;
        if (!node[part]) node[part] = isFile ? null : {};
        if (!isFile) node = node[part] as Tree;
      });
    }
    return root;
  };

  const renderTree = (tree: Tree, depth = 0) => {
    const entries = Object.entries(tree).sort(([a], [b]) => a.localeCompare(b));
    return (
      <ul className="text-xs">
        {entries.map(([name, child]) => (
          <li key={`${depth}-${name}`} className="pl-2">
            <div className="flex items-center gap-1 text-slate-300">
              {child ? <Folder className="w-3 h-3 text-blue-300" /> : <FileText className="w-3 h-3 text-slate-300" />}
              <span>{name}</span>
            </div>
            {child && <div className="pl-4 border-l border-slate-600 ml-1">{renderTree(child, depth + 1)}</div>}
          </li>
        ))}
      </ul>
    );
  };

  const exportStats = useMemo(() => {
    const totalConnections = hostsArray.reduce((acc: number, h: any) => acc + (h.outgoingConnections?.length || 0), 0);
    const totalCredentials = hostsArray.reduce((acc: number, h: any) => acc + (h.credentials?.length || 0), 0);
    const totalVulns = hostsArray.reduce((acc: number, h: any) => acc + (h.vulnerabilities?.length || 0), 0);
    return { totalConnections, totalCredentials, totalVulns };
  }, [hostsArray, categories]);

  const buildExportPaths = (): string[] => {
    const sanitize = (s: string) => String(s || '').replace(/[^a-z0-9_\-\.]+/gi, '-').slice(0, 64);
    if (exportType === 'json') return ['data.json'];
    if (exportType === 'report') return ['report.md'];
    // zip avec arbo zones/zone/host
    const paths: string[] = [
      'README.md',
      'data.json',
      'reports/executive.md',
      'reports/technical.md',
      'reports/credentials.md',
      'reports/vulnerabilities.md',
      'reports/network.md',
    ];
    const catById: Record<string, any> = {};
    categories.forEach((c: any) => (catById[c.id] = c));
    const byCat: Record<string, any[]> = {};
    hostsArray.forEach((h: any) => {
      const key = h.category && catById[h.category] ? catById[h.category].name : '_uncategorized';
      byCat[key] = byCat[key] || [];
      byCat[key].push(h);
    });
    Object.entries(byCat).forEach(([catName, list]) => {
      const zone = `zones/${sanitize(catName)}`;
      paths.push(zone + '/');
      list.forEach((h: any, idx: number) => {
        const hostLabel = sanitize(h.hostname || h.ip || `host-${idx + 1}`);
        const base = `${zone}/${hostLabel}`;
        paths.push(`${base}/`);
        paths.push(`${base}/host.json`);
        paths.push(`${base}/notes.md`);
        paths.push(`${base}/credentials.json`);
        paths.push(`${base}/connections.json`);
        paths.push(`${base}/vulnerabilities.json`);
        paths.push(`${base}/exploitation.md`);
        if (Array.isArray(h.exploitationSteps)) {
          const screenshotsCount = h.exploitationSteps.reduce((acc: number, s: any) => acc + ((s.screenshots || []).length), 0);
          if (screenshotsCount > 0) {
            paths.push(`${base}/screenshots/`);
            h.exploitationSteps.forEach((step: any, sidx: number) => {
              (step.screenshots || []).forEach((_: string, i: number) => {
                paths.push(`${base}/screenshots/step-${sidx + 1}-${i + 1}.jpg`);
              });
            });
          }
        }
      });
    });
    return paths;
  };

  const previewExport = () => {
    const paths = buildExportPaths();
    setExportPreviewPaths(paths);
  };

  // Générer un rapport exécutif
  const generateExecutiveReport = (hostsForReport: any[] = hostsArray, categoriesForReport: any[] = categories) => {
    const totalHosts = hostsForReport.length;
    const compromisedHosts = hostsForReport.filter((h: any) => h.status === 'compromised').length;
    const activeHosts = hostsForReport.filter((h: any) => h.status === 'active').length;
    const totalCredentials = hostsForReport.reduce((acc: number, h: any) => acc + (h.credentials?.length || 0), 0);
    const totalVulnerabilities = hostsForReport.reduce((acc: number, h: any) => acc + (h.vulnerabilities?.length || 0), 0);
    
    const categoriesByHost = categoriesForReport.map(cat => {
      const hostsInCategory = hostsForReport.filter((h: any) => h.category === cat.id);
      return {
        name: cat.name,
        count: hostsInCategory.length,
        compromised: hostsInCategory.filter((h: any) => h.status === 'compromised').length
      };
    });

    return `
# RAPPORT EXÉCUTIF - AUDIT DE SÉCURITÉ

## 📊 Vue d'ensemble
- **Total d'hôtes analysés**: ${totalHosts}
- **Hôtes compromis**: ${compromisedHosts} (${totalHosts > 0 ? Math.round(compromisedHosts/totalHosts*100) : 0}%)
- **Hôtes actifs**: ${activeHosts}
- **Identifiants collectés**: ${totalCredentials}
- **Vulnérabilités identifiées**: ${totalVulnerabilities}

## 🎯 Points critiques
${compromisedHosts > 0 ? `⚠️ **${compromisedHosts} hôte(s) compromis** nécessitent une intervention immédiate` : '✅ Aucun hôte compromis détecté'}

## 📁 Répartition par catégorie
${categoriesByHost.map(cat => 
  `- **${cat.name}**: ${cat.count} hôte(s) ${cat.compromised > 0 ? `(${cat.compromised} compromis)` : ''}`
).join('\n')}

## 🔐 Recommandations prioritaires
1. **Isolation immédiate** des hôtes compromis
2. **Audit des accès** pour les identifiants collectés
3. **Correction des vulnérabilités** critiques
4. **Renforcement de la segmentation** réseau

---
*Généré le ${new Date().toLocaleDateString('fr-FR')}*
    `.trim();
  };

  // Générer un rapport technique détaillé
  const generateTechnicalReport = (hostsForReport: any[] = hostsArray, categoriesForReport: any[] = categories) => {
    const hostsByCategory = categoriesForReport.map(cat => {
      const hostsInCategory = hostsForReport.filter((h: any) => h.category === cat.id);
      return {
        category: cat,
        hosts: hostsInCategory
      };
    });

    return `
# RAPPORT TECHNIQUE DÉTAILLÉ

## 📋 Inventaire des hôtes

${hostsByCategory.map(catGroup => `
### 🗂️ ${catGroup.category.name}
${catGroup.hosts.map(host => `
#### 🖥️ ${host.hostname || host.ip}
- **IP**: ${host.ip}
- **OS**: ${host.os || 'Non spécifié'}
- **Statut**: ${host.status === 'compromised' ? '🔴 COMPROMIS' : host.status === 'active' ? '🟢 Actif' : '⚪ Inactif'}
- **Priorité**: ${host.priority || 'Non définie'}
- **Niveau de compromission**: ${host.compromiseLevel || 'Non évalué'}

${(host.usernames?.length > 0 || host.passwords?.length > 0 || host.hashes?.length > 0) ? `
**🔑 Identifiants collectés:**
${host.usernames?.length > 0 ? `Usernames: ${host.usernames.join(', ')}` : ''}
${host.passwords?.length > 0 ? `Passwords: ${host.passwords.join(', ')}` : ''}
${host.hashes?.length > 0 ? `Hashes: ${host.hashes.join(', ')}` : ''}
` : ''}

${host.vulnerabilities && host.vulnerabilities.length > 0 ? `
**⚠️ Vulnérabilités:**
${host.vulnerabilities.map(vuln => `- ${vuln.title} (${vuln.severity})`).join('\n')}
` : ''}

${host.exploitationSteps && host.exploitationSteps.length > 0 ? `
**🛠️ Étapes d'exploitation:**
${host.exploitationSteps.map((step, idx) => `${idx + 1}. ${step}`).join('\n')}
` : ''}

${host.notes ? `
**📝 Notes:**
${host.notes}
` : ''}

**🔗 Connexions réseau:**
- Sortantes: ${host.outgoingConnections?.length || 0}
- Entrantes: ${host.incomingConnections?.length || 0}
`).join('\n')}
`).join('\n')}

## 🌐 Topologie réseau
${hostsForReport.filter((h: any) => h.outgoingConnections?.length > 0 || h.incomingConnections?.length > 0).map((host: any) => `
**${host.hostname || host.ip}** (${host.ip})
${host.outgoingConnections?.map((conn: any) => `  → ${conn.toHostId}${conn.cause ? ` (${conn.cause})` : ''}`).join('\n') || '  Aucune connexion sortante'}
`).join('\n')}

---
*Généré le ${new Date().toLocaleDateString('fr-FR')}*
    `.trim();
  };

  // Générer un rapport des identifiants
  const generateCredentialsReport = (hostsForReport: any[] = hostsArray) => {
    const allCredentials = hostsForReport.flatMap((host: any) => 
      (host.credentials || []).map((cred: any) => ({
        ...cred,
        host: host.hostname || host.ip,
        hostIP: host.ip
      }))
    );

    const credentialsByType = allCredentials.reduce((acc, cred) => {
      if (!acc[cred.type]) acc[cred.type] = [];
      acc[cred.type].push(cred);
      return acc;
    }, {} as Record<string, any[]>);

    return `
# RAPPORT DES IDENTIFIANTS

## 📊 Statistiques
- **Total d'identifiants**: ${allCredentials.length}
- **Types d'identifiants**: ${Object.keys(credentialsByType).length}

## 🔑 Identifiants par type

${Object.entries(credentialsByType).map(([type, creds]) => {
  const credsArray = creds as any[];
  return `
### ${type.toUpperCase()} (${credsArray.length})
${credsArray.map((cred: any) => `
- **Hôte**: ${cred.host} (${cred.hostIP})
- **Utilisateur**: ${cred.username}
- **Domaine**: ${cred.domain || 'local'}
- **Hash/Mot de passe**: ${cred.hash || cred.password ? '***' : 'Non spécifié'}
- **Commentaire**: ${cred.comment || 'Aucun'}
`).join('\n')}
`;
}).join('\n')}

## ⚠️ Recommandations de sécurité
1. **Changer immédiatement** tous les mots de passe compromis
2. **Auditer les comptes** avec des privilèges élevés
3. **Implémenter l'authentification à deux facteurs**
4. **Surveiller les connexions** suspectes

---
*Généré le ${new Date().toLocaleDateString('fr-FR')}*
    `.trim();
  };

  // Générer un rapport des vulnérabilités
  const generateVulnerabilitiesReport = (hostsForReport: any[] = hostsArray) => {
    const allVulnerabilities = hostsForReport.flatMap((host: any) => 
      (host.vulnerabilities || []).map((vuln: any) => ({
        ...vuln,
        host: host.hostname || host.ip,
        hostIP: host.ip
      }))
    );

    const vulnsBySeverity = allVulnerabilities.reduce((acc, vuln) => {
      if (!acc[vuln.severity]) acc[vuln.severity] = [];
      acc[vuln.severity].push(vuln);
      return acc;
    }, {} as Record<string, any[]>);

    return `
# RAPPORT DES VULNÉRABILITÉS

## 📊 Statistiques
- **Total de vulnérabilités**: ${allVulnerabilities.length}
- **Niveaux de sévérité**: ${Object.keys(vulnsBySeverity).length}

## ⚠️ Vulnérabilités par sévérité

${Object.entries(vulnsBySeverity).map(([severity, vulns]) => {
  const vulnsArray = vulns as any[];
  return `
### ${severity.toUpperCase()} (${vulnsArray.length})
${vulnsArray.map((vuln: any) => `
- **Hôte**: ${vuln.host} (${vuln.hostIP})
- **Titre**: ${vuln.title}
- **Description**: ${vuln.description || 'Non spécifiée'}
- **CVE**: ${vuln.cve || 'Non spécifié'}
- **Score CVSS**: ${vuln.cvssScore || 'Non spécifié'}
- **Solution**: ${vuln.solution || 'Non spécifiée'}
`).join('\n')}
`;
}).join('\n')}

## 🎯 Priorités de correction
1. **CRITIQUE**: Corriger immédiatement
2. **HAUTE**: Corriger dans les 7 jours
3. **MOYENNE**: Corriger dans les 30 jours
4. **FAIBLE**: Corriger selon les ressources disponibles

---
*Généré le ${new Date().toLocaleDateString('fr-FR')}*
    `.trim();
  };

  // Générer un rapport réseau
  const generateNetworkReport = () => {
    const connections = hostsArray.flatMap((host: any) => 
      (host.outgoingConnections || []).map((conn: any) => ({
        from: host.hostname || host.ip,
        fromIP: host.ip,
        to: conn.toHostId,
        cause: conn.cause,
        type: 'outgoing'
      }))
    );

    return `
# RAPPORT RÉSEAU

## 🌐 Topologie des connexions

### 🔗 Connexions identifiées (${connections.length})
${connections.map(conn => `
- **${conn.from}** (${conn.fromIP}) → **${conn.to}**
  ${conn.cause ? `  Cause: ${conn.cause}` : ''}
`).join('\n')}

## 🎯 Analyse des chemins d'attaque
${hostsArray.filter((h: any) => h.status === 'compromised').map((host: any) => `
### 🚨 Hôte compromis: ${host.hostname || host.ip}
- **IP**: ${host.ip}
- **Connexions sortantes**: ${host.outgoingConnections?.length || 0}
- **Risque de propagation**: ${host.outgoingConnections?.length > 0 ? 'ÉLEVÉ' : 'LIMITÉ'}
`).join('\n')}

## 🛡️ Recommandations de segmentation
1. **Isoler** les hôtes compromis
2. **Restreindre** les connexions inter-segments
3. **Surveiller** les connexions suspectes
4. **Implémenter** une segmentation stricte

---
*Généré le ${new Date().toLocaleDateString('fr-FR')}*
    `.trim();
  };

  // Fonction d'export complète
  const handleExportComplete = async () => {
    setIsExporting(true);
    try {
      let exportData: ExportData;
      const currentProject = getCurrentProject();
      const allProjects = getAllProjects();

      if (exportScope === 'current' && currentProject) {
        // Export du projet actuel uniquement
        const projectData = exportProjectData(currentProject.id);
        const projectHosts = Object.values(projectData.hosts);
        const projectCategories = projectData.categories;
        
        const totalConnections = projectHosts.reduce((acc: number, h: any) => 
          acc + (h.outgoingConnections?.length || 0) + (h.incomingConnections?.length || 0), 0
        );
        const totalCredentials = projectHosts.reduce((acc: number, h: any) => 
          acc + (h.usernames?.length || 0) + (h.passwords?.length || 0) + (h.hashes?.length || 0) + (h.credentials?.length || 0), 0);
        const totalVulnerabilities = projectHosts.reduce((acc: number, h: any) => acc + (h.vulnerabilities?.length || 0), 0);

        exportData = {
          metadata: {
            exportedAt: new Date().toISOString(),
            version: '2.0.0',
            totalHosts: projectHosts.length,
            totalCategories: projectCategories.length,
            totalConnections,
            totalCredentials,
            totalVulnerabilities,
            projectId: currentProject.id,
            projectName: currentProject.name
          },
          hosts: projectHosts,
          categories: projectCategories,
          networkNodes: projectData.networkNodes,
          reports: {
            executive: generateExecutiveReport(),
            technical: generateTechnicalReport(),
            credentials: generateCredentialsReport(),
            vulnerabilities: generateVulnerabilitiesReport(),
            network: generateNetworkReport()
          }
        };
      } else if (exportScope === 'selected' && selectedProjects.length > 0) {
        // Export des projets sélectionnés
        const selectedProjectsData = selectedProjects.map(projectId => exportProjectData(projectId));
        const allSelectedHosts = selectedProjectsData.flatMap(data => Object.values(data.hosts));
        const allSelectedCategories = selectedProjectsData.flatMap(data => data.categories);
        
        // Dédupliquer les catégories par ID pour éviter les doublons
        const uniqueCategories = allSelectedCategories.reduce((acc: any[], cat: any) => {
          if (!acc.find(existing => existing.id === cat.id)) {
            acc.push(cat);
          }
          return acc;
        }, []);
        
        const totalConnections = allSelectedHosts.reduce((acc: number, h: any) => 
          acc + (h.outgoingConnections?.length || 0) + (h.incomingConnections?.length || 0), 0
        );
        const totalCredentials = allSelectedHosts.reduce((acc: number, h: any) => 
          acc + (h.usernames?.length || 0) + (h.passwords?.length || 0) + (h.hashes?.length || 0) + (h.credentials?.length || 0), 0);
        const totalVulnerabilities = allSelectedHosts.reduce((acc: number, h: any) => acc + (h.vulnerabilities?.length || 0), 0);

        exportData = {
          metadata: {
            exportedAt: new Date().toISOString(),
            version: '2.0.0',
            totalHosts: allSelectedHosts.length,
            totalCategories: uniqueCategories.length,
            totalConnections,
            totalCredentials,
            totalVulnerabilities,
            selectedProjects: selectedProjects
          },
          hosts: allSelectedHosts,
          categories: uniqueCategories,
          networkNodes: selectedProjectsData.reduce((acc, data) => ({ ...acc, ...data.networkNodes }), {}),
          reports: {
            executive: generateExecutiveReport(),
            technical: generateTechnicalReport(),
            credentials: generateCredentialsReport(),
            vulnerabilities: generateVulnerabilitiesReport(),
            network: generateNetworkReport()
          }
        };
      } else {
        // Export de tous les projets
        const totalConnections = hostsArray.reduce((acc: number, h: any) => 
          acc + (h.outgoingConnections?.length || 0) + (h.incomingConnections?.length || 0), 0
        );
        const totalCredentials = hostsArray.reduce((acc: number, h: any) => 
          acc + (h.usernames?.length || 0) + (h.passwords?.length || 0) + (h.hashes?.length || 0) + (h.credentials?.length || 0), 0);
        const totalVulnerabilities = hostsArray.reduce((acc: number, h: any) => acc + (h.vulnerabilities?.length || 0), 0);

        exportData = {
          metadata: {
            exportedAt: new Date().toISOString(),
            version: '2.0.0',
            totalHosts: hostsArray.length,
            totalCategories: categories.length,
            totalConnections,
            totalCredentials,
            totalVulnerabilities
          },
          hosts: hostsArray,
          categories,
          networkNodes,
          reports: {
            executive: generateExecutiveReport(),
            technical: generateTechnicalReport(),
            credentials: generateCredentialsReport(),
            vulnerabilities: generateVulnerabilitiesReport(),
            network: generateNetworkReport()
          }
        };
      }

      if (exportType === 'json') {
        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        await downloadFile(blob, `auditmapper-complete-${new Date().toISOString().split('T')[0]}.json`);
      } else if (exportType === 'zip') {
        const zip = new JSZip();
        
        // Ajouter les données JSON
        zip.file('data.json', JSON.stringify(exportData, null, 2));
        
        // Ajouter les rapports en format texte
        zip.file('reports/executive.md', exportData.reports.executive);
        zip.file('reports/technical.md', exportData.reports.technical);
        zip.file('reports/credentials.md', exportData.reports.credentials);
        zip.file('reports/vulnerabilities.md', exportData.reports.vulnerabilities);
        zip.file('reports/network.md', exportData.reports.network);
        
        // Ajouter un fichier README
        const readme = `
# AuditMapper - Export Complet

## 📁 Structure du fichier
- \`data.json\` : Données complètes de l'audit
- \`reports/\` : Rapports générés automatiquement
- \`zones/<zone>/<host>/\` : Dossiers par zone et hôte avec notes, identifiants, connexions, vulnérabilités et étapes d'exploitation

## 📊 Statistiques de l'audit
- Hôtes analysés : ${exportData.metadata.totalHosts}
- Catégories : ${exportData.metadata.totalCategories}
- Connexions réseau : ${exportData.metadata.totalConnections}
- Identifiants collectés : ${exportData.metadata.totalCredentials}
- Vulnérabilités : ${exportData.metadata.totalVulnerabilities}

## 🔄 Import
Pour réimporter ces données dans AuditMapper :
1. Ouvrir AuditMapper
2. Aller dans Import/Export
3. Sélectionner le fichier \`data.json\` ou le ZIP (la page sait lire \`data.json\`)
4. Choisir le mode d'import souhaité

---
Exporté le ${new Date().toLocaleDateString('fr-FR')}
        `.trim();
        zip.file('README.md', readme);
        
        // Arborescence zones/<zone>/<host>/
        const sanitize = (s: string) => String(s || '').replace(/[^a-z0-9_\-\.]+/gi, '-').slice(0, 64);
        const catById: Record<string, any> = {};
        categories.forEach((c: any) => (catById[c.id] = c));
        const byCat: Record<string, any[]> = {};
        hostsArray.forEach((h: any) => {
          const key = h.category && catById[h.category] ? catById[h.category].name : '_uncategorized';
          byCat[key] = byCat[key] || [];
          byCat[key].push(h);
        });

        Object.entries(byCat).forEach(([catName, list]) => {
          const zone = `zones/${sanitize(catName)}`;
          const folderZone = zip.folder(zone);
          list.forEach((h: any, idx: number) => {
            const hostLabel = sanitize(h.hostname || h.ip || `host-${idx + 1}`);
            const base = `${hostLabel}`;
            const fHost = folderZone!.folder(base)!;

            // host.json (informations de base)
            const hostInfo = {
              id: h.id,
              ip: h.ip,
              hostname: h.hostname,
              os: h.os,
              status: h.status,
              priority: h.priority,
              compromiseLevel: h.compromiseLevel,
              category: catName,
              createdAt: h.createdAt || undefined,
              updatedAt: h.updatedAt || undefined,
            };
            fHost.file('host.json', JSON.stringify(hostInfo, null, 2));

            // notes.md
            const notesMd = `# Notes - ${h.hostname || h.ip}\n\n${h.notes || ''}`;
            fHost.file('notes.md', notesMd);

            // credentials.json
            fHost.file('credentials.json', JSON.stringify(h.credentials || [], null, 2));

            // connections.json
            const connections = {
              outgoing: h.outgoingConnections || [],
              incoming: h.incomingConnections || [],
            };
            fHost.file('connections.json', JSON.stringify(connections, null, 2));

            // vulnerabilities.json
            fHost.file('vulnerabilities.json', JSON.stringify(h.vulnerabilities || [], null, 2));

            // exploitation.md + screenshots
            const steps = h.exploitationSteps || [];
            const lines: string[] = [];
            lines.push(`# Étapes d'exploitation - ${h.hostname || h.ip}`);
            steps.forEach((s: any, sidx: number) => {
              lines.push('');
              lines.push(`## ${sidx + 1}. ${s.title}`);
              if (s.cve) lines.push(`- CVE: ${s.cve}`);
              if (s.cvss !== undefined) lines.push(`- CVSS: ${s.cvss}`);
              lines.push(`- Sévérité: ${s.severity} | Statut: ${s.status}`);
              if (s.description) { lines.push(''); lines.push(s.description); }
              if (s.command) { lines.push(''); lines.push('```bash'); lines.push(s.command); lines.push('```'); }
              if (s.output) { lines.push(''); lines.push('```'); lines.push(s.output); lines.push('```'); }
              if (s.notes) { lines.push(''); lines.push(s.notes); }
              if (Array.isArray(s.screenshots) && s.screenshots.length) {
                lines.push('');
                s.screenshots.forEach((src: string, i: number) => {
                  const imgPath = `screenshots/step-${sidx + 1}-${i + 1}.jpg`;
                  lines.push(`![screenshot-${sidx + 1}-${i + 1}](${imgPath})`);
                });
              }
            });
            fHost.file('exploitation.md', lines.join('\n'));

            // screenshots
            if (steps.some((s: any) => Array.isArray(s.screenshots) && s.screenshots.length)) {
              const fShots = fHost.folder('screenshots')!;
              steps.forEach((s: any, sidx: number) => {
                (s.screenshots || []).forEach((src: string, i: number) => {
                  if (typeof src === 'string' && src.startsWith('data:image')) {
                    const base64 = src.split(',')[1];
                    fShots.file(`step-${sidx + 1}-${i + 1}.jpg`, base64, { base64: true });
                  }
                });
              });
            }
          });
        });

        const zipBlob = await zip.generateAsync({ type: 'blob' });
        await downloadFile(zipBlob, `auditmapper-complete-${new Date().toISOString().split('T')[0]}.zip`);
      } else if (exportType === 'report') {
        const reportContent = `
# RAPPORT COMPLET D'AUDIT DE SÉCURITÉ

${exportData.reports.executive}

---

${exportData.reports.technical}

---

${exportData.reports.credentials}

---

${exportData.reports.vulnerabilities}

---

${exportData.reports.network}

---

*Rapport généré automatiquement par AuditMapper v2.0.0*
*Exporté le ${new Date().toLocaleDateString('fr-FR')}*
        `.trim();
        
        const blob = new Blob([reportContent], { type: 'text/markdown' });
        await downloadFile(blob, `auditmapper-report-${new Date().toISOString().split('T')[0]}.md`);
      }

      setExportDataState(JSON.stringify(exportData, null, 2));
    } catch (error) {
      console.error('Erreur lors de l\'export:', error);
      alert('Erreur lors de l\'export des données');
    } finally {
      setIsExporting(false);
    }
  };

  // Fonction d'import améliorée
  const handleImport = async () => {
    if (!selectedFile && !importDataState.trim()) return;
    
    setIsImporting(true);
    try {
      let content: string;
      
      if (selectedFile) {
        // Gérer les fichiers ZIP
        if (selectedFile.name.endsWith('.zip')) {
          const zip = new JSZip();
          const zipContent = await zip.loadAsync(selectedFile);
          
          // Chercher le fichier data.json dans le ZIP
          const dataFile = zipContent.file('data.json');
          if (dataFile) {
            content = await dataFile.async('string');
          } else {
            throw new Error('Fichier data.json non trouvé dans le ZIP');
          }
        } else {
          content = await readFileAsText(selectedFile);
        }
      } else {
        content = importDataState;
      }
      
      const data = JSON.parse(content);
      
      // Validation des données
      if (!data) {
        throw new Error('Données vides');
      }
      
      // Vérifier si c'est un format AuditMapper
      if (data.metadata && (data.hosts || data.categories)) {
        // Assurer que hosts est un tableau
        const hostsArray = Array.isArray(data.hosts) ? data.hosts : 
                          data.hosts ? Object.values(data.hosts) : [];
        const categoriesArray = Array.isArray(data.categories) ? data.categories : 
                               data.categories ? Object.values(data.categories) : [];
        
        setImportPreview({
          ...data,
          hosts: hostsArray,
          categories: categoriesArray
        });
        // Construire une arbo simulée depuis le JSON
        const hostPaths = hostsArray.slice(0, 20).map((h: any, i: number) => `hosts/${h.hostname || h.ip || 'host-' + (i + 1)}.json`);
        const catPaths = categoriesArray.slice(0, 20).map((c: any, i: number) => `categories/${c.name || 'category-' + (i + 1)}.json`);
        const extraHost = hostsArray.length > 20 ? [`hosts/+${hostsArray.length - 20}-more`] : [];
        const extraCat = categoriesArray.length > 20 ? [`categories/+${categoriesArray.length - 20}-more`] : [];
        const paths: string[] = [
          'data.json',
          ...hostPaths,
          ...extraHost,
          ...catPaths,
          ...extraCat,
          data.networkNodes ? 'network/nodes.json' : '',
          data.reports?.executive ? 'reports/executive.md' : '',
          data.reports?.technical ? 'reports/technical.md' : '',
          data.reports?.credentials ? 'reports/credentials.md' : '',
          data.reports?.vulnerabilities ? 'reports/vulnerabilities.md' : '',
          data.reports?.network ? 'reports/network.md' : '',
        ].filter(Boolean);
        setImportFileTreePaths(paths);
      } else if (data.hosts || data.categories) {
        // Format simple sans métadonnées
        const hostsArray = Array.isArray(data.hosts) ? data.hosts : 
                          data.hosts ? Object.values(data.hosts) : [];
        const categoriesArray = Array.isArray(data.categories) ? data.categories : 
                               data.categories ? Object.values(data.categories) : [];
        
        setImportPreview({
          metadata: {
            exportedAt: new Date().toISOString(),
            version: '2.0.0',
            totalHosts: hostsArray.length,
            totalCategories: categoriesArray.length,
            totalConnections: 0,
            totalCredentials: 0,
            totalVulnerabilities: 0
          },
          hosts: hostsArray,
          categories: categoriesArray,
          networkNodes: data.networkNodes || {},
          reports: {
            executive: '',
            technical: '',
            credentials: '',
            vulnerabilities: '',
            network: ''
          }
        });
        const hostPaths = hostsArray.slice(0, 20).map((h: any, i: number) => `hosts/${h.hostname || h.ip || 'host-' + (i + 1)}.json`);
        const catPaths = categoriesArray.slice(0, 20).map((c: any, i: number) => `categories/${c.name || 'category-' + (i + 1)}.json`);
        const extraHost = hostsArray.length > 20 ? [`hosts/+${hostsArray.length - 20}-more`] : [];
        const extraCat = categoriesArray.length > 20 ? [`categories/+${categoriesArray.length - 20}-more`] : [];
        const paths: string[] = ['data.json', ...hostPaths, ...extraHost, ...catPaths, ...extraCat];
        if (data.networkNodes) paths.push('network/nodes.json');
        setImportFileTreePaths(paths);
      } else {
        throw new Error('Format de fichier invalide - données manquantes');
      }
      
      console.log('Données importées avec succès:', data);
    } catch (error) {
      console.error('Erreur lors de l\'import:', error);
      const errorMessage = error instanceof Error ? error.message : 'Format invalide';
      alert(`Erreur lors de l'import: ${errorMessage}\n\nVérifiez que le fichier contient des données valides d'AuditMapper.`);
      setImportPreview(null);
      setImportFileTreePaths([]);
    } finally {
      setIsImporting(false);
    }
  };

  // Fonction de confirmation d'import
  const handleConfirmImport = () => {
    if (!importPreview) return;

    try {
      console.log('Début de l\'import avec les options:', importOptions);
      
      if (importMode === 'replace') {
        // Remplacer toutes les données
        console.log('Mode remplacement - suppression des données existantes');
        clearAllData();
      }

      let importedCount = 0;
      let categoryMappings: Record<string, string> = {}; // oldId -> newId

      // Importer les catégories EN PREMIER pour établir les mappings
      if (importOptions.categories && importPreview.categories) {
        console.log('Import des catégories:', importPreview.categories.length);
        
        // S'assurer que importPreview.categories est un tableau
        const categoriesToImport = Array.isArray(importPreview.categories) ? importPreview.categories : 
                                  importPreview.categories ? Object.values(importPreview.categories) : [];
        
        // Créer un mapping temporaire pour éviter les doublons
        const tempCategoryMappings: Record<string, string> = {};
        
        categoriesToImport.forEach((category: any) => {
          try {
            const oldId = category.id;
            
            // S'assurer que la catégorie a tous les champs requis
            const categoryToAdd = {
              name: category.name || 'Catégorie sans nom',
              description: category.description || '',
              color: category.color || '#3b82f6',
              icon: category.icon || 'Folder',
              ...category
            };
            
            // En mode fusion, vérifier si une catégorie avec le même nom existe déjà
            if (importMode === 'merge') {
              const existingCategory = categories.find(cat => cat.name === categoryToAdd.name);
              if (existingCategory) {
                console.log(`Catégorie "${categoryToAdd.name}" existe déjà, réutilisation de l'ID ${existingCategory.id}`);
                categoryMappings[oldId] = existingCategory.id;
                tempCategoryMappings[oldId] = existingCategory.id;
                return; // Skip creation, use existing
              }
            }
            
            // Vérifier si on a déjà traité cette catégorie dans cette session d'import
            if (tempCategoryMappings[oldId]) {
              categoryMappings[oldId] = tempCategoryMappings[oldId];
              return;
            }
            
            // Vérifier d'abord si la catégorie existe déjà
            const existingCategory = categories.find(cat => 
              cat.name === categoryToAdd.name && 
              cat.description === categoryToAdd.description &&
              cat.color === categoryToAdd.color
            );
            
            if (existingCategory && oldId) {
              // La catégorie existe déjà, utiliser son ID
              categoryMappings[oldId] = existingCategory.id;
              tempCategoryMappings[oldId] = existingCategory.id;
              console.log(`Catégorie existante trouvée: ${oldId} -> ${existingCategory.id} (${categoryToAdd.name})`);
            } else {
              // Créer la nouvelle catégorie
              addCategory({
                name: categoryToAdd.name,
                description: categoryToAdd.description,
                color: categoryToAdd.color,
                icon: categoryToAdd.icon
              });
              
              // Récupérer l'ID nouvellement créé
              // Note: Le store utilise des IDs générés automatiquement, donc on doit les récupérer après création
              const newCategories = useHostStore.getState().categories;
              const newCategory = newCategories.find(cat => 
                cat.name === categoryToAdd.name && 
                cat.description === categoryToAdd.description &&
                cat.color === categoryToAdd.color &&
                !Object.values(categoryMappings).includes(cat.id) &&
                !Object.values(tempCategoryMappings).includes(cat.id)
              );
              
              if (newCategory && oldId) {
                categoryMappings[oldId] = newCategory.id;
                tempCategoryMappings[oldId] = newCategory.id;
                console.log(`Mapping catégorie: ${oldId} -> ${newCategory.id} (${categoryToAdd.name})`);
              } else if (oldId) {
                console.warn(`Impossible de trouver la catégorie créée pour ${categoryToAdd.name} (ancien ID: ${oldId})`);
              }
            }
            
            importedCount++;
          } catch (error) {
            console.error('Erreur lors de l\'import de la catégorie:', category, error);
          }
        });
      }

      // Importer les hôtes APRÈS les catégories avec mapping des IDs
      if (importOptions.hosts && importPreview.hosts) {
        console.log('Import des hôtes:', importPreview.hosts.length);
        console.log('Mappings de catégories disponibles:', categoryMappings);
        console.log('Catégories actuelles dans le store:', useHostStore.getState().categories.map(c => ({ id: c.id, name: c.name })));
        
        // S'assurer que importPreview.hosts est un tableau
        const hostsToImport = Array.isArray(importPreview.hosts) ? importPreview.hosts : 
                             importPreview.hosts ? Object.values(importPreview.hosts) : [];
        
        // Récupérer le projet actuel pour l'assignation
        const currentProject = getCurrentProject();
        
        hostsToImport.forEach((host: any) => {
          try {
            // Mapper la catégorie de l'hôte avec les nouveaux IDs
            let mappedCategory = host.category;
            if (host.category && categoryMappings[host.category]) {
              mappedCategory = categoryMappings[host.category];
              console.log(`Host ${host.ip}: Mapping catégorie ${host.category} -> ${mappedCategory}`);
            } else if (host.category) {
              // Vérifier si la catégorie existe dans les catégories actuelles
              const currentCategories = useHostStore.getState().categories;
              const existingCategory = currentCategories.find(cat => cat.id === host.category);
              if (existingCategory) {
                mappedCategory = host.category;
                console.log(`Host ${host.ip}: Catégorie ${host.category} trouvée directement`);
              } else {
                // Essayer de trouver par nom de catégorie (fallback)
                const categoryByName = currentCategories.find(cat => 
                  cat.name.toLowerCase() === host.category.toLowerCase() ||
                  cat.name.toLowerCase().includes(host.category.toLowerCase()) ||
                  host.category.toLowerCase().includes(cat.name.toLowerCase())
                );
                if (categoryByName) {
                  mappedCategory = categoryByName.id;
                  console.log(`Host ${host.ip}: Catégorie trouvée par nom: ${host.category} -> ${categoryByName.name} (${categoryByName.id})`);
                } else {
                  console.warn(`Host ${host.ip}: Catégorie ${host.category} introuvable, assignation à la première catégorie disponible`);
                  mappedCategory = currentCategories.length > 0 ? currentCategories[0].id : '';
                }
              }
            } else {
              // Pas de catégorie définie, assigner à la première disponible
              const currentCategories = useHostStore.getState().categories;
              mappedCategory = currentCategories.length > 0 ? currentCategories[0].id : '';
              console.log(`Host ${host.ip}: Pas de catégorie définie, assignation à la première disponible: ${mappedCategory}`);
            }
            
            // Gérer l'assignation du projet
            let projectId = host.projectId;
            if (!projectId && currentProject) {
              // Si pas de projectId dans les données importées, assigner au projet actuel
              projectId = currentProject.id;
              console.log(`Host ${host.ip}: Assignation au projet actuel ${currentProject.name}`);
            }
            
            // S'assurer que l'hôte a un ID unique et tous les champs requis
            // IMPORTANT: propager d'abord l'hôte original, puis surcharger avec les valeurs mappées
            const hostToAdd = {
              // Préserver tous les autres champs de l'hôte original
              ...host,
              // Champs normalisés et valeurs par défaut
              ip: host.ip || '0.0.0.0',
              hostname: host.hostname || '',
              os: host.os || 'Unknown',
              status: host.status || 'active',
              priority: host.priority || 'medium',
              compromiseLevel: host.compromiseLevel || 'none',
              // Appliquer la catégorie mappée APRÈS la propagation
              category: mappedCategory,
              // Gérer le projet (priorité au projet déterminé ci-dessus)
              projectId: projectId,
              // Collections par défaut
              usernames: host.usernames || [],
              passwords: host.passwords || [],
              hashes: host.hashes || [],
              exploitationSteps: host.exploitationSteps || [],
              screenshots: host.screenshots || [],
              vulnerabilities: host.vulnerabilities || [],
              tags: host.tags || [],
              services: host.services || [],
              ports: host.ports || [],
              outgoingConnections: host.outgoingConnections || [],
              incomingConnections: host.incomingConnections || [],
              notes: host.notes || '',
              credentials: host.credentials || [],
              // S'assurer que l'ID est unique (sera ignoré par addHost de toute façon)
              id: host.id || Date.now().toString() + Math.random().toString(36).substr(2, 9),
              // Mettre à jour les timestamps
              createdAt: host.createdAt || new Date().toISOString(),
              updatedAt: new Date().toISOString()
            };
            
            console.log(`Import host ${host.ip}: catégorie=${mappedCategory}, projet=${projectId}`);
            addHost(hostToAdd);
            importedCount++;
          } catch (error) {
            console.error('Erreur lors de l\'import de l\'hôte:', host, error);
          }
        });
      }

      // Importer les positions des nœuds réseau
      if (importOptions.networkNodes && importPreview.networkNodes) {
        console.log('Import des positions réseau:', Object.keys(importPreview.networkNodes).length);
        Object.entries(importPreview.networkNodes).forEach(([hostId, nodeData]: [string, any]) => {
          try {
            updateNetworkNode(hostId, nodeData);
          } catch (error) {
            console.error('Erreur lors de l\'import de la position réseau:', hostId, error);
          }
        });
      }

      console.log('Import terminé avec succès. Éléments importés:', importedCount);
      
      // Afficher le modal de succès
      setSuccessDetails({
        importedCount,
        mode: importMode,
        options: importOptions
      });
      setShowSuccessModal(true);
      
      setImportPreview(null);
      setImportDataState('');
      setSelectedFile(null);
    } catch (error) {
      console.error('Erreur lors de l\'import:', error);
      alert(`❌ Erreur lors de l'import: ${error instanceof Error ? error.message : 'Erreur inconnue'}\n\nLes données partiellement importées peuvent être présentes.`);
    }
  };

  const handleClearAllData = () => {
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = async () => {
    setIsDeleting(true);
    try {
      clearAllData();
      setShowDeleteModal(false);
      onClose();
    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-slate-900/80 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="w-full max-w-4xl max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <Card className="h-full border-slate-700 bg-slate-800">
          <CardHeader className="border-b border-slate-700">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-slate-100">Import/Export Avancé</CardTitle>
                <p className="text-sm text-slate-400 mt-1">
                  Exportez vos données avec des rapports structurés ou importez un audit complet
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

          <CardContent className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Export Section */}
              <Card className="border-slate-700 bg-slate-700">
                <CardHeader>
                  <CardTitle className="text-slate-200 flex items-center gap-2">
                    <Download className="w-5 h-5" />
                    Export Complet
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-400">Portée d'export</label>
                    <div className="space-y-2">
                      <label className="flex items-center gap-2 text-sm text-slate-300">
                        <input
                          type="radio"
                          name="exportScope"
                          value="current"
                          checked={exportScope === 'current'}
                          onChange={(e) => setExportScope(e.target.value as 'all' | 'current' | 'selected')}
                          className="text-blue-500"
                        />
                        <Folder className="w-4 h-4" />
                        Projet actuel uniquement
                      </label>
                      <label className="flex items-center gap-2 text-sm text-slate-300">
                        <input
                          type="radio"
                          name="exportScope"
                          value="selected"
                          checked={exportScope === 'selected'}
                          onChange={(e) => setExportScope(e.target.value as 'all' | 'current' | 'selected')}
                          className="text-blue-500"
                        />
                        <FolderOpen className="w-4 h-4" />
                        Projets sélectionnés
                      </label>
                      <label className="flex items-center gap-2 text-sm text-slate-300">
                        <input
                          type="radio"
                          name="exportScope"
                          value="all"
                          checked={exportScope === 'all'}
                          onChange={(e) => setExportScope(e.target.value as 'all' | 'current' | 'selected')}
                          className="text-blue-500"
                        />
                        <Server className="w-4 h-4" />
                        Tous les projets
                      </label>
                    </div>
                  </div>

                  {exportScope === 'selected' && (
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-400">Sélectionner les projets</label>
                      <div className="max-h-32 overflow-y-auto space-y-1">
                        {allProjects.map((project) => (
                          <label key={project.id} className="flex items-center gap-2 text-sm text-slate-300">
                            <input
                              type="checkbox"
                              checked={selectedProjects.includes(project.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedProjects([...selectedProjects, project.id]);
                                } else {
                                  setSelectedProjects(selectedProjects.filter(id => id !== project.id));
                                }
                              }}
                              className="text-blue-500"
                            />
                            <div 
                              className="w-3 h-3 rounded-full" 
                              style={{ backgroundColor: project.color }}
                            />
                            <span>{project.name}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-400">Type d'export</label>
                    <div className="space-y-2">
                      <label className="flex items-center gap-2 text-sm text-slate-300">
                        <input
                          type="radio"
                          name="exportType"
                          value="json"
                          checked={exportType === 'json'}
                          onChange={(e) => setExportType(e.target.value as 'json' | 'zip' | 'report')}
                          className="text-blue-500"
                        />
                        <FileText className="w-4 h-4" />
                        JSON (données brutes)
                      </label>
                      <label className="flex items-center gap-2 text-sm text-slate-300">
                        <input
                          type="radio"
                          name="exportType"
                          value="zip"
                          checked={exportType === 'zip'}
                          onChange={(e) => setExportType(e.target.value as 'json' | 'zip' | 'report')}
                          className="text-blue-500"
                        />
                        <FileArchive className="w-4 h-4" />
                        ZIP (données + rapports)
                      </label>
                      <label className="flex items-center gap-2 text-sm text-slate-300">
                        <input
                          type="radio"
                          name="exportType"
                          value="report"
                          checked={exportType === 'report'}
                          onChange={(e) => setExportType(e.target.value as 'json' | 'zip' | 'report')}
                          className="text-blue-500"
                        />
                        <Report className="w-4 h-4" />
                        Rapport Markdown
                      </label>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs text-slate-400">
                     <div className="flex items-center gap-1">
                       <Server className="w-3 h-3" />
                       {hostsArray.length} hôtes
                     </div>
                     <div className="flex items-center gap-1">
                       <Folder className="w-3 h-3" />
                       {categories.length} catégories
                     </div>
                     <div className="flex items-center gap-1">
                       <Network className="w-3 h-3" />
                       {exportStats.totalConnections} connexions
                     </div>
                     <div className="flex items-center gap-1">
                       <Key className="w-3 h-3" />
                       {exportStats.totalCredentials} identifiants
                     </div>
                   </div>

                  {/* Aperçu arborescent du contenu exporté */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium text-slate-400">Aperçu du contenu {exportType.toUpperCase()}</label>
                      <Button variant="outline" onClick={previewExport} className="bg-slate-600 border-slate-500 text-slate-200 hover:bg-slate-500">Générer l'aperçu</Button>
                    </div>
                    {exportPreviewPaths.length > 0 && (
                      <div className="p-3 bg-slate-800 rounded border border-slate-600 max-h-56 overflow-auto">
                        {renderTree(buildTree(exportPreviewPaths))}
                      </div>
                    )}
                  </div>

                  <Button
                    variant="default"
                    onClick={handleExportComplete}
                    disabled={isExporting}
                    className="w-full bg-blue-600 hover:bg-blue-700"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    {isExporting ? 'Export en cours...' : 'Exporter complet'}
                  </Button>

                  {exportDataState && (
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-400">Données exportées</label>
                      <Textarea
                        value={exportDataState}
                        readOnly
                        className="min-h-[100px] bg-slate-800 border-slate-600 text-slate-100 font-mono text-xs"
                      />
                      <Button
                        variant="outline"
                        onClick={() => navigator.clipboard.writeText(exportDataState)}
                        className="w-full bg-slate-600 border-slate-500 text-slate-200 hover:bg-slate-500"
                      >
                        <Copy className="w-4 h-4 mr-2" />
                        Copier
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Import Section */}
              <Card className="border-slate-700 bg-slate-700">
                <CardHeader>
                  <CardTitle className="text-slate-200 flex items-center gap-2">
                    <Upload className="w-5 h-5" />
                    Import
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-slate-300">
                    Importez un fichier JSON ou ZIP d'AuditMapper pour restaurer un audit complet.
                  </p>
                  
                  <div className="space-y-2">
                    <Button
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full bg-slate-600 border-slate-500 text-slate-200 hover:bg-slate-500"
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      Sélectionner un fichier
                    </Button>
                    
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".json,.zip"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                    <p className="text-xs text-slate-400 mt-1">
                      Formats supportés : JSON, ZIP (avec data.json)
                    </p>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-400">Ou collez vos données JSON</label>
                    <Textarea
                      value={importDataState}
                      onChange={(e) => setImportDataState(e.target.value)}
                      placeholder="Collez vos données JSON ici..."
                      className="min-h-[100px] bg-slate-800 border-slate-600 text-slate-100"
                    />
                  </div>

                  <div className="space-y-2">
                    <Button
                      variant="default"
                      onClick={handleImport}
                      disabled={(!selectedFile && !importDataState.trim()) || isImporting}
                      className="w-full bg-green-600 hover:bg-green-700"
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      {isImporting ? 'Import en cours...' : 'Analyser l\'import'}
                    </Button>
                    
                    {selectedFile && (
                      <div className="text-xs text-slate-400 p-2 bg-slate-800 rounded">
                        <div>Fichier sélectionné : {selectedFile.name}</div>
                        <div>Taille : {(selectedFile.size / 1024).toFixed(1)} KB</div>
                        <div>Type : {selectedFile.type || 'Non spécifié'}</div>
                      </div>
                    )}
                    
                    <Button
                      variant="outline"
                      onClick={() => setImportDataState('')}
                      className="w-full bg-slate-600 border-slate-500 text-slate-200 hover:bg-slate-500"
                    >
                      <X className="w-4 h-4 mr-2" />
                      Effacer
                    </Button>
                  </div>

                  {(importPreview || importFileTreePaths.length > 0) && (
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-400">Aperçu de l'import</label>
                      {importFileTreePaths.length > 0 && (
                        <div className="p-3 bg-slate-800 rounded border border-slate-600 max-h-56 overflow-auto">
                          {renderTree(buildTree(importFileTreePaths))}
                        </div>
                      )}
                      <div className="p-3 bg-slate-800 rounded border border-slate-600">
                        <div className="text-xs text-slate-300 space-y-1">
                          <div className="flex items-center gap-1">
                            <Server className="w-3 h-3" />
                            Hôtes: {importPreview?.hosts?.length || 0}
                          </div>
                          <div className="flex items-center gap-1">
                            <Folder className="w-3 h-3" />
                            Catégories: {importPreview?.categories?.length || 0}
                          </div>
                          {importPreview?.metadata && (
                            <>
                              <div className="flex items-center gap-1">
                                <Network className="w-3 h-3" />
                                Connexions: {importPreview?.metadata.totalConnections || 0}
                              </div>
                              <div className="flex items-center gap-1">
                                <Key className="w-3 h-3" />
                                Identifiants: {importPreview?.metadata.totalCredentials || 0}
                              </div>
                              <div className="flex items-center gap-1">
                                <AlertTriangle className="w-3 h-3" />
                                Vulnérabilités: {importPreview?.metadata.totalVulnerabilities || 0}
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Options d'import */}
            {importPreview && (
              <Card className="mt-6 border-slate-700 bg-slate-700">
                <CardHeader>
                  <CardTitle className="text-slate-200">Options d'import</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-400">Mode d'import</label>
                    <div className="space-y-2">
                      <label className="flex items-center gap-2 text-sm text-slate-300">
                        <input
                          type="radio"
                          name="importMode"
                          value="merge"
                          checked={importMode === 'merge'}
                          onChange={(e) => setImportMode(e.target.value as 'merge' | 'replace')}
                          className="text-blue-500"
                        />
                        <Info className="w-4 h-4" />
                        Fusionner (ajouter aux données existantes)
                      </label>
                      <label className="flex items-center gap-2 text-sm text-slate-300">
                        <input
                          type="radio"
                          name="importMode"
                          value="replace"
                          checked={importMode === 'replace'}
                          onChange={(e) => setImportMode(e.target.value as 'merge' | 'replace')}
                          className="text-blue-500"
                        />
                        <Trash2 className="w-4 h-4" />
                        Remplacer (écraser les données existantes)
                      </label>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-400">Éléments à importer</label>
                    <div className="space-y-2">
                      <label className="flex items-center gap-2 text-sm text-slate-300">
                        <input
                          type="checkbox"
                          checked={importOptions.hosts}
                          onChange={(e) => setImportOptions({ ...importOptions, hosts: e.target.checked })}
                          className="text-blue-500"
                        />
                        <Server className="w-4 h-4" />
                        Hôtes ({importPreview.hosts?.length || 0})
                      </label>
                      <label className="flex items-center gap-2 text-sm text-slate-300">
                        <input
                          type="checkbox"
                          checked={importOptions.categories}
                          onChange={(e) => setImportOptions({ ...importOptions, categories: e.target.checked })}
                          className="text-blue-500"
                        />
                        <Folder className="w-4 h-4" />
                        Catégories ({importPreview.categories?.length || 0})
                      </label>
                      <label className="flex items-center gap-2 text-sm text-slate-300">
                        <input
                          type="checkbox"
                          checked={importOptions.networkNodes}
                          onChange={(e) => setImportOptions({ ...importOptions, networkNodes: e.target.checked })}
                          className="text-blue-500"
                        />
                        <Network className="w-4 h-4" />
                        Positions réseau ({Object.keys(importPreview.networkNodes || {}).length})
                      </label>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="default"
                      onClick={handleConfirmImport}
                      disabled={!importOptions.hosts && !importOptions.categories && !importOptions.networkNodes}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <Check className="w-4 h-4 mr-2" />
                      Confirmer l'import
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setImportPreview(null);
                        setImportDataState('');
                      }}
                      className="bg-slate-600 border-slate-500 text-slate-200 hover:bg-slate-500"
                    >
                      Annuler
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Danger Zone */}
            <Card className="mt-6 border-red-700 bg-slate-700">
              <CardHeader>
                <CardTitle className="text-red-400 flex items-center gap-2">
                  <Trash2 className="w-5 h-5" />
                  Zone de danger
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-slate-300 mb-4">
                  Actions irréversibles - utilisez avec précaution
                </p>
                <Button
                  variant="destructive"
                  onClick={handleClearAllData}
                  className="bg-red-600 hover:bg-red-700"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Supprimer toutes les données
                </Button>
              </CardContent>
            </Card>
          </CardContent>
        </Card>
      </motion.div>
      
      {/* Modal de succès pour l'import */}
      <SuccessModal
        open={showSuccessModal}
        onClose={() => {
          setShowSuccessModal(false);
          setSuccessDetails(null);
          onClose();
        }}
        title="Import réussi !"
        message="Vos données ont été importées avec succès dans le projet."
        details={successDetails}
      />
      
      {/* Modal de confirmation pour la suppression */}
      <ConfirmDeleteModal
        open={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleConfirmDelete}
        title="Confirmer la suppression"
        message="Êtes-vous sûr de vouloir supprimer toutes les données ? Cette action est irréversible et supprimera définitivement tous les hôtes, catégories et nœuds réseau."
        details={{
          hostsCount: hostsArray.length,
          categoriesCount: Object.keys(categories).length,
          networkNodesCount: Object.keys(networkNodes).length
        }}
        isLoading={isDeleting}
      />
    </div>
  );
};
