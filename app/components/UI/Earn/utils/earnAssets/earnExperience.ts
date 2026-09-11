import type {
  EarnExperience,
  EarnExperienceDepositNotReadyReason,
  EarnExperienceDepositReadiness,
} from '../../types/earnAssets';

const isMoneyExperience = (experience: EarnExperience): boolean =>
  experience.type === 'MONEY_ACCOUNT_DEPOSIT';

const EARN_ASSET_ACQUISITION_REASONS =
  new Set<EarnExperienceDepositNotReadyReason>([
    'asset_not_tracked',
    'insufficient_balance',
    'balance_unavailable',
  ]);

/**
 * Determines whether a not-ready Earn experience needs an acquisition flow.
 *
 * @param readiness - Deposit readiness for the selected Earn experience.
 * @returns Whether the selected asset requires acquisition before deposit.
 */
export const requiresEarnAssetAcquisition = (
  readiness: EarnExperienceDepositReadiness,
): boolean =>
  readiness.status === 'not_ready' &&
  EARN_ASSET_ACQUISITION_REASONS.has(readiness.reason);

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
export const getReadyEarnDepositExperiences = (
  experiences: readonly EarnExperience[],
): EarnExperience[] =>
  getEarnInputExperiences(experiences).filter(
    ({ depositReadiness }) => depositReadiness.status === 'ready',
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
