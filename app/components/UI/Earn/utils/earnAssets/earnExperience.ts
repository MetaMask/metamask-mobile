import type { EarnExperience } from '../../types/earnAssets';

const isMoneyExperience = (experience: EarnExperience): boolean =>
  experience.type === 'MONEY_ACCOUNT_DEPOSIT';

/**
 * Returns experiences that present the asset as a deposit input.
 *
 * Output experiences describe receipt or position-token associations and are
 * not experiences used to deposit the asset.
 */
export const getEarnInputExperiences = (
  experiences: readonly EarnExperience[],
): EarnExperience[] =>
  experiences.filter((experience) => experience.role !== 'output');

/**
 * Returns deposit experiences that can currently accept a deposit.
 */
export const getAvailableEarnDepositExperiences = (
  experiences: readonly EarnExperience[],
): EarnExperience[] =>
  getEarnInputExperiences(experiences).filter(
    ({ availability }) => availability.status === 'available',
  );

/**
 * Returns non-Money strategies used by staking and lending surfaces.
 */
export const getNonMoneyEarnStrategyExperiences = (
  experiences: readonly EarnExperience[],
): EarnExperience[] =>
  getEarnInputExperiences(experiences).filter(
    (experience) => !isMoneyExperience(experience),
  );
