// ==========================================
// UTILITAIRES PRINCIPAUX
// ==========================================

import { Host, Credential, Vulnerability, Category, AggregatedCredentials } from '@/types';

/**
 * Génère un ID unique
 */
export const generateId = (): string => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Valide une adresse IP
 */
export const isValidIP = (ip: string): boolean => {
  const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
  const ipv6Regex = /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;
  return ipv4Regex.test(ip) || ipv6Regex.test(ip);
};

/**
 * Valide un nom d'hôte
 */
export const isValidHostname = (hostname: string): boolean => {
  const hostnameRegex = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  return hostnameRegex.test(hostname);
};

/**
 * Formate une date pour l'affichage
 */
export const formatDate = (date: Date): string => {
  return new Intl.DateTimeFormat('fr-FR', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
};

/**
 * Formate une date relative (il y a X temps)
 */
export const formatRelativeDate = (date: Date): string => {
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) {
    return 'À l\'instant';
  } else if (diffInSeconds < 3600) {
    const minutes = Math.floor(diffInSeconds / 60);
    return `Il y a ${minutes} minute${minutes > 1 ? 's' : ''}`;
  } else if (diffInSeconds < 86400) {
    const hours = Math.floor(diffInSeconds / 3600);
    return `Il y a ${hours} heure${hours > 1 ? 's' : ''}`;
  } else {
    const days = Math.floor(diffInSeconds / 86400);
    return `Il y a ${days} jour${days > 1 ? 's' : ''}`;
  }
};

/**
 * Tronque un texte avec ellipsis
 */
export const truncateText = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
};

/**
 * Nettoie un nom de fichier
 */
export const sanitizeFilename = (filename: string): string => {
  return filename.replace(/[^a-z0-9_\-\.]/gi, '_');
};

/**
 * Convertit une taille en bytes en format lisible
 */
export const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

/**
 * Génère une couleur basée sur une chaîne
 */
export const generateColor = (str: string): string => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 70%, 50%)`;
};

/**
 * Génère un gradient de couleur basé sur une valeur
 */
export const generateGradient = (value: number, min: number, max: number): string => {
  const percentage = Math.min(Math.max((value - min) / (max - min), 0), 1);
  const hue = percentage * 120; // 0 = rouge, 120 = vert
  return `hsl(${hue}, 70%, 50%)`;
};

/**
 * Débounce une fonction
 */
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

/**
 * Throttle une fonction
 */
export const throttle = <T extends (...args: any[]) => any>(
  func: T,
  limit: number
): ((...args: Parameters<T>) => void) => {
  let inThrottle: boolean;
  
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
};

/**
 * Copie du texte dans le presse-papiers
 */
export const copyToClipboard = async (text: string): Promise<boolean> => {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    } else {
      // Fallback pour les contextes non sécurisés
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      const successful = document.execCommand('copy');
      document.body.removeChild(textArea);
      return successful;
    }
  } catch (error) {
    console.error('Erreur lors de la copie:', error);
    return false;
  }
};

export const downloadFile = async (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

export const readFileAsText = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) {
        resolve(e.target.result as string);
      } else {
        reject(new Error('Failed to read file'));
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
};

/**
 * Lit un fichier comme ArrayBuffer
 */
export const readFileAsArrayBuffer = (file: File): Promise<ArrayBuffer> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
};

/**
 * Valide un fichier
 */
export const validateFile = (
  file: File,
  allowedTypes: string[],
  maxSize: number
): { isValid: boolean; error?: string } => {
  if (!allowedTypes.includes(file.type)) {
    return {
      isValid: false,
      error: `Type de fichier non supporté. Types autorisés: ${allowedTypes.join(', ')}`,
    };
  }
  
  if (file.size > maxSize) {
    return {
      isValid: false,
      error: `Fichier trop volumineux. Taille maximale: ${formatBytes(maxSize)}`,
    };
  }
  
  return { isValid: true };
};

/**
 * Agrège les credentials de plusieurs hosts
 */
export const aggregateCredentials = (hosts: Record<string, Host>): AggregatedCredentials => {
  const hostArray = Object.values(hosts);
  const allUsernames = hostArray.flatMap(host => host.usernames);
  const allPasswords = hostArray.flatMap(host => host.passwords);
  const allHashes = hostArray.flatMap(host => host.hashes);

  return {
    usernames: [...new Set(allUsernames)],
    passwords: [...new Set(allPasswords)],
    hashes: [...new Set(allHashes)],
    uniqueUsernames: new Set(allUsernames).size,
    uniquePasswords: new Set(allPasswords).size,
    uniqueHashes: new Set(allHashes).size,
    totalCredentials: allUsernames.length + allPasswords.length + allHashes.length,
  };
};

/**
 * Filtre les hosts selon des critères
 */
export const filterHosts = (
  hosts: Host[],
  filters: {
    search?: string;
    status?: Host['status'][];
    priority?: Host['priority'][];
    compromiseLevel?: Host['compromiseLevel'][];
    categories?: string[];
    tags?: string[];
  }
): Host[] => {
  return hosts.filter(host => {
    // Recherche textuelle
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      const searchableText = [
        host.ip,
        host.hostname,
        host.os,
        host.notes,
        ...host.tags,
      ].join(' ').toLowerCase();
      
      if (!searchableText.includes(searchLower)) {
        return false;
      }
    }
    
    // Filtres par statut
    if (filters.status && filters.status.length > 0) {
      if (!filters.status.includes(host.status)) {
        return false;
      }
    }
    
    // Filtres par priorité
    if (filters.priority && filters.priority.length > 0) {
      if (!filters.priority.includes(host.priority)) {
        return false;
      }
    }
    
    // Filtres par niveau de compromission
    if (filters.compromiseLevel && filters.compromiseLevel.length > 0) {
      if (!filters.compromiseLevel.includes(host.compromiseLevel)) {
        return false;
      }
    }
    
    // Filtres par catégorie
    if (filters.categories && filters.categories.length > 0) {
      if (!host.category || !filters.categories.includes(host.category)) {
        return false;
      }
    }
    
    // Filtres par tags
    if (filters.tags && filters.tags.length > 0) {
      const hasMatchingTag = filters.tags.some(tag => host.tags.includes(tag));
      if (!hasMatchingTag) {
        return false;
      }
    }
    
    return true;
  });
};

/**
 * Trie les hosts selon un champ
 */
export const sortHosts = (
  hosts: Host[],
  field: keyof Host,
  order: 'asc' | 'desc' = 'asc'
): Host[] => {
  return [...hosts].sort((a, b) => {
    const aValue = a[field];
    const bValue = b[field];
    
    if (aValue === bValue) return 0;
    
    const comparison = aValue < bValue ? -1 : 1;
    return order === 'asc' ? comparison : -comparison;
  });
};

/**
 * Calcule les statistiques des hosts
 */
export const calculateHostStats = (hosts: Record<string, Host>) => {
  const hostArray = Object.values(hosts);
  
  const stats = {
    total: hostArray.length,
    active: hostArray.filter(h => h.status === 'active').length,
    compromised: hostArray.filter(h => h.status === 'compromised').length,
    byStatus: {} as Record<Host['status'], number>,
    byPriority: {} as Record<Host['priority'], number>,
    byCompromiseLevel: {} as Record<Host['compromiseLevel'], number>,
    byOS: {} as Record<string, number>,
    byCategory: {} as Record<string, number>,
  };

  // Initialiser les compteurs
  const statuses: Host['status'][] = ['active', 'inactive', 'compromised'];
  const priorities: Host['priority'][] = ['low', 'medium', 'high', 'critical'];
  const compromiseLevels: Host['compromiseLevel'][] = ['none', 'initial', 'partial', 'full'];

  statuses.forEach(status => stats.byStatus[status] = 0);
  priorities.forEach(priority => stats.byPriority[priority] = 0);
  compromiseLevels.forEach(level => stats.byCompromiseLevel[level] = 0);

  // Compter
  hostArray.forEach(host => {
    stats.byStatus[host.status]++;
    stats.byPriority[host.priority]++;
    stats.byCompromiseLevel[host.compromiseLevel]++;
    
    if (host.os) {
      stats.byOS[host.os] = (stats.byOS[host.os] || 0) + 1;
    }
    
    if (host.category) {
      stats.byCategory[host.category] = (stats.byCategory[host.category] || 0) + 1;
    }
  });

  return stats;
};

/**
 * Génère un nom de fichier unique
 */
export const generateUniqueFilename = (baseName: string, extension: string): string => {
  const timestamp = Date.now();
  const sanitizedBase = sanitizeFilename(baseName);
  return `${sanitizedBase}_${timestamp}.${extension}`;
};

/**
 * Formate une durée en secondes
 */
export const formatDuration = (seconds: number): string => {
  if (seconds < 60) {
    return `${seconds}s`;
  } else if (seconds < 3600) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  } else {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  }
};

/**
 * Vérifie si un élément est visible dans le viewport
 */
export const isElementInViewport = (element: HTMLElement): boolean => {
  const rect = element.getBoundingClientRect();
  return (
    rect.top >= 0 &&
    rect.left >= 0 &&
    rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
    rect.right <= (window.innerWidth || document.documentElement.clientWidth)
  );
};

/**
 * Scroll vers un élément avec animation
 */
export const scrollToElement = (element: HTMLElement, offset: number = 0): void => {
  const elementPosition = element.getBoundingClientRect().top;
  const offsetPosition = elementPosition + window.pageYOffset - offset;
  
  window.scrollTo({
    top: offsetPosition,
    behavior: 'smooth',
  });
};

/**
 * Retourne une promesse qui se résout après un délai
 */
export const delay = (ms: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

/**
 * Retourne une promesse qui se résout avec une valeur après un délai
 */
export const delayWithValue = <T>(ms: number, value: T): Promise<T> => {
  return new Promise(resolve => setTimeout(() => resolve(value), ms));
};

/**
 * Retourne une promesse qui se rejette après un délai
 */
export const timeout = (ms: number): Promise<never> => {
  return new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), ms));
};

/**
 * Retourne une promesse avec timeout
 */
export const withTimeout = <T>(promise: Promise<T>, ms: number): Promise<T> => {
  return Promise.race([promise, timeout(ms)]);
};

/**
 * Retourne une promesse qui se résout avec une valeur aléatoire d'un tableau
 */
export const randomChoice = <T>(array: T[]): T => {
  return array[Math.floor(Math.random() * array.length)];
};

/**
 * Retourne un nombre aléatoire entre min et max
 */
export const randomBetween = (min: number, max: number): number => {
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

/**
 * Retourne un UUID v4
 */
export const generateUUID = (): string => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

/**
 * Retourne un hash simple d'une chaîne
 */
export const simpleHash = (str: string): number => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return hash;
};

/**
 * Retourne un hash MD5 d'une chaîne (simulation)
 */
export const md5Hash = (str: string): string => {
  // Note: Ceci est une simulation. En production, utilisez une vraie implémentation MD5
  return simpleHash(str).toString(16);
};

/**
 * Retourne un hash SHA256 d'une chaîne (simulation)
 */
export const sha256Hash = (str: string): string => {
  // Note: Ceci est une simulation. En production, utilisez une vraie implémentation SHA256
  return simpleHash(str + 'sha256').toString(16);
};

/**
 * Retourne un hash bcrypt d'une chaîne (simulation)
 */
export const bcryptHash = (str: string): string => {
  // Note: Ceci est une simulation. En production, utilisez une vraie implémentation bcrypt
  return '$2b$10$' + simpleHash(str + 'bcrypt').toString(16);
};

/**
 * Retourne un hash NTLM d'une chaîne (simulation)
 */
export const ntlmHash = (str: string): string => {
  // Note: Ceci est une simulation. En production, utilisez une vraie implémentation NTLM
  return simpleHash(str + 'ntlm').toString(16).toUpperCase();
};

/**
 * Retourne un hash LM d'une chaîne (simulation)
 */
export const lmHash = (str: string): string => {
  // Note: Ceci est une simulation. En production, utilisez une vraie implémentation LM
  return simpleHash(str + 'lm').toString(16).toUpperCase();
};
