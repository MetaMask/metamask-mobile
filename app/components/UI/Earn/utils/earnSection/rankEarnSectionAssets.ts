import type {
  EarnAsset,
  EarnExperience,
  EarnRateStatus,
} from '../../types/earnAssets';
import { getEarnAssetFiatNumber, hasEarnAssetBalance } from '../earnAssets';

export const EARN_SECTION_ASSET_LIMIT = 5;

export type EarnSectionRankedAsset = EarnAsset & {
  highestRatePercent?: number;
  highestRateExperience?: EarnExperience;
  rateStatus: EarnRateStatus;
};

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
  if (experiences.some(({ rate }) => rate.percentage !== undefined)) {
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
    if (rate.percentage === undefined || !Number.isFinite(rate.percentage)) {
      return highest;
    }
    return highest === undefined
      ? rate.percentage
      : Math.max(highest, rate.percentage);
  }, undefined);

const getHighestRateExperience = (experiences: readonly EarnExperience[]) =>
  experiences.reduce<EarnExperience | undefined>((highest, experience) => {
    if (
      experience.rate.percentage === undefined ||
      !Number.isFinite(experience.rate.percentage)
    ) {
      return highest;
    }
    return highest?.rate.percentage !== undefined &&
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
 * Projects the CAIP-19-deduplicated catalogue produced by buildEarnAssets into
 * fixed homepage slots. Held assets rank before discovery assets, and missing
 * assets are padded so the section always renders five slots by default.
 *
 * Rates are compared as displayed numeric percentages; APR and APY values are
 * not normalized to a common yield type.
 */
export const rankEarnSectionAssets = (
  assets: readonly EarnAsset[],
  limit = EARN_SECTION_ASSET_LIMIT,
): EarnSectionAssetSlot[] => {
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

  const slots: EarnSectionAssetSlot[] = [...held, ...unheld]
    .slice(0, limit)
    .map((asset) => ({
      kind: 'asset',
      key: asset.assetId,
      asset,
    }));

  while (slots.length < limit) {
    slots.push({
      kind: 'unavailable',
      key: `earn-section-unavailable-${slots.length}`,
    });
  }

  return slots;
};
