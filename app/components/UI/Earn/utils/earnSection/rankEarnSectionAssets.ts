import type {
  EarnAsset,
  EarnExperience,
  EarnRateStatus,
} from '../../types/earnAssets';
import {
  getEarnAssetFiatNumber,
  getEarnInputExperiences,
  hasEarnAssetBalance,
} from '../earnAssets';
import { getHighestReadyRateEntry } from '../earnRate';

/** Maximum number of assets displayed in the horizontal Earn section. */
export const EARN_SECTION_ASSET_LIMIT = 5;

const MAINNET_CHAIN_ID = '0x1';
const TRON_MAINNET_CHAIN_ID = 'tron:728126428';
const UNKNOWN_ASSET_PRIORITY = Number.MAX_SAFE_INTEGER;

const STABLECOIN_SYMBOL_PRIORITY: Record<string, number> = {
  USDT: 0,
  USDC: 1,
  DAI: 2,
};
const MAINNET_ETH_PRIORITY = 3;

type NoPositiveBalanceAssetSortKey = readonly [
  group: number,
  chainId: string,
  tokenPriority: number,
];

/** Earn asset enriched with aggregate rate information for display and sorting. */
export type EarnSectionRankedAsset = EarnAsset & {
  highestRatePercent?: number;
  highestRateExperience?: EarnExperience;
  rateStatus: EarnRateStatus;
};

/** A rendered Earn section asset slot or an unavailable placeholder slot. */
export type EarnSectionAssetSlot =
  | {
      kind: 'asset';
      key: string;
      asset: EarnSectionRankedAsset;
    }
  | {
      kind: 'unavailable';
      key: string;
    };

const getRateStatus = (
  experiences: readonly EarnExperience[],
): EarnRateStatus => {
  if (experiences.some(({ rate }) => rate.status === 'ready')) {
    return 'ready';
  }
  if (experiences.some(({ rate }) => rate.status === 'loading')) {
    return 'loading';
  }
  if (experiences.some(({ rate }) => rate.status === 'error')) {
    return 'error';
  }
  return 'unavailable';
};

const getHighestRateExperience = (experiences: readonly EarnExperience[]) =>
  getHighestReadyRateEntry(experiences, ({ rate }) => rate);

const getHighestRatePercent = (experiences: readonly EarnExperience[]) => {
  const highestRateExperience = getHighestRateExperience(experiences);
  return highestRateExperience?.rate.status === 'ready'
    ? highestRateExperience.rate.percentage
    : undefined;
};

const compareKnownNumbersDescending = (
  first: number | undefined,
  second: number | undefined,
) => {
  if (first === undefined && second === undefined) return 0;
  if (first === undefined) return 1;
  if (second === undefined) return -1;
  return second - first;
};

const compareByKey = (
  first: EarnSectionRankedAsset,
  second: EarnSectionRankedAsset,
) => first.assetId.localeCompare(second.assetId);

/**
 * Returns deterministic fallback sort key for assets without a positive balance:
 * - Mainnet USDT → USDC → DAI → ETH
 * - Other chains: chain ID, then USDT → USDC → DAI
 * - Tron TRX
 * - Unknown assets
 */
const getNoPositiveBalanceAssetSortKey = (
  asset: EarnSectionRankedAsset,
): NoPositiveBalanceAssetSortKey => {
  const { metadata } = asset;
  const symbol = metadata.symbol.toUpperCase();
  const chainId = metadata.chainId.toLowerCase();
  const stablecoinPriority = STABLECOIN_SYMBOL_PRIORITY[symbol];

  if (chainId === MAINNET_CHAIN_ID) {
    if (stablecoinPriority !== undefined) {
      return [0, '', stablecoinPriority];
    }

    if (metadata.isETH) {
      return [0, '', MAINNET_ETH_PRIORITY];
    }
  }

  if (stablecoinPriority !== undefined) {
    return [1, chainId, stablecoinPriority];
  }

  if (chainId === TRON_MAINNET_CHAIN_ID && symbol === 'TRX') {
    return [2, '', 0];
  }

  return [3, chainId, UNKNOWN_ASSET_PRIORITY];
};

const compareNoPositiveBalanceAssets = (
  first: EarnSectionRankedAsset,
  second: EarnSectionRankedAsset,
) => {
  const [firstGroup, firstChainId, firstSymbolPriority] =
    getNoPositiveBalanceAssetSortKey(first);
  const [secondGroup, secondChainId, secondSymbolPriority] =
    getNoPositiveBalanceAssetSortKey(second);

  return (
    firstGroup - secondGroup ||
    firstChainId.localeCompare(secondChainId) ||
    firstSymbolPriority - secondSymbolPriority ||
    compareByKey(first, second)
  );
};

/**
 * Enriches and sorts assets with positive balances first, then by highest rate.
 * Returns every asset without padding or truncation.
 *
 * Rates are compared as displayed numeric percentages; APR and APY values are
 * not normalized to a common yield type.
 *
 * @param assets - Earn catalogue assets to enrich and sort.
 * @returns All assets ordered for display.
 */
export const rankEarnAssets = (
  assets: readonly EarnAsset[],
): EarnSectionRankedAsset[] => {
  const rankedAssets = assets.map((asset): EarnSectionRankedAsset => {
    const inputExperiences = getEarnInputExperiences(asset.experiences);

    return {
      ...asset,
      highestRatePercent: getHighestRatePercent(inputExperiences),
      highestRateExperience: getHighestRateExperience(inputExperiences),
      rateStatus: getRateStatus(inputExperiences),
    };
  });

  const positiveBalanceAssets = rankedAssets
    .filter(hasEarnAssetBalance)
    .sort(
      (first, second) =>
        compareKnownNumbersDescending(
          getEarnAssetFiatNumber(first),
          getEarnAssetFiatNumber(second),
        ) || compareByKey(first, second),
    );

  const noPositiveBalanceAssets = rankedAssets
    .filter((asset) => !hasEarnAssetBalance(asset))
    .sort(
      (first, second) =>
        compareKnownNumbersDescending(
          first.highestRatePercent,
          second.highestRatePercent,
        ) || compareNoPositiveBalanceAssets(first, second),
    );

  return [...positiveBalanceAssets, ...noPositiveBalanceAssets];
};

/**
 * Projects the CAIP-19-deduplicated catalogue produced by buildEarnAssets into
 * fixed homepage slots. Positive-balance assets rank first, and missing assets
 * are padded so the section always renders five slots by default.
 *
 * @param assets - Earn catalogue assets to place into section slots.
 * @param limit - Maximum number of asset slots to return.
 * @returns Ranked asset slots padded with unavailable placeholders.
 */
export const rankEarnSectionAssets = (
  assets: readonly EarnAsset[],
  limit = EARN_SECTION_ASSET_LIMIT,
): EarnSectionAssetSlot[] => {
  const slots: EarnSectionAssetSlot[] = rankEarnAssets(assets)
    .slice(0, limit)
    .map((asset) => ({ kind: 'asset' as const, key: asset.assetId, asset }));

  while (slots.length < limit) {
    slots.push({
      kind: 'unavailable',
      key: `earn-section-unavailable-${slots.length}`,
    });
  }

  return slots;
};
