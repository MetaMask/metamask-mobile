import FixtureBuilder from './framework/fixtures/FixtureBuilder';
import { withFixtures } from './framework/fixtures/FixtureHelper';
import { loginToApp } from './viewHelper';
import TestHelpers from './helpers';
import { DappVariants } from './framework/Constants';
import { remoteFeatureMultichainAccountsAccountDetailsV2 } from './api-mocking/mock-responses/feature-flags-mocks';
import { setupRemoteFeatureFlagsMock } from './api-mocking/helpers/remoteFeatureFlagsHelper';

export async function withSolanaAccountEnabled(
  {
    solanaAccountPermitted = true,
    evmAccountPermitted,
    dappVariant,
  }: {
    solanaAccountPermitted?: boolean;
    evmAccountPermitted?: boolean;
    dappVariant?: DappVariants;
  },
  test: () => Promise<void>,
) {
  let fixtureBuilder = new FixtureBuilder();

  if (solanaAccountPermitted) {
    fixtureBuilder = fixtureBuilder.withSolanaAccountPermission();
  }
  if (evmAccountPermitted) {
    fixtureBuilder = fixtureBuilder.withChainPermission(['0x1']);
  }
  const fixtures = fixtureBuilder.build();

  await withFixtures(
    {
      fixture: fixtures,
      dapps: [
        {
          dappVariant: dappVariant || DappVariants.SOLANA_TEST_DAPP, // Default to the Solana test dapp if no variant is provided
        },
      ],
      restartDevice: true,
      testSpecificMock: async (mockServer) => {
        await setupRemoteFeatureFlagsMock(
          mockServer,
          remoteFeatureMultichainAccountsAccountDetailsV2(true),
        );
      },
    },
    async () => {
      await TestHelpers.reverseServerPort();
      await loginToApp();

      await test();
    },
  );
}
