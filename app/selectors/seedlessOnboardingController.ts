import { createSelector } from 'reselect';
import { RootState } from '../reducers';
import { SeedlessOnboardingControllerState } from '@metamask/seedless-onboarding-controller';
import { AuthConnection } from '../core/OAuthService/OAuthInterface';

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
    seedlessOnboardingControllerState?.authConnection as
      | AuthConnection
      | undefined,
);

export const selectSeedlessOnboardingLoginFlow = createSelector(
  selectSeedlessOnboardingControllerState,
  (seedlessOnboardingControllerState: SeedlessOnboardingControllerState) =>
    seedlessOnboardingControllerState?.vault != null,
);

/**
 * `true` when the vault password is recovery-local (not yet the global
 * password). `false` when missing or the password is global. Settings
 * change-password uses this for MFA-1012: global → Face ID alone;
 * recovery-local → 2SV first.
 */
export const selectSeedlessIsLocalPassword = createSelector(
  selectSeedlessOnboardingControllerState,
  (seedlessOnboardingControllerState: SeedlessOnboardingControllerState) =>
    seedlessOnboardingControllerState?.isLocalPassword === true,
);

export const selectIsSeedlessPasswordOutdated = createSelector(
  selectSeedlessOnboardingControllerState,
  (seedlessOnboardingControllerState: SeedlessOnboardingControllerState) =>
    seedlessOnboardingControllerState?.passwordOutdatedCache?.isExpiredPwd ===
    true,
);
