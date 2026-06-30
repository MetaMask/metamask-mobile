import { withFixtures } from '../../framework/fixtures/FixtureHelper';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder';
import { SmokePerps } from '../../tags';
import { loginToApp } from '../../flows/wallet.flow';
import { openPerpsWithdrawPayConfirmation } from '../../flows/perps.flow';
import {
  PERPS_ARBITRUM_MOCKS,
  mockPerpsGeolocation,
} from '../../api-mocking/mock-responses/perps-arbitrum-mocks';
import { RampsRegions, RampsRegionsEnum } from '../../framework/Constants';
import Assertions from '../../framework/Assertions';
import WalletView from '../../page-objects/wallet/WalletView';
import TransactionPayConfirmation from '../../page-objects/Confirmation/TransactionPayConfirmation';
import { setupRemoteFeatureFlagsMock } from '../../api-mocking/helpers/remoteFeatureFlagsHelper';
import { createLogger, LogLevel } from '../../framework/logger';
import { Mockttp } from 'mockttp';

const logger = createLogger({
  name: 'PerpsWithdrawSpec',
  level: LogLevel.INFO,
});

// Enables the Perps "withdraw to any token" (MetaMask Pay) flow. When this flag
// is on, the Perps Withdraw button routes to the shared CustomAmount
// confirmation instead of the legacy PerpsWithdrawView. The E2E remote-flag mock
// serves the unresolved LaunchDarkly config, so we provide the flat
// { default, overrides } shape that selectPayQuoteConfig reads directly.
const ENABLE_PERPS_WITHDRAW_ANY_TOKEN = {
  confirmations_pay_post_quote: {
    default: { enabled: true, tokens: {} },
    overrides: {
      perpsWithdraw: {
        enabled: true,
        tokens: {
          '0xa4b1': [
            '0x0000000000000000000000000000000000000000',
            '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
          ],
        },
      },
    },
  },
};

describe(SmokePerps('Perps - Withdraw to any token (MetaMask Pay)'), () => {
  beforeEach(() => {
    jest.setTimeout(150000);
  });

  it('reaches the MetaMask Pay withdraw confirmation', async () => {
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
          .withPopularNetworks()
          .build(),
        restartDevice: true,
        permissions: { notifications: 'YES' },
        testSpecificMock: async (mockServer: Mockttp) => {
          await setupRemoteFeatureFlagsMock(
            mockServer,
            ENABLE_PERPS_WITHDRAW_ANY_TOKEN,
          );
          await PERPS_ARBITRUM_MOCKS(mockServer);
          await mockPerpsGeolocation(
            mockServer,
            RampsRegions[RampsRegionsEnum.SPAIN],
          );
        },
      },
      async () => {
        logger.info(
          '💰 Using E2E mock balance: $10,000 total, $8,000 available',
        );
        await loginToApp();
        await device.disableSynchronization();
        await Assertions.expectElementToBeVisible(WalletView.container, {
          description: 'Wallet view visible',
        });

        // Open Perps and tap Withdraw until the MetaMask Pay custom-amount
        // confirmation is reached — proving the new withdraw-to-any-token flow,
        // not the legacy PerpsWithdrawView.
        await openPerpsWithdrawPayConfirmation();

        // New-flow marker absent from the legacy PerpsWithdrawView: the available
        // Perps balance row rendered on the shared CustomAmount confirmation.
        await TransactionPayConfirmation.verifyAvailableBalanceVisible();

        logger.info(
          '🎉 E2E Mock: Perps withdraw-to-any-token confirmation reached',
        );
      },
    );
  });
});
