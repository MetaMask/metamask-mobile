import Engine from '../Engine';

// delay function
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Renews the refresh tokens for the seedless onboarding controller and revokes the pending revoke tokens.
 * @param password - The password to use to unlock seedless controller in order to renew the refresh tokens.
 * @returns A promise that resolves when the refresh tokens have been renewed.
 */
export const renewSeedlessControllerRefreshTokens = async (
  password: string,
) => {
  const { SeedlessOnboardingController } = Engine.context;
  await SeedlessOnboardingController.renewRefreshToken(password);

  // delay to allow new refresh token to be persisted
  await delay(15_000);
  await SeedlessOnboardingController.revokePendingRefreshTokens();
};
