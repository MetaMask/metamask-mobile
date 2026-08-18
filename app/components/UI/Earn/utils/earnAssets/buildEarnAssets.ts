import { EARN_EXPERIENCES } from '../../constants/experiences';
import type { EarnAsset, EarnExperience } from '../../types/earnAssets';

const experienceOrder: Record<EarnExperience['type'], number> = {
  MONEY_ACCOUNT_DEPOSIT: 0,
  [EARN_EXPERIENCES.STABLECOIN_LENDING]: 1,
  [EARN_EXPERIENCES.POOLED_STAKING]: 2,
  [EARN_EXPERIENCES.TRX_STAKING]: 2,
};

const orderExperiencesByRank = (
  experiences: readonly EarnExperience[],
): EarnExperience[] =>
  experiences
    .map((experience, index) => ({ experience, index }))
    .sort(
      (first, second) =>
        experienceOrder[first.experience.type] -
          experienceOrder[second.experience.type] || first.index - second.index,
    )
    .map(({ experience }) => experience);

/**
 * Merges Earn experiences while preserving their first-seen order.
 *
 * @param current - Experiences already associated with an asset.
 * @param incoming - Experiences from a later asset candidate.
 * @returns Combined experiences with duplicate IDs removed.
 */
const mergeExperiences = (
  current: readonly EarnExperience[],
  incoming: readonly EarnExperience[],
): EarnExperience[] => {
  const experiencesById = new Map(
    current.map((experience) => [experience.id, experience]),
  );
  incoming.forEach((experience) => {
    if (!experiencesById.has(experience.id)) {
      experiencesById.set(experience.id, experience);
    }
  });
  return [...experiencesById.values()];
};

/**
 * Adds undefined fields from an incoming candidate without overwriting fields
 * owned by the current candidate.
 *
 * @param current - Candidate with precedence for already-defined fields.
 * @param incoming - Candidate that may provide missing fields.
 * @returns Asset containing the current fields and any missing incoming fields.
 */
const fillMissingTokenFields = (
  current: EarnAsset,
  incoming: EarnAsset,
): EarnAsset => {
  const merged = { ...current };
  (Object.keys(incoming) as (keyof EarnAsset)[]).forEach((key) => {
    if (merged[key] === undefined) {
      Object.assign(merged, { [key]: incoming[key] });
    }
  });
  return merged;
};

/**
 * Builds one asset per CAIP-19 identity.
 *
 * Earlier candidates own conflicting token fields; later candidates can only
 * fill fields that are absent. Experiences are merged by stable experience ID
 * and ordered by strategy priority.
 *
 * @param candidates - Asset candidates contributed by Earn data sources.
 * @returns Deduplicated Earn assets in first-seen candidate order.
 */
export const buildEarnAssets = (
  candidates: readonly EarnAsset[],
): EarnAsset[] =>
  Array.from(
    candidates
      .reduce((assetsById, candidate) => {
        const identity = candidate.assetId.toLowerCase();
        const current = assetsById.get(identity);
        if (!current) {
          assetsById.set(identity, {
            ...candidate,
            experiences: orderExperiencesByRank(candidate.experiences),
          });
          return assetsById;
        }

        assetsById.set(identity, {
          ...fillMissingTokenFields(current, candidate),
          experiences: orderExperiencesByRank(
            mergeExperiences(current.experiences, candidate.experiences),
          ),
        });
        return assetsById;
      }, new Map<string, EarnAsset>())
      .values(),
  );
