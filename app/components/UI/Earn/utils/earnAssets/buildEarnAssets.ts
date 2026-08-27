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

const selectCanonicalAsset = (
  current: EarnAsset,
  incoming: EarnAsset,
): EarnAsset =>
  current.kind === 'held' || incoming.kind === 'discovery' ? current : incoming;

/**
 * Builds one asset per CAIP-19 identity.
 *
 * Wallet assets always own asset data when a discovery candidate has the same
 * identity. Experiences are merged by stable experience ID and ordered by
 * strategy priority.
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
          ...selectCanonicalAsset(current, candidate),
          experiences: orderExperiencesByRank(
            mergeExperiences(current.experiences, candidate.experiences),
          ),
        });
        return assetsById;
      }, new Map<string, EarnAsset>())
      .values(),
  );
