import { Mockttp } from 'mockttp';

import FixtureBuilder from '../../../tests/framework/fixtures/FixtureBuilder';
import { withFixtures } from '../../../tests/framework/fixtures/FixtureHelper';

import { createOAuthMockttpService } from '../../../tests/api-mocking/seedless-onboarding';
import { E2EOAuthHelpers } from '../../module-mocking/oauth';
import { SmokeWalletPlatform } from '../../tags';
import {
  completeGoogleNewUserOnboarding,
  lockApp,
  resetWallet,
  loginWithPassword,
  FIXTURE_PASSWORD,
} from './utils';

describe(SmokeWalletPlatform('Google Login - Reset Wallet'), () => {
  beforeAll(async () => {
    jest.setTimeout(300000);
  });

  beforeEach(async () => {
    E2EOAuthHelpers.reset();
    E2EOAuthHelpers.configureGoogleNewUser();
  });

  it('onboards with Google login, locks, and resets the wallet', async () => {
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

        // Reset the wallet
        await resetWallet();
      },
    );
  });
});
