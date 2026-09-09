import type { EarnExperience } from '../../types/earnAssets';

const isMoneyExperience = (experience: EarnExperience): boolean =>
  experience.type === 'MONEY_ACCOUNT_DEPOSIT';

/**
 * Returns experiences that present the asset as a deposit input.
 *
 * Output experiences describe receipt or position-token associations and are
 * not user-facing strategies for depositing the asset.
 */
export const getEarnStrategyExperiences = (
  experiences: readonly EarnExperience[],
): EarnExperience[] =>
  experiences.filter((experience) => experience.role !== 'output');

/**
 * Returns strategies that can currently accept a deposit.
 */
export const getAvailableEarnStrategyExperiences = (
  experiences: readonly EarnExperience[],
): EarnExperience[] =>
  getEarnStrategyExperiences(experiences).filter(
    ({ availability }) => availability.status === 'available',
  );

/**
 * Returns non-Money strategies used by staking and lending surfaces.
 */
export const getNonMoneyEarnStrategyExperiences = (
  experiences: readonly EarnExperience[],
): EarnExperience[] =>
  getEarnStrategyExperiences(experiences).filter(
    (experience) => !isMoneyExperience(experience),
  );
