// ==========================================
// UTILITAIRES DE MIGRATION DES DONNÉES
// ==========================================

import { Host, Credential } from '@/types';

/**
 * Migre les anciens credentials (usernames, passwords, hashes) vers le nouveau format structuré
 */
export const migrateHostCredentials = (host: Host): Host => {
  const migratedHost = { ...host };
  
  // Si le host a déjà des credentials structurés et que les arrays legacy sont vides, on ne fait rien
  if (migratedHost.credentials && migratedHost.credentials.length > 0 && 
      (!migratedHost.usernames || migratedHost.usernames.length === 0) &&
      (!migratedHost.passwords || migratedHost.passwords.length === 0) &&
      (!migratedHost.hashes || migratedHost.hashes.length === 0)) {
    return migratedHost;
  }

  // Initialiser les credentials structurés s'ils n'existent pas
  if (!migratedHost.credentials) {
    migratedHost.credentials = [];
  }

  // Convertir les usernames
  if (migratedHost.usernames && migratedHost.usernames.length > 0) {
    migratedHost.usernames.forEach((username, index) => {
      const existingCred = migratedHost.credentials!.find(c => c.username === username);
      if (!existingCred) {
        migratedHost.credentials!.push({
          id: `migrated_username_${host.id}_${index}_${Date.now()}`,
          type: 'username',
          username: username,
          source: 'migration',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }
    });
  }

  // Convertir les passwords
  if (migratedHost.passwords && migratedHost.passwords.length > 0) {
    migratedHost.passwords.forEach((password, index) => {
      const existingCred = migratedHost.credentials!.find(c => c.password === password);
      if (!existingCred) {
        migratedHost.credentials!.push({
          id: `migrated_password_${host.id}_${index}_${Date.now()}`,
          type: 'password',
          password: password,
          source: 'migration',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }
    });
  }

  // Convertir les hashes
  if (migratedHost.hashes && migratedHost.hashes.length > 0) {
    migratedHost.hashes.forEach((hash, index) => {
      const existingCred = migratedHost.credentials!.find(c => c.hash === hash);
      if (!existingCred) {
        migratedHost.credentials!.push({
          id: `migrated_hash_${host.id}_${index}_${Date.now()}`,
          type: 'hash',
          hash: hash,
          source: 'migration',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }
    });
  }

  return migratedHost;
};

/**
 * Synchronise les credentials structurés vers les arrays legacy pour la compatibilité
 */
export const syncCredentialsToLegacy = (host: Host): Host => {
  const syncedHost = { ...host };
  
  if (!syncedHost.credentials || syncedHost.credentials.length === 0) {
    return syncedHost;
  }

  // Extraire les usernames
  syncedHost.usernames = Array.from(new Set(
    syncedHost.credentials
      .filter(c => c.username && c.username.trim() !== '')
      .map(c => c.username!)
  ));

  // Extraire les passwords
  syncedHost.passwords = Array.from(new Set(
    syncedHost.credentials
      .filter(c => c.password && c.password.trim() !== '')
      .map(c => c.password!)
  ));

  // Extraire les hashes
  syncedHost.hashes = Array.from(new Set(
    syncedHost.credentials
      .filter(c => c.hash && c.hash.trim() !== '')
      .map(c => c.hash!)
  ));

  return syncedHost;
};

/**
 * Migre les anciens niveaux de compromission vers les nouveaux
 */
export const migrateCompromiseLevel = (host: Host): Host => {
  const migratedHost = { ...host };
  
  // Migration des anciens niveaux vers les nouveaux
  if (migratedHost.compromiseLevel === 'none') {
    migratedHost.compromiseLevel = 'no_foothold';
  } else if (migratedHost.compromiseLevel === 'initial') {
    migratedHost.compromiseLevel = 'user_access';
  } else if (migratedHost.compromiseLevel === 'partial') {
    migratedHost.compromiseLevel = 'root_access';
  } else if (migratedHost.compromiseLevel === 'full') {
    migratedHost.compromiseLevel = 'fully_compromised';
  }
  
  return migratedHost;
};

/**
 * Migre un host complet (credentials + s'assure que toutes les propriétés nécessaires existent)
 */
export const migrateHost = (host: Host): Host => {
  let migratedHost = migrateHostCredentials(host);
  migratedHost = migrateCompromiseLevel(migratedHost);
  migratedHost = syncCredentialsToLegacy(migratedHost);
  
  // S'assurer que toutes les propriétés arrays existent
  migratedHost.usernames = migratedHost.usernames || [];
  migratedHost.passwords = migratedHost.passwords || [];
  migratedHost.hashes = migratedHost.hashes || [];
  migratedHost.credentials = migratedHost.credentials || [];
  migratedHost.vulnerabilities = migratedHost.vulnerabilities || [];
  migratedHost.exploitationSteps = migratedHost.exploitationSteps || [];
  migratedHost.screenshots = migratedHost.screenshots || [];
  migratedHost.services = migratedHost.services || [];
  migratedHost.ports = migratedHost.ports || [];
  migratedHost.tags = migratedHost.tags || [];
  migratedHost.outgoingConnections = migratedHost.outgoingConnections || [];
  migratedHost.incomingConnections = migratedHost.incomingConnections || [];

  // S'assurer que les dates existent
  if (!migratedHost.createdAt) {
    migratedHost.createdAt = new Date().toISOString();
  }
  if (!migratedHost.updatedAt) {
    migratedHost.updatedAt = new Date().toISOString();
  }

  return migratedHost;
};

/**
 * Migre tous les hosts d'un store
 */
export const migrateAllHosts = (hosts: Record<string, Host>): Record<string, Host> => {
  const migratedHosts: Record<string, Host> = {};
  
  Object.entries(hosts).forEach(([id, host]) => {
    migratedHosts[id] = migrateHost(host);
  });
  
  return migratedHosts;
};

/**
 * Vérifie si un host a besoin d'être migré
 */
export const needsMigration = (host: Host): boolean => {
  // Si le host a des arrays legacy non vides mais pas de credentials structurés
  const hasLegacyData = (host.usernames && host.usernames.length > 0) ||
                       (host.passwords && host.passwords.length > 0) ||
                       (host.hashes && host.hashes.length > 0);
  
  const hasStructuredData = host.credentials && host.credentials.length > 0;
  
  return hasLegacyData && !hasStructuredData;
};
