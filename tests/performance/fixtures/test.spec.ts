import { test } from '../../framework/fixture/index';
import { loginToAppPlaywright } from '../../flows/wallet.flow';
import { withFixtures } from '../../framework/fixtures/FixtureHelper';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder';
import { Mockttp } from 'mockttp';
import { setupRemoteFeatureFlagsMock } from '../../api-mocking/helpers/remoteFeatureFlagsHelper';
import {
  mockPerpsGeolocation,
  PERPS_ARBITRUM_MOCKS,
} from '../../api-mocking/mock-responses/perps-arbitrum-mocks';
import { remoteFeatureFlagHomepageSectionsV1Enabled } from '../../api-mocking/mock-responses/feature-flags-mocks';
import { RampsRegions, RampsRegionsEnum } from '../../framework/Constants';
import { LocalNodeType } from '../../framework';
import { Hardfork } from '../../seeder/anvil-manager';
import PerpsE2EModifiers from '../../helpers/perps/perps-modifiers';

/* Scenario: Test Fixtures */
test('Test Fixtures', async ({ currentDeviceDetails, driver }, testInfo) => {
  await withFixtures(
    {
      fixture: new FixtureBuilder()
        .withPerpsProfile('no-positions')
        .withPerpsFirstTimeUser(false)
        .withNetworkController({
          type: 'rpc',
          chainId: '0xa4b1',
          rpcUrl: 'https://arb1.arbitrum.io/rpc',
          nickname: 'Arbitrum One',
          ticker: 'ETH',
        })
        .withTokensForAllPopularNetworks([
          {
            address: '0xff970a61a04b1ca14834a43f5de4533ebddb5cc8',
            symbol: 'USDC',
            decimals: 6,
            name: 'USD Coin',
            type: 'erc20',
          },
        ])
        .withPopularNetworks()
        .build(),
      restartDevice: true,
      currentDeviceDetails,
      testSpecificMock: async (mockServer: Mockttp) => {
        await setupRemoteFeatureFlagsMock(mockServer, {
          ...remoteFeatureFlagHomepageSectionsV1Enabled(),
        });
        await PERPS_ARBITRUM_MOCKS(mockServer);
        await mockPerpsGeolocation(
          mockServer,
          RampsRegions[RampsRegionsEnum.SPAIN],
        );
      },
      localNodeOptions: [
        {
          type: LocalNodeType.anvil,
          options: { hardfork: 'prague' as Hardfork },
        },
      ],
    },
    async () => {
      console.log('currentDeviceDetails', currentDeviceDetails);
      await loginToAppPlaywright({ scenarioType: 'e2e' });
      console.log('\n\n LOGIN COMPLETED - Go add funds \n\n');
      await new Promise((resolve) => setTimeout(resolve, 10000));
      await new Promise((resolve) => setTimeout(resolve, 10000));
      await new Promise((resolve) => setTimeout(resolve, 10000));
      await new Promise((resolve) => setTimeout(resolve, 10000));
      await new Promise((resolve) => setTimeout(resolve, 10000));
      await new Promise((resolve) => setTimeout(resolve, 10000));
    },
  );
});
