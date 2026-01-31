import { Mockttp } from 'mockttp';

import FixtureBuilder from '../../../tests/framework/fixtures/FixtureBuilder';
import { withFixtures } from '../../../tests/framework/fixtures/FixtureHelper';

import { createOAuthMockttpService } from '../../../tests/api-mocking/seedless-onboarding';
import { E2EOAuthHelpers } from '../../module-mocking/oauth';
import { SmokeWalletPlatform } from '../../tags';
import {
  completeGoogleNewUserOnboarding,
  lockApp,
  unlockApp,
  loginWithPassword,
  FIXTURE_PASSWORD,
} from './utils';

describe(SmokeWalletPlatform('Google Login - Lock and Unlock'), () => {
  beforeAll(async () => {
    jest.setTimeout(300000);
  });

  beforeEach(async () => {
    E2EOAuthHelpers.reset();
    E2EOAuthHelpers.configureGoogleNewUser();
  });

  it('onboards with Google login, locks, and unlocks the app', async () => {
    const isIOS = device.getPlatform() === 'ios';

    const fixture = isIOS
      ? new FixtureBuilder().build()
      : new FixtureBuilder({ onboarding: true }).build();

    await withFixtures(
      {
        fixture,
        restartDevice: true,
        testSpecificMock: async (mockServer: Mockttp) => {
          const oAuthMockttpService = createOAuthMockttpService();
          oAuthMockttpService.configureGoogleNewUser();
          await oAuthMockttpService.setup(mockServer);
        },
      },
      async () => {
        if (isIOS) {
          await loginWithPassword(FIXTURE_PASSWORD);
        } else {
          await completeGoogleNewUserOnboarding();
        }

        // Lock the app
        await lockApp();

        // Unlock the app
        await unlockApp(isIOS ? FIXTURE_PASSWORD : undefined);
      },
    );
  });
});
