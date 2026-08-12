// TODO: Review entire file.
import type { LendingMarket } from '@metamask/stake-sdk';
import type { TokenI } from '../../../Tokens/types';
import type { EARN_EXPERIENCES } from '../../constants/experiences';

export const EARN_SECTION_ASSET_LIMIT = 5;

export type EarnSectionAssetSource =
  | 'money-deposit'
  | 'held-earn'
  | 'lending-market'
  | 'eth-staking'
  | 'trx-staking';

export type EarnSectionRateStatus =
  | 'ready'
  | 'loading'
  | 'error'
  | 'unavailable';

export type EarnSectionExperienceType =
  | EARN_EXPERIENCES
  | 'MONEY_ACCOUNT_DEPOSIT';

export interface EarnSectionExperience {
  id: string;
  type: EarnSectionExperienceType;
  source: EarnSectionAssetSource;
  ratePercent?: number;
  rateStatus: EarnSectionRateStatus;
  market?: LendingMarket;
}

export interface EarnSectionAssetCandidate {
  key: string;
  token: TokenI;
  experiences: EarnSectionExperience[];
  hasBalance: boolean;
  balanceFiatNumber?: number;
  balanceFiat?: string;
}

export interface EarnSectionRankedAsset extends EarnSectionAssetCandidate {
  highestRatePercent?: number;
  highestRateExperience?: EarnSectionExperience;
  rateStatus: EarnSectionRateStatus;
}

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

/**
 * Builds the stable identity used to merge an asset offered by multiple Earn
 * experiences. Chain ID remains part of the identity because the same token
 * address can represent different assets on different networks.
 */
export const buildEarnSectionAssetKey = (
  chainId: string | undefined,
  address: string,
) => `${chainId?.toLowerCase() ?? 'unknown'}:${address.toLowerCase()}`;

const getRateStatus = (
  experiences: EarnSectionExperience[],
): EarnSectionRateStatus => {
  if (experiences.some(({ ratePercent }) => ratePercent !== undefined)) {
    return 'ready';
  }
  if (experiences.some(({ rateStatus }) => rateStatus === 'loading')) {
    return 'loading';
  }
  if (experiences.some(({ rateStatus }) => rateStatus === 'error')) {
    return 'error';
  }
  return 'unavailable';
};

const getHighestRatePercent = (experiences: EarnSectionExperience[]) =>
  experiences.reduce<number | undefined>((highest, { ratePercent }) => {
    if (ratePercent === undefined || !Number.isFinite(ratePercent)) {
      return highest;
    }
    return highest === undefined ? ratePercent : Math.max(highest, ratePercent);
  }, undefined);

const getHighestRateExperience = (experiences: EarnSectionExperience[]) =>
  experiences.reduce<EarnSectionExperience | undefined>(
    (highest, experience) => {
      if (
        experience.ratePercent === undefined ||
        !Number.isFinite(experience.ratePercent)
      ) {
        return highest;
      }
      return highest?.ratePercent !== undefined &&
        highest.ratePercent >= experience.ratePercent
        ? highest
        : experience;
    },
    undefined,
  );

const preferCandidate = (
  current: EarnSectionAssetCandidate,
  incoming: EarnSectionAssetCandidate,
) => {
  if (incoming.hasBalance && !current.hasBalance) {
    return incoming;
  }
  if (
    incoming.hasBalance === current.hasBalance &&
    incoming.balanceFiatNumber !== undefined &&
    current.balanceFiatNumber === undefined
  ) {
    return incoming;
  }
  return current;
};

const mergeExperiences = (
  current: EarnSectionExperience[],
  incoming: EarnSectionExperience[],
) => {
  const byId = new Map(
    current.map((experience) => [experience.id, experience]),
  );
  incoming.forEach((experience) => {
    if (!byId.has(experience.id)) {
      byId.set(experience.id, experience);
    }
  });
  return [...byId.values()];
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
) => first.key.localeCompare(second.key);

/**
 * Merges overlapping experiences, ranks held assets before discovery assets,
 * and pads the result so EarnSection always renders exactly five asset slots.
 */
export const rankEarnSectionAssets = (
  candidates: EarnSectionAssetCandidate[],
  limit = EARN_SECTION_ASSET_LIMIT,
): EarnSectionAssetSlot[] => {
  const candidatesByKey = candidates.reduce((accumulator, candidate) => {
    const current = accumulator.get(candidate.key);
    if (!current) {
      accumulator.set(candidate.key, candidate);
      return accumulator;
    }

    const preferred = preferCandidate(current, candidate);
    accumulator.set(candidate.key, {
      ...preferred,
      experiences: mergeExperiences(current.experiences, candidate.experiences),
    });
    return accumulator;
  }, new Map<string, EarnSectionAssetCandidate>());

  const rankedAssets = [...candidatesByKey.values()].map(
    (candidate): EarnSectionRankedAsset => ({
      ...candidate,
      highestRatePercent: getHighestRatePercent(candidate.experiences),
      highestRateExperience: getHighestRateExperience(candidate.experiences),
      rateStatus: getRateStatus(candidate.experiences),
    }),
  );

  const held = rankedAssets
    .filter(({ hasBalance }) => hasBalance)
    .sort(
      (first, second) =>
        compareKnownNumbersDescending(
          first.balanceFiatNumber,
          second.balanceFiatNumber,
        ) || compareByKey(first, second),
    );
  const unheld = rankedAssets
    .filter(({ hasBalance }) => !hasBalance)
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
      key: asset.key,
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
