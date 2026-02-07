import { Mockttp } from 'mockttp';

import FixtureBuilder from '../../../tests/framework/fixtures/FixtureBuilder';
import { withFixtures } from '../../../tests/framework/fixtures/FixtureHelper';

import { createOAuthMockttpService } from '../../../tests/api-mocking/seedless-onboarding';
import { E2EOAuthHelpers } from '../../module-mocking/oauth';
import { SmokeWalletPlatform } from '../../tags';
import { completeAppleNewUserOnboarding } from './utils';

describe(SmokeWalletPlatform('Apple Login - New User'), () => {
  beforeAll(async () => {
    jest.setTimeout(300000);
  });

  beforeEach(async () => {
    E2EOAuthHelpers.reset();
    E2EOAuthHelpers.configureAppleNewUser();
  });

  it('creates a new wallet with Apple login', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder({ onboarding: true }).build(),
        restartDevice: true,
        testSpecificMock: async (mockServer: Mockttp) => {
          const oAuthMockttpService = createOAuthMockttpService();
          oAuthMockttpService.configureAppleNewUser();
          await oAuthMockttpService.setup(mockServer);
        },
      },
      async () => {
        await completeAppleNewUserOnboarding();
      },
    );
  });
});
