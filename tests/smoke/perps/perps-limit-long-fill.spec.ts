import { withFixtures } from '../../framework/fixtures/FixtureHelper';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder';
import { SmokePerps } from '../../tags';
import { loginToApp } from '../../flows/wallet.flow';
import {
  PERPS_ARBITRUM_MOCKS,
  mockPerpsGeolocation,
} from '../../api-mocking/mock-responses/perps-arbitrum-mocks';
import { placeLimitOrderAtPreset } from '../../flows/perps.flow';
import PerpsMarketDetailsView from '../../page-objects/Perps/PerpsMarketDetailsView';
import Utilities from '../../framework/Utilities';
import { RampsRegions, RampsRegionsEnum } from '../../framework/Constants';
import PerpsE2EModifiers from '../../helpers/perps/perps-modifiers';
import { TestSuiteParams } from '../../framework/types';
import { Mockttp } from 'mockttp';
import { setupRemoteFeatureFlagsMock } from '../../api-mocking/helpers/remoteFeatureFlagsHelper';

describe(SmokePerps('Perps - ETH limit long fill'), () => {
  it('creates ETH limit long at Mid, shows open order, then fills after -15%', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder()
          .withPerpsProfile('no-positions')
          .withPerpsFirstTimeUser(false)
          .withAccountTreeController()
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
          .build(),
        restartDevice: true,
        permissions: { notifications: 'YES' },
        testSpecificMock: async (mockServer: Mockttp) => {
          await setupRemoteFeatureFlagsMock(mockServer, {});
          await PERPS_ARBITRUM_MOCKS(mockServer);
          await mockPerpsGeolocation(
            mockServer,
            RampsRegions[RampsRegionsEnum.SPAIN],
          );
        },
        useCommandQueueServer: true,
      },
      async ({ commandQueueServer }: TestSuiteParams) => {
        if (!commandQueueServer) {
          throw new Error('Command queue server not found');
        }
        await loginToApp();

        await device.disableSynchronization();

        await placeLimitOrderAtPreset('ETH', 'long', 'Mid');

        await PerpsMarketDetailsView.expectCompactOpenOrderVisible({
          direction: 'long',
        });

        await PerpsE2EModifiers.updateMarketPriceServer(
          commandQueueServer,
          'ETH',
          '2125.00',
        );

        await Utilities.executeWithRetry(
          async () => {
            await PerpsMarketDetailsView.expectClosePositionButtonVisible();
          },
          {
            interval: 1000,
            timeout: 60000,
            description: 'wait for limit long to fill into an open position',
          },
        );
      },
    );
  });
});
