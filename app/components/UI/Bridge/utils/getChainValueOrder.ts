import {
  CaipChainId,
  KnownCaipNamespace,
  hexToNumber,
  isCaipChainId,
  isStrictHexString,
  toCaipChainId,
} from '@metamask/utils';
import type { NetworkPositionOverrides } from '../../../../selectors/featureFlagController/swapsNetworkValueOrder';

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

interface OverrideBlock {
  startIndex: number;
  chains: RankedChain[];
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

function clampBlockStart(
  startIndex: number,
  blockLength: number,
  chainCount: number,
): number {
  return Math.min(startIndex, Math.max(0, chainCount - blockLength));
}

function mergeOverrideBlocks(
  overrideBlocks: OverrideBlock[],
  chainCount: number,
): OverrideBlock[] {
  let blocks = overrideBlocks.map((block) => ({
    ...block,
    startIndex: clampBlockStart(
      block.startIndex,
      block.chains.length,
      chainCount,
    ),
  }));

  while (true) {
    const mergedBlocks: OverrideBlock[] = [];
    let didMerge = false;

    for (const block of [...blocks].sort(
      (first, second) => first.startIndex - second.startIndex,
    )) {
      const previousBlock = mergedBlocks.at(-1);
      const previousEndIndex = previousBlock
        ? previousBlock.startIndex + previousBlock.chains.length - 1
        : -1;

      if (previousBlock && block.startIndex <= previousEndIndex) {
        previousBlock.chains = [...previousBlock.chains, ...block.chains].sort(
          compareRankedChains,
        );
        previousBlock.startIndex = clampBlockStart(
          Math.min(previousBlock.startIndex, block.startIndex),
          previousBlock.chains.length,
          chainCount,
        );
        didMerge = true;
        continue;
      }

      mergedBlocks.push({
        ...block,
        chains: [...block.chains],
      });
    }

    if (!didMerge) return mergedBlocks;
    blocks = mergedBlocks;
  }
}

function applyPositionOverrides(
  rankedChains: RankedChain[],
  positionOverrides: NetworkPositionOverrides,
): RankedChain[] {
  const chainsByChainId = new Map(
    rankedChains.map((rankedChain) => [rankedChain.chain.chainId, rankedChain]),
  );
  const groupedOverrides = Object.entries(positionOverrides).reduce<
    Map<number, RankedChain[]>
  >((overridesByPosition, [chainId, positionOverride]) => {
    if (
      !isCaipChainId(chainId) ||
      !positionOverride ||
      positionOverride.position >= rankedChains.length
    ) {
      return overridesByPosition;
    }

    const rankedChain = chainsByChainId.get(chainId);
    if (!rankedChain) return overridesByPosition;

    const chainsAtPosition =
      overridesByPosition.get(positionOverride.position) ?? [];
    overridesByPosition.set(positionOverride.position, [
      ...chainsAtPosition,
      rankedChain,
    ]);
    return overridesByPosition;
  }, new Map());

  if (groupedOverrides.size === 0) return rankedChains;

  const overrideBlocks = mergeOverrideBlocks(
    [...groupedOverrides.entries()].map(([startIndex, chains]) => ({
      startIndex,
      chains: [...chains].sort(compareRankedChains),
    })),
    rankedChains.length,
  );
  const overriddenChainIds = new Set(
    overrideBlocks.flatMap((block) =>
      block.chains.map((rankedChain) => rankedChain.chain.chainId),
    ),
  );
  const remainingChains = rankedChains.filter(
    (rankedChain) => !overriddenChainIds.has(rankedChain.chain.chainId),
  );
  const orderedChains: (RankedChain | undefined)[] = Array.from({
    length: rankedChains.length,
  });

  for (const block of overrideBlocks) {
    block.chains.forEach((rankedChain, index) => {
      orderedChains[block.startIndex + index] = rankedChain;
    });
  }

  let remainingIndex = 0;
  return orderedChains.map(
    (rankedChain) => rankedChain ?? remainingChains[remainingIndex++],
  );
}

/**
 * Orders allowed chains by holdings value and applies remote position
 * overrides without removing any chain.
 *
 * @param chainRanking - Allowed chains in LaunchDarkly ranking order.
 * @param assetsByChain - Selected-account-group assets grouped by chain.
 * @param positionOverrides - Zero-based remote position overrides.
 * @returns A new ordered chain array.
 */
export function getChainValueOrder(
  chainRanking: readonly ChainRankingEntry[],
  assetsByChain: HoldingAssetsByChain,
  positionOverrides: NetworkPositionOverrides,
): ChainRankingEntry[] {
  const holdingsByChain = getHoldingsByChain(assetsByChain);
  const rankedChains = chainRanking
    .map((chain, rankingIndex) => ({
      chain,
      holdingsValue: holdingsByChain[chain.chainId] ?? 0,
      rankingIndex,
    }))
    .sort(compareRankedChains);

  return applyPositionOverrides(rankedChains, positionOverrides).map(
    ({ chain }) => chain,
  );
}
