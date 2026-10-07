import { queryOptions } from '@tanstack/react-query';
import { TOKEN_API_BASE_URL } from '../../Assets/watchlist/utils/getTokens';
import {
  isHardcodedMemeAssetId,
  MAINNET_PEPE_ASSET_ID,
} from '../hooks/useIsMemeToken';

export const TOKEN_ASSETS_V2_PATH = '/v2/assets';

const QUERY_STALE_TIME_MS = 30_000;

export interface TokenAssetMarketData {
  marketCap: number | null;
  totalVolume: number | null;
  price: string | null;
  pricePercentChange1d: string | null;
  pricePercentChange1h: string | null;
  liquidity: number | null;
  dilutedMarketCap: number | null;
  circulatingSupply: number | null;
}

export interface TokenAssetBondingCurve {
  pool: string | null;
  migratedPool: string | null;
  migratedAt: number | null;
  completedAt: number | null;
}

export interface TokenAssetLaunchpadData {
  protocol: string | null;
  deployer: string | null;
  launchedAt: number | null;
  description: string | null;
  bondingCurve: TokenAssetBondingCurve | null;
  graduationPercent: number | null;
  graduationStage: string | null;
  devHeldPercent: number | null;
  insiderHeldPercent: number | null;
  sniperHeldPercent: number | null;
}

export interface TokenAssetRecord {
  assetId: string;
  symbol: string;
  name: string;
  decimals: number;
  rwaData: unknown;
  marketData: TokenAssetMarketData | null;
  launchpad: string | null;
  launchpadData: TokenAssetLaunchpadData | null;
}

const defined = <T>(value: T | null | undefined, fallback: T): T =>
  value == null ? fallback : value;

const PEPE_FIXTURE_DESCRIPTION =
  'Pepe is a deflationary memecoin launched on Ethereum in 2023 as a tribute to the Pepe the Frog internet character. There is no formal team or roadmap — the token is entirely community-driven.';

/**
 * Test-only stand-in for mainnet PEPE. Remove this record when /v2/assets
 * returns real PEPE fields. It must not apply to any other token.
 */
export const PEPE_ASSET_FIXTURE: TokenAssetRecord = {
  assetId: MAINNET_PEPE_ASSET_ID,
  symbol: 'PEPE',
  name: 'Pepe',
  decimals: 18,
  rwaData: null,
  marketData: {
    marketCap: 12_400_000,
    totalVolume: 48_300_000,
    price: '0.000001',
    pricePercentChange1d: '3.09',
    pricePercentChange1h: '-0.52',
    liquidity: 560_000,
    dilutedMarketCap: 12_400_000,
    circulatingSupply: null,
  },
  launchpad: null,
  launchpadData: {
    protocol: null,
    deployer: null,
    launchedAt: null,
    description: PEPE_FIXTURE_DESCRIPTION,
    bondingCurve: null,
    graduationPercent: null,
    graduationStage: null,
    devHeldPercent: null,
    insiderHeldPercent: null,
    sniperHeldPercent: null,
  },
};

const mergeBondingCurve = (
  base: TokenAssetBondingCurve | null,
  overlay: TokenAssetBondingCurve | null,
): TokenAssetBondingCurve | null => {
  if (overlay == null) {
    return base;
  }
  if (base == null) {
    return overlay;
  }
  return {
    pool: defined(overlay.pool, base.pool),
    migratedPool: defined(overlay.migratedPool, base.migratedPool),
    migratedAt: defined(overlay.migratedAt, base.migratedAt),
    completedAt: defined(overlay.completedAt, base.completedAt),
  };
};

const mergeMarketData = (
  base: TokenAssetMarketData | null,
  overlay: TokenAssetMarketData | null,
): TokenAssetMarketData | null => {
  if (overlay == null) {
    return base;
  }
  if (base == null) {
    return overlay;
  }
  return {
    marketCap: defined(overlay.marketCap, base.marketCap),
    totalVolume: defined(overlay.totalVolume, base.totalVolume),
    price: defined(overlay.price, base.price),
    pricePercentChange1d: defined(
      overlay.pricePercentChange1d,
      base.pricePercentChange1d,
    ),
    pricePercentChange1h: defined(
      overlay.pricePercentChange1h,
      base.pricePercentChange1h,
    ),
    liquidity: defined(overlay.liquidity, base.liquidity),
    dilutedMarketCap: defined(overlay.dilutedMarketCap, base.dilutedMarketCap),
    circulatingSupply: defined(
      overlay.circulatingSupply,
      base.circulatingSupply,
    ),
  };
};

const mergeLaunchpadData = (
  base: TokenAssetLaunchpadData | null,
  overlay: TokenAssetLaunchpadData | null,
): TokenAssetLaunchpadData | null => {
  if (overlay == null) {
    return base;
  }
  if (base == null) {
    return overlay;
  }
  return {
    protocol: defined(overlay.protocol, base.protocol),
    deployer: defined(overlay.deployer, base.deployer),
    launchedAt: defined(overlay.launchedAt, base.launchedAt),
    description: defined(overlay.description, base.description),
    bondingCurve: mergeBondingCurve(base.bondingCurve, overlay.bondingCurve),
    graduationPercent: defined(
      overlay.graduationPercent,
      base.graduationPercent,
    ),
    graduationStage: defined(overlay.graduationStage, base.graduationStage),
    devHeldPercent: defined(overlay.devHeldPercent, base.devHeldPercent),
    insiderHeldPercent: defined(
      overlay.insiderHeldPercent,
      base.insiderHeldPercent,
    ),
    sniperHeldPercent: defined(
      overlay.sniperHeldPercent,
      base.sniperHeldPercent,
    ),
  };
};

export const mergePepeAssetFixture = (
  record: TokenAssetRecord,
): TokenAssetRecord => {
  const fixture = PEPE_ASSET_FIXTURE;
  return {
    assetId: defined(record.assetId, fixture.assetId),
    symbol: defined(record.symbol, fixture.symbol),
    name: defined(record.name, fixture.name),
    decimals: defined(record.decimals, fixture.decimals),
    rwaData: record.rwaData ?? fixture.rwaData,
    launchpad: record.launchpad ?? fixture.launchpad,
    marketData: mergeMarketData(fixture.marketData, record.marketData),
    launchpadData: mergeLaunchpadData(
      fixture.launchpadData,
      record.launchpadData,
    ),
  };
};

export const resolveTokenAssetDetails = (
  assetId: string | null,
  record: TokenAssetRecord | null | undefined,
  isError: boolean,
): TokenAssetRecord | null => {
  if (!isHardcodedMemeAssetId(assetId)) {
    return isError ? null : (record ?? null);
  }
  if (isError || record == null) {
    return PEPE_ASSET_FIXTURE;
  }
  return mergePepeAssetFixture(record);
};

const isTokenAssetRecord = (value: unknown): value is TokenAssetRecord =>
  typeof value === 'object' &&
  value != null &&
  'assetId' in value &&
  typeof (value as { assetId: unknown }).assetId === 'string';

export const fetchTokenAsset = async (
  assetId: string,
  signal?: AbortSignal,
): Promise<TokenAssetRecord | null> => {
  const params = new URLSearchParams({
    assetIds: assetId,
    includeLaunchpadData: 'true',
    includeRwaData: 'true',
    includeMarketData: 'true',
  });
  const response = await fetch(
    `${TOKEN_API_BASE_URL}${TOKEN_ASSETS_V2_PATH}?${params.toString()}`,
    { signal },
  );
  if (!response.ok) {
    throw new Error(`Token assets API error: ${response.status}`);
  }
  const body: unknown = await response.json();
  if (!Array.isArray(body)) {
    return null;
  }
  const match = body.find(
    (item) =>
      isTokenAssetRecord(item) &&
      item.assetId.toLowerCase() === assetId.toLowerCase(),
  );
  return match ?? null;
};

export const tokenAssetQueryOptions = (assetId: string) =>
  queryOptions({
    queryKey: ['token-details', 'v2-assets', assetId] as const,
    queryFn: ({ signal }) => fetchTokenAsset(assetId, signal),
    retry: false,
    staleTime: QUERY_STALE_TIME_MS,
  });
