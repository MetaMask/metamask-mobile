import Engine from '../Engine';

export const renewSeedlessControllerRefreshTokens = async (
  password: string,
) => {
  const { SeedlessOnboardingController } = Engine.context;
  await SeedlessOnboardingController.renewRefreshToken(password);
  await SeedlessOnboardingController.revokePendingRefreshTokens();
};
