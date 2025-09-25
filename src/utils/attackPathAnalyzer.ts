// ==========================================
// ANALYSEUR DE CHEMINS D'ATTAQUE
// ==========================================

import { Host, NetworkConnection } from '@/types';

export interface AttackPath {
  id: string;
  startHosts: string[];
  endHosts: string[];
  path: string[];
  connections: NetworkConnection[];
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  steps: AttackStep[];
}

export interface AttackStep {
  fromHost: string;
  toHost: string;
  connection: NetworkConnection;
  method: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface AttackPathAnalysis {
  allPaths: AttackPath[];
  criticalPaths: AttackPath[];
  entryPoints: string[];
  targets: string[];
  isolatedHosts: string[];
  networkSegments: NetworkSegment[];
}

export interface NetworkSegment {
  id: string;
  hosts: string[];
  connections: NetworkConnection[];
  isolationLevel: 'isolated' | 'semi-isolated' | 'connected';
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
}

export class AttackPathAnalyzer {
  private hosts: Record<string, Host>;
  private connections: NetworkConnection[];

  constructor(hosts: Record<string, Host>) {
    this.hosts = hosts;
    this.connections = this.extractAllConnections();
  }

  private extractAllConnections(): NetworkConnection[] {
    const allConnections: NetworkConnection[] = [];
    
    Object.values(this.hosts).forEach(host => {
      // Connexions sortantes
      if (host.outgoingConnections) {
        host.outgoingConnections.forEach(conn => {
          allConnections.push({
            ...conn,
            fromHostId: host.id,
            type: 'outgoing'
          });
        });
      }
      
      // Connexions entrantes
      if (host.incomingConnections) {
        host.incomingConnections.forEach(conn => {
          allConnections.push({
            ...conn,
            toHostId: host.id,
            type: 'incoming'
          });
        });
      }
    });
    
    return allConnections;
  }

  /**
   * Trouve tous les chemins d'attaque possibles dans le réseau
   */
  public analyzeAttackPaths(): AttackPathAnalysis {
    const entryPoints = this.findEntryPoints();
    const targets = this.findTargets();
    const allPaths = this.findAllPaths(entryPoints, targets);
    const criticalPaths = this.identifyCriticalPaths(allPaths);
    const isolatedHosts = this.findIsolatedHosts();
    const networkSegments = this.identifyNetworkSegments();

    return {
      allPaths,
      criticalPaths,
      entryPoints,
      targets,
      isolatedHosts,
      networkSegments
    };
  }

  /**
   * Identifie les points d'entrée potentiels (hôtes avec accès externe ou compromis)
   */
  private findEntryPoints(): string[] {
    const entryPoints: string[] = [];
    
    Object.values(this.hosts).forEach(host => {
      // Hôtes déjà compromis
      if (host.status === 'compromised' || host.compromiseLevel !== 'no_foothold') {
        entryPoints.push(host.id);
        return;
      }
      
      // Hôtes avec des vulnérabilités critiques
      const hasCriticalVulns = host.vulnerabilities.some(v => v.severity === 'Critical');
      if (hasCriticalVulns) {
        entryPoints.push(host.id);
        return;
      }
      
      // Hôtes avec des services exposés (ports ouverts)
      const hasExposedServices = host.services.some(s => s.status === 'open' && s.port < 1024);
      if (hasExposedServices) {
        entryPoints.push(host.id);
      }
    });
    
    return [...new Set(entryPoints)];
  }

  /**
   * Identifie les cibles potentielles (hôtes sensibles ou critiques)
   */
  private findTargets(): string[] {
    const targets: string[] = [];
    
    Object.values(this.hosts).forEach(host => {
      // Hôtes avec priorité critique ou haute
      if (host.priority === 'critical' || host.priority === 'high') {
        targets.push(host.id);
        return;
      }
      
      // Hôtes avec des données sensibles (mots de passe, hashes)
      const hasSensitiveData = host.credentials.length > 0 || 
                              host.usernames.length > 0 || 
                              host.passwords.length > 0 || 
                              host.hashes.length > 0;
      if (hasSensitiveData) {
        targets.push(host.id);
        return;
      }
      
      // Hôtes avec des services critiques (AD, DNS, etc.)
      const hasCriticalServices = host.services.some(s => 
        s.name.toLowerCase().includes('domain') ||
        s.name.toLowerCase().includes('dns') ||
        s.name.toLowerCase().includes('ldap') ||
        s.name.toLowerCase().includes('kerberos')
      );
      if (hasCriticalServices) {
        targets.push(host.id);
      }
    });
    
    return [...new Set(targets)];
  }

  /**
   * Trouve tous les chemins possibles entre les points d'entrée et les cibles
   */
  private findAllPaths(entryPoints: string[], targets: string[]): AttackPath[] {
    const paths: AttackPath[] = [];
    
    entryPoints.forEach(startHost => {
      targets.forEach(endHost => {
        if (startHost === endHost) return; // Pas de chemin vers soi-même
        
        const path = this.findPath(startHost, endHost);
        if (path.length > 0) {
          const attackPath = this.buildAttackPath([startHost], [endHost], path);
          paths.push(attackPath);
        }
      });
    });
    
    // Grouper les chemins similaires
    return this.groupSimilarPaths(paths);
  }

  /**
   * Utilise BFS pour trouver le chemin le plus court entre deux hôtes
   */
  private findPath(startHost: string, endHost: string): string[] {
    const visited = new Set<string>();
    const queue: { host: string; path: string[] }[] = [{ host: startHost, path: [startHost] }];
    
    while (queue.length > 0) {
      const { host, path } = queue.shift()!;
      
      if (host === endHost) {
        return path;
      }
      
      if (visited.has(host)) continue;
      visited.add(host);
      
      // Trouver les connexions sortantes
      const outgoingConnections = this.connections.filter(c => 
        c.fromHostId === host && c.type === 'outgoing'
      );
      
      outgoingConnections.forEach(conn => {
        if (!visited.has(conn.toHostId)) {
          queue.push({ host: conn.toHostId, path: [...path, conn.toHostId] });
        }
      });
    }
    
    return []; // Aucun chemin trouvé
  }

  /**
   * Construit un objet AttackPath à partir d'un chemin
   */
  private buildAttackPath(startHosts: string[], endHosts: string[], path: string[]): AttackPath {
    const pathConnections: NetworkConnection[] = [];
    const steps: AttackStep[] = [];
    
    for (let i = 0; i < path.length - 1; i++) {
      const fromHost = path[i];
      const toHost = path[i + 1];
      
      const connection = this.connections.find(c => 
        c.fromHostId === fromHost && c.toHostId === toHost
      );
      
      if (connection) {
        pathConnections.push(connection);
        steps.push({
          fromHost,
          toHost,
          connection,
          method: connection.method || 'unknown',
          description: connection.cause || `Connexion de ${fromHost} vers ${toHost}`,
          severity: this.calculateStepSeverity(connection, fromHost, toHost)
        });
      }
    }
    
    const severity = this.calculatePathSeverity(steps);
    const description = this.generatePathDescription(startHosts, endHosts, steps);
    
    return {
      id: `path_${startHosts.join('_')}_to_${endHosts.join('_')}_${Date.now()}`,
      startHosts,
      endHosts,
      path,
      connections: pathConnections,
      severity,
      description,
      steps
    };
  }

  /**
   * Calcule la sévérité d'une étape d'attaque
   */
  private calculateStepSeverity(connection: NetworkConnection, fromHost: string, toHost: string): 'low' | 'medium' | 'high' | 'critical' {
    const fromHostData = this.hosts[fromHost];
    const toHostData = this.hosts[toHost];
    
    // Si la cible est critique, l'étape est critique
    if (toHostData.priority === 'critical') return 'critical';
    
    // Si la méthode d'attaque est avancée
    if (connection.method === 'lateral' || connection.method === 'pivot') return 'high';
    
    // Si la source est compromise
    if (fromHostData.status === 'compromised') return 'high';
    
    // Si la cible a des vulnérabilités critiques
    const hasCriticalVulns = toHostData.vulnerabilities.some(v => v.severity === 'Critical');
    if (hasCriticalVulns) return 'high';
    
    return 'medium';
  }

  /**
   * Calcule la sévérité globale d'un chemin d'attaque
   */
  private calculatePathSeverity(steps: AttackStep[]): 'low' | 'medium' | 'high' | 'critical' {
    if (steps.some(s => s.severity === 'critical')) return 'critical';
    if (steps.some(s => s.severity === 'high')) return 'high';
    if (steps.some(s => s.severity === 'medium')) return 'medium';
    return 'low';
  }

  /**
   * Génère une description du chemin d'attaque
   */
  private generatePathDescription(startHosts: string[], endHosts: string[], steps: AttackStep[]): string {
    const startNames = startHosts.map(id => this.hosts[id]?.hostname || this.hosts[id]?.ip || id);
    const endNames = endHosts.map(id => this.hosts[id]?.hostname || this.hosts[id]?.ip || id);
    
    if (steps.length === 0) {
      return `Chemin direct de ${startNames.join(', ')} vers ${endNames.join(', ')}`;
    }
    
    const stepDescriptions = steps.map(step => {
      const fromName = this.hosts[step.fromHost]?.hostname || this.hosts[step.fromHost]?.ip || step.fromHost;
      const toName = this.hosts[step.toHost]?.hostname || this.hosts[step.toHost]?.ip || step.toHost;
      return `${fromName} → ${toName} (${step.method})`;
    });
    
    return `Chemin d'attaque: ${startNames.join(', ')} → ${stepDescriptions.join(' → ')} → ${endNames.join(', ')}`;
  }

  /**
   * Identifie les chemins critiques (les plus dangereux)
   */
  private identifyCriticalPaths(paths: AttackPath[]): AttackPath[] {
    return paths.filter(path => 
      path.severity === 'critical' || 
      path.severity === 'high' ||
      path.steps.some(step => step.severity === 'critical')
    );
  }

  /**
   * Trouve les hôtes isolés (sans connexions)
   */
  private findIsolatedHosts(): string[] {
    const connectedHosts = new Set<string>();
    
    this.connections.forEach(conn => {
      connectedHosts.add(conn.fromHostId);
      connectedHosts.add(conn.toHostId);
    });
    
    return Object.keys(this.hosts).filter(hostId => !connectedHosts.has(hostId));
  }

  /**
   * Identifie les segments réseau
   */
  private identifyNetworkSegments(): NetworkSegment[] {
    const visited = new Set<string>();
    const segments: NetworkSegment[] = [];
    
    Object.keys(this.hosts).forEach(hostId => {
      if (visited.has(hostId)) return;
      
      const segment = this.buildNetworkSegment(hostId, visited);
      segments.push(segment);
    });
    
    return segments;
  }

  /**
   * Construit un segment réseau à partir d'un hôte de départ
   */
  private buildNetworkSegment(startHost: string, visited: Set<string>): NetworkSegment {
    const segmentHosts = new Set<string>();
    const segmentConnections: NetworkConnection[] = [];
    const queue = [startHost];
    
    while (queue.length > 0) {
      const hostId = queue.shift()!;
      if (visited.has(hostId)) continue;
      
      visited.add(hostId);
      segmentHosts.add(hostId);
      
      // Trouver toutes les connexions de cet hôte
      const hostConnections = this.connections.filter(c => 
        c.fromHostId === hostId || c.toHostId === hostId
      );
      
      hostConnections.forEach(conn => {
        segmentConnections.push(conn);
        if (!visited.has(conn.fromHostId)) queue.push(conn.fromHostId);
        if (!visited.has(conn.toHostId)) queue.push(conn.toHostId);
      });
    }
    
    const hosts = Array.from(segmentHosts);
    const isolationLevel = this.calculateIsolationLevel(hosts, segmentConnections);
    const riskLevel = this.calculateSegmentRiskLevel(hosts);
    
    return {
      id: `segment_${hosts.join('_')}`,
      hosts,
      connections: segmentConnections,
      isolationLevel,
      riskLevel
    };
  }

  /**
   * Calcule le niveau d'isolation d'un segment
   */
  private calculateIsolationLevel(hosts: string[], connections: NetworkConnection[]): 'isolated' | 'semi-isolated' | 'connected' {
    if (connections.length === 0) return 'isolated';
    
    const externalConnections = connections.filter(conn => 
      !hosts.includes(conn.fromHostId) || !hosts.includes(conn.toHostId)
    );
    
    if (externalConnections.length === 0) return 'isolated';
    if (externalConnections.length < connections.length / 2) return 'semi-isolated';
    return 'connected';
  }

  /**
   * Calcule le niveau de risque d'un segment
   */
  private calculateSegmentRiskLevel(hosts: string[]): 'low' | 'medium' | 'high' | 'critical' {
    const hostData = hosts.map(id => this.hosts[id]);
    
    // Vérifier s'il y a des hôtes compromis
    const compromisedHosts = hostData.filter(h => h.status === 'compromised');
    if (compromisedHosts.length > 0) return 'critical';
    
    // Vérifier les vulnérabilités critiques
    const hasCriticalVulns = hostData.some(h => 
      h.vulnerabilities.some(v => v.severity === 'Critical')
    );
    if (hasCriticalVulns) return 'high';
    
    // Vérifier les hôtes de haute priorité
    const highPriorityHosts = hostData.filter(h => h.priority === 'high' || h.priority === 'critical');
    if (highPriorityHosts.length > 0) return 'medium';
    
    return 'low';
  }

  /**
   * Groupe les chemins similaires pour éviter les doublons
   */
  private groupSimilarPaths(paths: AttackPath[]): AttackPath[] {
    const grouped: AttackPath[] = [];
    const processed = new Set<string>();
    
    paths.forEach(path => {
      const key = `${path.startHosts.sort().join(',')}-${path.endHosts.sort().join(',')}`;
      if (processed.has(key)) return;
      
      // Trouver tous les chemins similaires
      const similarPaths = paths.filter(p => 
        p.startHosts.sort().join(',') === path.startHosts.sort().join(',') &&
        p.endHosts.sort().join(',') === path.endHosts.sort().join(',')
      );
      
      // Prendre le chemin le plus court ou le plus critique
      const bestPath = similarPaths.reduce((best, current) => {
        if (current.severity === 'critical' && best.severity !== 'critical') return current;
        if (current.path.length < best.path.length) return current;
        return best;
      });
      
      grouped.push(bestPath);
      processed.add(key);
    });
    
    return grouped;
  }
}
