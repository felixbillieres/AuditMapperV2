declare module 'cytoscape-cose-bilkent' {
  import { Core } from 'cytoscape';
  
  interface CoseBilkentLayoutOptions {
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
    randomize?: boolean;
    nodeRepulsion?: number;
    idealEdgeLength?: number;
    edgeElasticity?: number;
    nestingFactor?: number;
    gravity?: number;
    numIter?: number;
    tile?: boolean;
    animateFilter?: (node: any, i: number) => boolean;
    tilingPaddingVertical?: number;
    tilingPaddingHorizontal?: number;
    gravityRangeCompound?: number;
    gravityCompound?: number;
    gravityRange?: number;
    initialEnergyOnIncremental?: number;
  }

  function register(cytoscape: (options?: any) => Core): void;
  export = register;
}
