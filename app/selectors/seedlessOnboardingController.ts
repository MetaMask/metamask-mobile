import { createSelector } from 'reselect';
import { RootState } from '../reducers';
import { SeedlessOnboardingControllerState } from '@metamask/seedless-onboarding-controller';

const selectSeedlessOnboardingControllerState = (state: RootState) =>
  state.engine?.backgroundState.SeedlessOnboardingController;

const selectOnboardingSeedlessState = (state: RootState) =>
  state.onboarding?.seedless;

export const selectSeedlessOnboardingUserId = createSelector(
  selectSeedlessOnboardingControllerState,
  (seedlessOnboardingControllerState: SeedlessOnboardingControllerState) =>
    seedlessOnboardingControllerState?.userId,
);

export const selectSeedlessOnboardingUserEmail = createSelector(
  selectSeedlessOnboardingControllerState,
  (seedlessOnboardingControllerState: SeedlessOnboardingControllerState) =>
    seedlessOnboardingControllerState?.socialLoginEmail,
);

export const selectSeedlessOnboardingAuthConnection = createSelector(
  selectSeedlessOnboardingControllerState,
  (seedlessOnboardingControllerState: SeedlessOnboardingControllerState) =>
    seedlessOnboardingControllerState?.authConnection,
);

export const selectSeedlessOnboardingLoginFlow = createSelector(
  selectSeedlessOnboardingControllerState,
  (seedlessOnboardingControllerState: SeedlessOnboardingControllerState) =>
    seedlessOnboardingControllerState?.vault != null,
);

export const selectIsSeedlessPasswordOutdated = createSelector(
  selectSeedlessOnboardingControllerState,
  (seedlessOnboardingControllerState: SeedlessOnboardingControllerState) =>
    seedlessOnboardingControllerState?.passwordOutdatedCache?.isExpiredPwd ===
    true,
);

export const selectPendingSocialLoginMarketingConsentBackfill = createSelector(
  selectOnboardingSeedlessState,
  (seedlessState) =>
    seedlessState?.pendingSocialLoginMarketingConsentBackfill ?? null,
);
