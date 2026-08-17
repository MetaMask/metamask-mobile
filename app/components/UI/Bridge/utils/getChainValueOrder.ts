import {
  CaipChainId,
  KnownCaipNamespace,
  hexToNumber,
  isCaipChainId,
  isStrictHexString,
  toCaipChainId,
} from '@metamask/utils';
import type { PromotedChain } from '../../../../selectors/featureFlagController/swapsChainValueOrderOverride';

export interface ChainRankingEntry {
  chainId: CaipChainId;
  name: string;
}

export interface ChainAsset {
  chainId?: string;
  fiat?: {
    balance?: number | null;
  };
}

export type HoldingAssetsByChain = Record<string, readonly ChainAsset[]>;

interface RankedChain {
  chain: ChainRankingEntry;
  holdingsValue: number;
  rankingIndex: number;
}

function normalizeChainId(chainId: string): CaipChainId | undefined {
  if (isCaipChainId(chainId)) return chainId;
  if (!isStrictHexString(chainId)) return undefined;

  return toCaipChainId(
    KnownCaipNamespace.Eip155,
    hexToNumber(chainId).toString(),
  );
}

function getFiatBalance(asset: ChainAsset): number {
  const fiatBalance = asset.fiat?.balance;
  return typeof fiatBalance === 'number' &&
    Number.isFinite(fiatBalance) &&
    fiatBalance > 0
    ? fiatBalance
    : 0;
}

/**
 * Totals selected-account-group fiat holdings by normalized CAIP chain ID.
 *
 * @param assetsByChain - Assets grouped by EVM hex or CAIP chain ID.
 * @returns Fiat holdings totals keyed by CAIP chain ID.
 */
export function getHoldingsByChain(
  assetsByChain: HoldingAssetsByChain,
): Partial<Record<CaipChainId, number>> {
  return Object.entries(assetsByChain).reduce<
    Partial<Record<CaipChainId, number>>
  >((holdingsByChain, [groupChainId, assets]) => {
    for (const asset of assets) {
      const chainId = normalizeChainId(asset.chainId ?? groupChainId);
      if (!chainId) continue;

      holdingsByChain[chainId] =
        (holdingsByChain[chainId] ?? 0) + getFiatBalance(asset);
    }

    return holdingsByChain;
  }, {});
}

function compareRankedChains(first: RankedChain, second: RankedChain): number {
  return (
    second.holdingsValue - first.holdingsValue ||
    first.rankingIndex - second.rankingIndex
  );
}

function promoteChainsToFront(
  rankedChains: RankedChain[],
  promotedChains: readonly PromotedChain[],
): RankedChain[] {
  if (promotedChains.length === 0) return rankedChains;

  const chainsByChainId = new Map(
    rankedChains.map((rankedChain) => [rankedChain.chain.chainId, rankedChain]),
  );
  const promotedPrefix: RankedChain[] = [];
  const promotedChainIds = new Set<CaipChainId>();

  for (const promotedChain of promotedChains) {
    if (promotedChainIds.has(promotedChain.chainId)) continue;

    const rankedChain = chainsByChainId.get(promotedChain.chainId);
    if (!rankedChain) continue;

    promotedPrefix.push(rankedChain);
    promotedChainIds.add(promotedChain.chainId);
  }

  if (promotedPrefix.length === 0) return rankedChains;

  const remainingChains = rankedChains.filter(
    (rankedChain) => !promotedChainIds.has(rankedChain.chain.chainId),
  );

  return [...promotedPrefix, ...remainingChains];
}

/**
 * Orders allowed chains by holdings value and promotes remote override chains
 * to the front in array order without removing any chain.
 *
 * @param chainRanking - Allowed chains in LaunchDarkly ranking order.
 * @param assetsByChain - Selected-account-group assets grouped by chain.
 * @param promotedChains - Ordered remote promotion list.
 * @returns A new ordered chain array.
 */
export function getChainValueOrder(
  chainRanking: readonly ChainRankingEntry[],
  assetsByChain: HoldingAssetsByChain,
  promotedChains: readonly PromotedChain[],
): ChainRankingEntry[] {
  const holdingsByChain = getHoldingsByChain(assetsByChain);
  const rankedChains = chainRanking
    .map((chain, rankingIndex) => ({
      chain,
      holdingsValue: holdingsByChain[chain.chainId] ?? 0,
      rankingIndex,
    }))
    .sort(compareRankedChains);

  return promoteChainsToFront(rankedChains, promotedChains).map(
    ({ chain }) => chain,
  );
}
