import FixtureBuilder from './framework/fixtures/FixtureBuilder';
import { withFixtures } from './framework/fixtures/FixtureHelper';
import { loginToApp } from './viewHelper';
import TestHelpers from './helpers';
import {
  remoteFeatureMultichainAccountsAccountDetailsV2,
  remoteFeatureFlagTronAccounts,
} from './api-mocking/mock-responses/feature-flags-mocks';
import { setupRemoteFeatureFlagsMock } from './api-mocking/helpers/remoteFeatureFlagsHelper';

export async function withTronAccountEnabled(test: () => Promise<void>) {
  const fixtureBuilder = new FixtureBuilder();

  const fixtures = fixtureBuilder.build();

  await withFixtures(
    {
      fixture: fixtures,
      restartDevice: true,
      testSpecificMock: async (mockServer) => {
        await setupRemoteFeatureFlagsMock(mockServer, {
          ...remoteFeatureMultichainAccountsAccountDetailsV2(true),
          ...remoteFeatureFlagTronAccounts(true),
        });
      },
    },
    async () => {
      await TestHelpers.reverseServerPort();
      await loginToApp();

      await test();
    },
  );
}
