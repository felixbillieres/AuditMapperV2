# AuditMapper v2 - Security Assessment Suite

Une suite d'outils modernes et professionnels pour les audits de sécurité et tests d'intrusion, refactorisée avec React 18, TypeScript et une architecture modulaire.

## ⚠️ Avertissement Important

**Ce tool est un side-project développé par un petit étudiant qui ne fait absolument pas de développement web à la base.** 

- **Bugs possibles** : Il y a très probablement des bugs dans le code
- **Données sensibles** : Ne pas utiliser ce tool avec des données sensibles sous peine de perte de données
- **Engagement** : Si vous repérez un bug, je m'engage à le réparer pour rendre l'outil meilleur

Merci de votre compréhension et de votre patience !


## Installation et Démarrage

### Prérequis
- **Node.js** 18+ 
- **npm** ou **yarn**
- **docker** et **docker compose**

### Installation

```bash
# Cloner le projet
git clone https://github.com/felixbillieres/AuditMapperV2.git
cd AuditMapperV2
docker compose -f dev.docker-compose.yml build
docker compose -f dev.docker-compose.yml up
```

Ouvrez le navigateur sur [http://localhost:3000](http://localhost:3000)

## Fonctionnalités

### Host Manager
- **Gestion des hosts** - Ajout, modification, suppression- 
- **Recherche et filtres** - Recherche textuelle et filtres avancés
- **Vue grille/liste** - Deux modes d'affichage
- **Sélection multiple** - Actions en lot
- **Export/Import** - Formats JSON, CSV, XML
- **Credentials** - Gestion des usernames, passwords, hashes avec fonction de spraying
- **Vulnérabilités** - Suivi des vulnérabilités par host
- **Services** - Gestion des services découverts
- **Screenshots** - Capture d'écrans d'exploitation
- **Étapes d'exploitation** - Workflow structuré
- **Statistiques** - Dashboard avec métriques
- **Persistance locale** - Stockage IndexedDB

### Calendar & Kanban
- **Kanban** - Colonnes personnalisables, drag & drop
- **Timers par ticket** - Start/Pause/Reset, cumul du temps
- **Timer global** - Compte à rebours configurable
- **Pomodoro** - Sessions travail/pause avec progression circulaire
- **To-Do & Notes** - Listes rapides, notes persistées
- **Export timesheet** - CSV avec temps passés par ticket

### Config Generator
- **Génération de configs** - Fichiers /etc/hosts, proxychains, Kerberos
- **Templates** - Paramétrage rapide, presets

### Template Generator
- **Génération Markdown** - À partir de paramètres + output Nmap
- **Aperçu Markdown** - Rendu riche avec mise en forme du code
- **Téléchargement** - Export direct en `.md` et copie presse-papiers

### File Transfer
- **One-liners** - Génération de commandes de transfert (HTTP/SMB/FTP/PowerShell)
- **Encodages** - Options d'encodage et variantes cross-OS

### Privesc Helper
- **Checklist interactive** - Techniques et suivi de progression
- **Notes** - Ajouts de preuves et commandes

### Live Report
- **Rapport en direct** - Rendu des éléments collectés, prêt pour export
- **Sections dynamiques** - Vulns, credentials, captures

### Grep Master
- **Parsing ciblé** - Extraction d'infos utiles depuis des outputs

### Pivot Master
- **Aide au pivoting** - Génération de commandes, visualisation réseau

### ADMR – Active Directory Mindmap Renderer
- **Rendu Obsidian Canvas** - Chargement des `.canvas` en UI interactive
- **Navigation** - Liens entre canvases, zoom/pan
- **Markdown** - Rendu des blocs textes
- **Crédits et sources**: merci à gr0bot et bl4ckarch pour la carte Obsidian, inspirée par `OCD mindmaps` et `The Hacker Recipes`. Source originale: [Imp0sters/ADMR](https://github.com/Imp0sters/ADMR)

## Technologies Utilisées

### Frontend
- **React 18** - Framework principal
- **TypeScript** - Typage statique
- **Vite** - Build tool ultra-rapide
- **Tailwind CSS** - Framework CSS utilitaire
- **Framer Motion** - Animations fluides
- **Zustand** - State management léger
- **React Query** - Gestion des données serveur
- **Lucide React** - Icônes modernes

### Architecture
- **Architecture modulaire** - Composants réutilisables
- **Store pattern** - Gestion d'état centralisée
- **Type safety** - TypeScript strict
- **Performance optimisée** - Lazy loading, code splitting
- **Accessibilité** - WCAG conformes

## Design System

### Thème Sombre Moderne
- **Couleurs** - Vert néon (#00ff88), magenta (#ff0080), cyan (#00ffff)
- **Animations fluides** - Transitions et micro-interactions
- **Responsive design** - Mobile-first approach

### Composants UI
- **Button** - Variantes cyber, terminal, gradient
- **Card** - Effets glass, neon, cyber
- **Input** - Styles dark, terminal, cyber
- **Modal** - Overlays modernes
- **Toast** - Notifications élégantes

## Structure du Projet

```
auditmapper-v2/
├── src/
│   ├── components/
│   │   ├── ui/                    # Composants UI de base
│   │   │   ├── button.tsx
│   │   │   ├── card.tsx
│   │   │   ├── input.tsx
│   │   │   └── ...
│   │   ├── layout/                # Layout et navigation
│   │   │   ├── Header.tsx
│   │   │   ├── Sidebar.tsx
│   │   │   └── ...
│   │   ├── features/              # Modules métier
│   │   │   ├── host-manager/      # Gestionnaire de hosts
│   │   │   │   ├── HostManager.tsx
│   │   │   │   ├── HostCard.tsx
│   │   │   │   ├── HostForm.tsx
│   │   │   │   └── ...
│   │   │   ├── pivot-master/      # Générateur de pivoting
│   │   │   ├── grep-master/       # Parser intelligent
│   │   │   ├── privesc-helper/    # Guide d'escalade
│   │   │   └── config-generator/  # Générateur de config
│   │   └── common/                # Composants partagés
│   ├── hooks/                     # Custom hooks
│   │   ├── useLocalStorage.ts
│   │   ├── useDebounce.ts
│   │   └── ...
│   ├── stores/                    # Zustand stores
│   │   ├── hostStore.ts
│   │   ├── uiStore.ts
│   │   └── ...
│   ├── services/                  # Services API
│   │   ├── database.ts
│   │   ├── export.ts
│   │   └── ...
│   ├── utils/                     # Utilitaires
│   │   ├── index.ts
│   │   ├── cn.ts
│   │   └── ...
│   ├── types/                     # Types TypeScript
│   │   └── index.ts
│   ├── styles/                    # Styles globaux
│   │   └── globals.css
│   ├── App.tsx                    # Composant principal
│   └── main.tsx                   # Point d'entrée
├── public/                        # Assets statiques
├── docs/                          # Documentation
└── ...
```



## Contribution

### Guidelines
1. **Fork** le projet
```bash
# Développement
git clone https://github.com/felixbillieres/AuditMapperV2.git
cd auditmapper-v2
npm run dev              # Lance le serveur de développement
```

Ouvrez le navigateur sur [http://localhost:3000](http://localhost:3000)

2. **Créer** une branche feature (`git checkout -b feature/AmazingFeature`)
3. **Commit** les changements (`git commit -m 'Add some AmazingFeature'`)
4. **Push** vers la branche (`git push origin feature/AmazingFeature`)
5. **Ouvrir** une Pull Request

### Standards de Code
- **TypeScript strict** - Tous les fichiers en TS
- **ESLint + Prettier** - Formatage automatique
- **Conventional Commits** - Messages de commit standardisés
- **Tests obligatoires** - Couverture minimale 80%

## Licence

Ce projet est sous licence MIT. Voir le fichier `LICENSE` pour plus de détails.

## Remerciements

- **Phreaks 2600** 
- **Friends & Family**
- **Amine & Evariste** — Merci pour le projet ADMR (cartes Obsidian AD). Repo: [Imp0sters/ADMR](https://github.com/Imp0sters/ADMR)

## Support

- **Email** : felix.billieres@ecole2600.com

---

**AuditMapper v2** - Security Assessment Suite  
*Made with ❤️ by Elliot Belt*
