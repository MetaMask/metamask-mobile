import { createSelector } from 'reselect';
import {
  selectMoneyOnboardingSeen,
  selectMoneySplashSeen,
} from '../../../../reducers/user/selectors';
import {
  selectMoneyOnboardingStepperAnimationEnabled,
  selectMoneySplashEnabled,
} from '../../../../selectors/featureFlagController/moneyAccount';
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

/**
 * Resolves whether a Money CTA must show the intro splash first.
 */
export const selectIsMoneySplashRedirectNeeded = createSelector(
  selectMoneySplashSeen,
  selectMoneySplashEnabled,
  (hasSeenSplash, isSplashEnabled) => isSplashEnabled && !hasSeenSplash,
);

/**
 * Context for Money CTAs on token, Explore and Earn surfaces. The splash
 * replaces the Rive onboarding on those surfaces while it is enabled; the Money
 * tab and deeplinks keep the base context.
 */
export const selectMoneyCtaEntryContext = createSelector(
  selectMoneyEntryContext,
  selectIsMoneySplashRedirectNeeded,
  selectMoneySplashEnabled,
  (
    entryContext,
    isSplashRedirectNeeded,
    isSplashEnabled,
  ): MoneyEntryContext => ({
    ...entryContext,
    isOnboardingRedirectNeeded:
      !isSplashEnabled && entryContext.isOnboardingRedirectNeeded,
    isSplashRedirectNeeded,
  }),
);
