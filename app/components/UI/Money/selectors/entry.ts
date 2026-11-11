import { createSelector } from 'reselect';
import { selectMoneyOnboardingSeen } from '../../../../reducers/user/selectors';
import { selectMoneyOnboardingStepperAnimationEnabled } from '../../../../selectors/featureFlagController/moneyAccount';
import { selectMoneyAccountAccessBlockReason } from './visibility';
import type { MoneyEntryContext } from '../navigation/moneyEntryDecision';

/**
 * Resolves whether an entry must show Money onboarding before its destination.
 */
export const selectIsMoneyOnboardingRedirectNeeded = createSelector(
  selectMoneyOnboardingSeen,
  selectMoneyOnboardingStepperAnimationEnabled,
  (hasSeenOnboarding, isOnboardingEnabled) =>
    !hasSeenOnboarding && isOnboardingEnabled,
);

/**
 * Provides the stable context consumed by Money entry navigation.
 */
export const selectMoneyEntryContext = createSelector(
  selectMoneyAccountAccessBlockReason,
  selectIsMoneyOnboardingRedirectNeeded,
  (accessBlockReason, isOnboardingRedirectNeeded): MoneyEntryContext => ({
    accessBlockReason,
    isOnboardingRedirectNeeded,
  }),
);
