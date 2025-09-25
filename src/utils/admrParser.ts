export interface ADMRAttack {
  id: string;
  title: string;
  description: string;
  command: string;
  theory: string[];
  tools: string[];
  section: string;
  severity: 'Low' | 'Medium' | 'High' | 'Critical';
  cve?: string;
}

export interface ADMRSection {
  name: string;
  color: string;
  attacks: ADMRAttack[];
}

export interface ADMRCanvasData {
  nodes: Array<{
    id: string;
    type: 'text' | 'group' | 'file';
    text?: string;
    label?: string;
    color?: string;
    file?: string;
  }>;
  edges: Array<{
    id: string;
    fromNode: string;
    toNode: string;
  }>;
}

/**
 * Parse un fichier canvas ADMR pour extraire les sections et attaques
 */
export function parseADMRCanvas(canvasData: ADMRCanvasData): ADMRSection[] {
  const sections: ADMRSection[] = [];
  
  // Trouver le groupe principal (le plus grand groupe ou celui avec le plus de nœuds)
  const groups = canvasData.nodes.filter(node => node.type === 'group' && node.label);
  
  if (groups.length === 0) {
    return [];
  }
  
  // Prendre le groupe principal (généralement le premier ou le plus grand)
  const mainGroup = groups[0];
  
  return parseSectionFromGroup(mainGroup, canvasData);
}

/**
 * Parse une section spécifique à partir d'un groupe
 */
function parseSectionFromGroup(group: any, canvasData: ADMRCanvasData): ADMRSection[] {
  const sectionName = group.label!;
  const sectionColor = group.color || '#60a5fa';
  
  // Trouver tous les nœuds de texte qui sont des attaques
  const textNodes = canvasData.nodes.filter(node => 
    node.type === 'text' && 
    node.text && 
    isAttackNode(node.text) &&
    isNodeInSection(node, group, canvasData)
  );
  
  const attacks: ADMRAttack[] = [];
  
  for (const textNode of textNodes) {
    const attack = parseAttackFromText(textNode.text!, sectionName);
    if (attack) {
      attacks.push(attack);
    }
  }
  
  if (attacks.length > 0) {
    return [{
      name: sectionName,
      color: sectionColor,
      attacks
    }];
  }
  
  return [];
}

/**
 * Vérifie si un nœud de texte est une attaque (contient des commandes)
 */
function isAttackNode(text: string): boolean {
  // Un nœud est une attaque s'il contient des commandes (```bash, ```shell, etc.)
  const hasCommands = /```(?:bash|shell|cmd|powershell)?\n[\s\S]*?```/.test(text);
  
  // Ou s'il contient des liens de théorie ou d'outils
  const hasTheory = /\[!info\]\s*Theory/.test(text);
  const hasTools = /\[!example\]\s*Tools/.test(text);
  
  // Exclure les nœuds qui sont juste des titres ou des labels
  const isJustTitle = /^#[^#\n]*$/.test(text.trim());
  const isLabel = /^(USER FOUND|CREDENTIALS FOUND|TICKET FOUND|ADCS|ACL|DELEGATION|SCCM|MITM|NEED CREDENTIALS|SMB NTLM)$/.test(text.trim());
  
  return (hasCommands || hasTheory || hasTools) && !isJustTitle && !isLabel;
}

/**
 * Vérifie si un nœud de texte appartient à une section (groupe)
 */
function isNodeInSection(
  textNode: any, 
  group: any, 
  canvasData: ADMRCanvasData
): boolean {
  // Vérifier si le nœud est connecté au groupe
  const isConnected = canvasData.edges.some(edge => 
    (edge.fromNode === group.id && edge.toNode === textNode.id) ||
    (edge.fromNode === textNode.id && edge.toNode === group.id)
  );
  
  // Vérifier si le nœud est spatialement dans le groupe
  const isInBounds = textNode.x >= group.x && 
                    textNode.x <= group.x + (group.width || 0) &&
                    textNode.y >= group.y && 
                    textNode.y <= group.y + (group.height || 0);
  
  return isConnected || isInBounds;
}

/**
 * Parse le texte d'un nœud pour extraire les informations d'attaque
 */
function parseAttackFromText(text: string, sectionName: string): ADMRAttack | null {
  // Extraire le titre principal (première ligne avec #)
  const titleMatch = text.match(/^#\s*(.+)$/m);
  if (!titleMatch) return null;
  
  let title = titleMatch[1].trim();
  
  // Nettoyer le titre des emojis et caractères spéciaux
  title = title.replace(/^[🔥💥🚨🛠️⚡🎯🔍📊📈📉💰💎🌟⭐✨🎪🎭🎨🎬🎮🎯🎲🎳🎴🎵🎶🎸🎹🎺🎻🎼🎽🎾🎿🏀🏁🏂🏃🏄🏅🏆🏇🏈🏉🏊🏋🏌🏍🏎🏏🏐🏑🏒🏓🏔🏕🏖🏗🏘🏙🏚🏛🏜🏝🏞🏟🏠🏡🏢🏣🏤🏥🏦🏧🏨🏩🏪🏫🏬🏭🏮🏯🏰🏱🏲🏳🏴🏵🏶🏷🏸🏹🏺🏻🏼🏽🏾🏿]/g, '').trim();
  
  // Ignorer les nœuds qui ne sont pas des attaques
  if (title.includes('TEMPLATE') || title.includes('ATTACKS TYPE') || 
      title.includes('COLOR SCHEME') || title.includes('ATTACKS TEMPLATE') ||
      title === 'GOT CREDENTIALS' || title === 'USER FOUND' || 
      title === 'CREDENTIALS FOUND' || title === 'TICKET FOUND' ||
      title === 'ADCS' || title === 'ACL' || title === 'DELEGATION' ||
      title === 'SCCM' || title === 'MITM' || title === 'NEED CREDENTIALS' ||
      title === 'SMB NTLM' || title === 'Exploit known vulnerabilities') {
    return null;
  }
  
  // Extraire la description (## sections)
  const descriptionMatch = text.match(/^##\s*(.+)$/m);
  const description = descriptionMatch ? descriptionMatch[1].trim() : '';
  
  // Extraire les commandes (blocs de code) - prendre le premier bloc
  const commandMatch = text.match(/```(?:bash|shell|cmd|powershell)?\n([\s\S]*?)```/);
  const command = commandMatch ? commandMatch[1].trim() : '';
  
  // Extraire les liens de théorie
  const theoryMatches = text.match(/\[!info\]\s*Theory[\s\S]*?-\s*(.+)/g);
  const theory = theoryMatches ? theoryMatches.map(match => 
    match.replace(/\[!info\]\s*Theory[\s\S]*?-\s*/, '').trim()
  ) : [];
  
  // Extraire les liens d'outils
  const toolsMatches = text.match(/\[!example\]\s*Tools[\s\S]*?-\s*(.+)/g);
  const tools = toolsMatches ? toolsMatches.map(match => 
    match.replace(/\[!example\]\s*Tools[\s\S]*?-\s*/, '').trim()
  ) : [];
  
  // Extraire CVE si présent
  const cveMatch = text.match(/CVE-(\d{4}-\d{4,7})/);
  const cve = cveMatch ? `CVE-${cveMatch[1]}` : undefined;
  
  // Déterminer la sévérité basée sur les indicateurs
  let severity: 'Low' | 'Medium' | 'High' | 'Critical' = 'Medium';
  if (text.includes('🔥')) severity = 'High';
  if (text.includes('💥')) severity = 'Critical';
  if (text.includes('🚨')) severity = 'Critical';
  if (text.includes('🛠️')) severity = 'Low';
  
  // Générer un ID unique
  const id = `${sectionName.toLowerCase().replace(/\s+/g, '-')}-${title.toLowerCase().replace(/\s+/g, '-')}`;
  
  return {
    id,
    title,
    description,
    command,
    theory,
    tools,
    section: sectionName,
    severity,
    cve
  };
}

/**
 * Charge et parse un fichier canvas ADMR
 */
export async function loadADMRSection(sectionPath: string): Promise<ADMRSection[]> {
  try {
    const response = await fetch(sectionPath);
    if (!response.ok) {
      throw new Error(`Erreur de chargement: ${response.status}`);
    }
    const canvasData: ADMRCanvasData = await response.json();
    return parseADMRCanvas(canvasData);
  } catch (error) {
    console.error('Erreur lors du chargement de la section ADMR:', error);
    return [];
  }
}

/**
 * Charge toutes les sections ADMR disponibles
 */
export async function loadAllADMRSections(): Promise<ADMRSection[]> {
  const sections = [
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
  
  const allSections: ADMRSection[] = [];
  
  for (const section of sections) {
    const sectionPath = `/ADMR/ATTACKS/${section}.canvas`;
    const sectionData = await loadADMRSection(sectionPath);
    allSections.push(...sectionData);
  }
  
  return allSections;
}
