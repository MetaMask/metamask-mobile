import Engine from '../Engine';

/**
 * Revokes OAuth refresh tokens that SeedlessOnboardingController has queued for
 * revocation (e.g. after an internal refresh-token rotation).
 *
 * The previous implementation also called `SeedlessOnboardingController.renewRefreshToken(password)`
 * and waited 15s before revoking. That public `renewRefreshToken` API was removed in
 * `@metamask/seedless-onboarding-controller` v9 — rotation runs inside the controller
 * (via `rotateRefreshToken` on JWT refresh). The delay only existed to wait after that
 * manual renew; it is no longer needed.
 *
 * @param _password - Unused; kept so `Authentication.loginVaultCreation` can pass the same argument without churn (wallet is already unlocked via `submitPassword`).
 */
export const revokePendingSeedlessRefreshTokens = async (
  _password: string,
): Promise<void> => {
  const { SeedlessOnboardingController } = Engine.context;
  await SeedlessOnboardingController.revokePendingRefreshTokens();
};
