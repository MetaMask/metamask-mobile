import { Mockttp } from 'mockttp';

import FixtureBuilder from '../../framework/fixtures/FixtureBuilder';
import { withFixtures } from '../../framework/fixtures/FixtureHelper';

import { createOAuthMockttpService } from '../../api-mocking/seedless-onboarding';
import { E2EOAuthHelpers } from '../../module-mocking/oauth';
import { SmokeWalletPlatform } from '../../tags';
import { completeGoogleNewUserOnboarding, lockApp, unlockApp } from './utils';

describe(SmokeWalletPlatform('Google Login - Lock and Unlock'), () => {
  beforeAll(async () => {
    jest.setTimeout(300000);
  });

  beforeEach(async () => {
    E2EOAuthHelpers.reset();
    E2EOAuthHelpers.configureGoogleNewUser();
  });

  it('onboards with Google login, locks, and unlocks the app', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder({ onboarding: true }).build(),
        restartDevice: true,
        testSpecificMock: async (mockServer: Mockttp) => {
          const oAuthMockttpService = createOAuthMockttpService();
          oAuthMockttpService.configureGoogleNewUser();
          await oAuthMockttpService.setup(mockServer);
        },
      },
      async () => {
        // Complete user onboarding
        await completeGoogleNewUserOnboarding();

        // Lock the app
        await lockApp();

        // Unlock the app
        await unlockApp();
      },
    );
  });
});
