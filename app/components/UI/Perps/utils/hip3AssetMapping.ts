import type { PerpsUniverse } from '@deeeed/hyperliquid-node20';

/**
 * HIP-3 Asset Mapping Utilities
 *
 * CRITICAL: Asset IDs are DEX-specific, not global!
 * Each DEX has its own numbering starting from 0.
 *
 * Main DEX: BTC=0, ETH=1, SOL=2, ...
 * xyz DEX: xyz:XYZ100=0
 *
 * We CANNOT merge these into one map because asset ID 0 is ambiguous.
 */

export interface AssetMapping {
  coinToAssetId: Map<string, number>;
  assetIdToCoin: Map<number, string>;
}

export interface DexAssetContext {
  dexName: string | null; // null for main DEX
  assetId: number;
  assetInfo: PerpsUniverse;
}

/**
 * Build separate asset mappings per DEX
 */
export function buildDexAssetMappings(dexData: {
  mainUniverse: PerpsUniverse[];
  hip3Dexs: { dexName: string; universe: PerpsUniverse[] }[];
}): {
  mainDexMapping: AssetMapping;
  hip3DexMappings: Map<string, AssetMapping>;
  coinToDex: Map<string, string | null>; // Maps coin symbol to its DEX name
} {
  const { mainUniverse, hip3Dexs } = dexData;

  // Build main DEX mapping
  const mainDexMapping: AssetMapping = {
    coinToAssetId: new Map(),
    assetIdToCoin: new Map(),
  };

  mainUniverse.forEach((asset, index) => {
    mainDexMapping.coinToAssetId.set(asset.name, index);
    mainDexMapping.assetIdToCoin.set(index, asset.name);
  });

  // Build HIP-3 DEX mappings (separate for each DEX)
  const hip3DexMappings = new Map<string, AssetMapping>();
  const coinToDex = new Map<string, string | null>();

  // Add main DEX assets to coinToDex
  mainUniverse.forEach((asset) => {
    coinToDex.set(asset.name, null); // null = main DEX
  });

  // Build mapping for each HIP-3 DEX
  hip3Dexs.forEach(({ dexName, universe }) => {
    const dexMapping: AssetMapping = {
      coinToAssetId: new Map(),
      assetIdToCoin: new Map(),
    };

    universe.forEach((asset, index) => {
      dexMapping.coinToAssetId.set(asset.name, index);
      dexMapping.assetIdToCoin.set(index, asset.name);
      coinToDex.set(asset.name, dexName); // Map coin to its DEX
    });

    hip3DexMappings.set(dexName, dexMapping);
  });

  return { mainDexMapping, hip3DexMappings, coinToDex };
}

/**
 * Get asset ID for a coin, with DEX context
 */
export function getAssetIdForCoin(
  coin: string,
  mappings: {
    mainDexMapping: AssetMapping;
    hip3DexMappings: Map<string, AssetMapping>;
    coinToDex: Map<string, string | null>;
  },
): DexAssetContext | null {
  const { mainDexMapping, hip3DexMappings, coinToDex } = mappings;

  // Find which DEX this coin belongs to
  const dexName = coinToDex.get(coin);

  if (dexName === undefined) {
    // Coin not found in any DEX
    return null;
  }

  if (dexName === null) {
    // Main DEX asset
    const assetId = mainDexMapping.coinToAssetId.get(coin);
    if (assetId === undefined) return null;

    const assetInfo = { name: coin } as PerpsUniverse; // Simplified
    return { dexName: null, assetId, assetInfo };
  }

  // HIP-3 DEX asset
  const dexMapping = hip3DexMappings.get(dexName);
  if (!dexMapping) return null;

  const assetId = dexMapping.coinToAssetId.get(coin);
  if (assetId === undefined) return null;

  const assetInfo = { name: coin } as PerpsUniverse; // Simplified
  return { dexName, assetId, assetInfo };
}

/**
 * Parse DEX name from symbol (e.g., "xyz:XYZ100" → { dex: "xyz", symbol: "XYZ100" })
 */
export function parseDexSymbol(fullSymbol: string): {
  dexName: string | null;
  baseSymbol: string;
} {
  const colonIndex = fullSymbol.indexOf(':');
  if (colonIndex > 0 && colonIndex < fullSymbol.length - 1) {
    return {
      dexName: fullSymbol.substring(0, colonIndex),
      baseSymbol: fullSymbol.substring(colonIndex + 1),
    };
  }
  return { dexName: null, baseSymbol: fullSymbol };
}
