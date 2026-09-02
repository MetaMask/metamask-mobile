import type {
  EarnAsset,
  EarnExperience,
  EarnRateStatus,
} from '../../types/earnAssets';
import { getEarnAssetFiatNumber, hasEarnAssetBalance } from '../earnAssets';

/** Maximum number of assets displayed in the horizontal Earn section. */
export const EARN_SECTION_ASSET_LIMIT = 5;

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

const getHighestRatePercent = (experiences: readonly EarnExperience[]) =>
  experiences.reduce<number | undefined>((highest, { rate }) => {
    if (rate.status !== 'ready' || !Number.isFinite(rate.percentage)) {
      return highest;
    }
    return highest === undefined
      ? rate.percentage
      : Math.max(highest, rate.percentage);
  }, undefined);

const getHighestRateExperience = (experiences: readonly EarnExperience[]) =>
  experiences.reduce<EarnExperience | undefined>((highest, experience) => {
    if (
      experience.rate.status !== 'ready' ||
      !Number.isFinite(experience.rate.percentage)
    ) {
      return highest;
    }
    return highest?.rate.status === 'ready' &&
      highest.rate.percentage >= experience.rate.percentage
      ? highest
      : experience;
  }, undefined);

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
 * Enriches and sorts all earn assets held-first, then by highest rate.
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
  const rankedAssets = assets.map(
    (asset): EarnSectionRankedAsset => ({
      ...asset,
      highestRatePercent: getHighestRatePercent(asset.experiences),
      highestRateExperience: getHighestRateExperience(asset.experiences),
      rateStatus: getRateStatus(asset.experiences),
    }),
  );

  const held = rankedAssets
    .filter(hasEarnAssetBalance)
    .sort(
      (first, second) =>
        compareKnownNumbersDescending(
          getEarnAssetFiatNumber(first),
          getEarnAssetFiatNumber(second),
        ) || compareByKey(first, second),
    );

  const unheld = rankedAssets
    .filter((asset) => !hasEarnAssetBalance(asset))
    .sort(
      (first, second) =>
        compareKnownNumbersDescending(
          first.highestRatePercent,
          second.highestRatePercent,
        ) || compareByKey(first, second),
    );

  return [...held, ...unheld];
};

/**
 * Projects the CAIP-19-deduplicated catalogue produced by buildEarnAssets into
 * fixed homepage slots. Held assets rank before discovery assets, and missing
 * assets are padded so the section always renders five slots by default.
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
