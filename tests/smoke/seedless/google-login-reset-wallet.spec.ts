import { Mockttp } from 'mockttp';

import FixtureBuilder from '../../framework/fixtures/FixtureBuilder';
import { withFixtures } from '../../framework/fixtures/FixtureHelper';

import { createOAuthMockttpService } from '../../api-mocking/seedless-onboarding';
import { E2EOAuthHelpers } from '../../module-mocking/oauth';
import { SmokeSeedlessOnboarding } from '../../tags';
import {
  completeGoogleNewUserOnboarding,
  lockApp,
  resetWallet,
  loginWithPassword,
  FIXTURE_PASSWORD,
} from './utils';
import { googleLoginResetWalletAnalyticsExpectations } from '../../helpers/analytics/expectations/google-login-reset-wallet.analytics';

describe(SmokeSeedlessOnboarding('Google Login - Reset Wallet'), () => {
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
        // Reset-wallet events fire on both platforms regardless of how the
        // wallet was set up (full onboarding on Android vs fixture on iOS).
        analyticsExpectations: googleLoginResetWalletAnalyticsExpectations,
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
