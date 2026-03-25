import Engine from '../Engine';

const delay = (ms: number) =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });

/**
 * Revokes OAuth refresh tokens queued by SeedlessOnboardingController (e.g. after rotation).
 */
export const revokePendingSeedlessRefreshTokens = async (): Promise<void> => {
  const { SeedlessOnboardingController } = Engine.context;

  // delay to allow new refresh token to be persisted
  await delay(5_000);
  await SeedlessOnboardingController.revokePendingRefreshTokens();
};
