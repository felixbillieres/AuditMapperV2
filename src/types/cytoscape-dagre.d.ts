declare module 'cytoscape-dagre' {
  import { Core } from 'cytoscape';
  
  interface DagreLayoutOptions {
    name: string;
    nodeDimensionsIncludeLabels?: boolean;
    fit?: boolean;
    padding?: number;
    animate?: boolean;
    animationDuration?: number;
    animationEasing?: string;
    boundingBox?: {
      x1: number;
      y1: number;
      x2: number;
      y2: number;
    };
    transform?: (node: any, pos: any) => any;
    ready?: () => void;
    stop?: () => void;
    rankdir?: 'TB' | 'BT' | 'LR' | 'RL';
    align?: 'UL' | 'UR' | 'DL' | 'DR' | undefined;
    nodesep?: number;
    edgesep?: number;
    ranksep?: number;
    marginx?: number;
    marginy?: number;
    acyclicer?: 'greedy' | undefined;
    ranker?: 'network-simplex' | 'tight-tree' | 'longest-path';
  }

  function register(cytoscape: (options?: any) => Core): void;
  export = register;
}
