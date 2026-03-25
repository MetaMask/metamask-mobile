import Engine from '../Engine';

/**
 * Revokes OAuth refresh tokens queued by SeedlessOnboardingController (e.g. after rotation).
 */
export const revokePendingSeedlessRefreshTokens = async (): Promise<void> => {
  const { SeedlessOnboardingController } = Engine.context;
  await SeedlessOnboardingController.revokePendingRefreshTokens();
};
