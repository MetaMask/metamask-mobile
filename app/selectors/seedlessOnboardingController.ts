import { createSelector } from 'reselect';
import { RootState } from '../reducers';
import { SeedlessOnboardingControllerState } from '@metamask/seedless-onboarding-controller';

const selectSeedlessOnboardingControllerState = (state: RootState) =>
  state.engine?.backgroundState.SeedlessOnboardingController;

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

export const selectProfilePairingToken = createSelector(
  selectSeedlessOnboardingControllerState,
  (seedlessOnboardingControllerState: SeedlessOnboardingControllerState) =>
    seedlessOnboardingControllerState?.profilePairingToken,
);

// Pairing status now lives on the primary SRP's social-backup record.
// See controller commit `2262b7cbe` (PR #8652).
export const selectProfilePairingStatus = createSelector(
  selectSeedlessOnboardingControllerState,
  (seedlessOnboardingControllerState: SeedlessOnboardingControllerState) =>
    seedlessOnboardingControllerState?.socialBackupsMetadata?.[0]
      ?.profilePairingStatus,
);
