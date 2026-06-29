import { withFixtures } from '../../framework/fixtures/FixtureHelper';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder';
import { SmokePerps } from '../../tags';
import { loginToApp } from '../../flows/wallet.flow';
import {
  PERPS_ARBITRUM_MOCKS,
  mockPerpsGeolocation,
} from '../../api-mocking/mock-responses/perps-arbitrum-mocks';
import { RampsRegions, RampsRegionsEnum } from '../../framework/Constants';
import Assertions from '../../framework/Assertions';
import Matchers from '../../framework/Matchers';
import Gestures from '../../framework/Gestures';
import Utilities from '../../framework/Utilities';
import WalletView from '../../page-objects/wallet/WalletView';
import TransactionPayConfirmation from '../../page-objects/Confirmation/TransactionPayConfirmation';
import { setupRemoteFeatureFlagsMock } from '../../api-mocking/helpers/remoteFeatureFlagsHelper';
import { PerpsMarketBalanceActionsSelectorsIDs } from '../../../app/components/UI/Perps/Perps.testIds';
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

        // Open the Perps home. Do NOT tap into the "Explore crypto" markets
        // section — its header navigates to the market list, away from the
        // balance-actions surface that hosts the Withdraw CTA.
        await WalletView.scrollAndTapPerpsSection();

        const withdrawButton = Matchers.getElementByID(
          PerpsMarketBalanceActionsSelectorsIDs.WITHDRAW_BUTTON,
        );

        // The Withdraw CTA only mounts once the live Perps account hydrates and
        // the balance is non-empty (the empty/loading state shows Add funds
        // only), so allow time for the account stream to land.
        await Utilities.executeWithRetry(
          async () => {
            const isVisible = await Utilities.isElementVisible(
              withdrawButton,
              2000,
            );
            if (!isVisible) {
              throw new Error('Perps Withdraw CTA is not visible yet');
            }
          },
          { interval: 1000, timeout: 30000 },
        );

        // The first tap can happen while Perps is still settling, so retry until
        // the MetaMask Pay custom-amount confirmation is reached (this also
        // proves we are NOT on the legacy PerpsWithdrawView).
        await Utilities.executeWithRetry(
          async () => {
            await Gestures.waitAndTap(withdrawButton, {
              elemDescription: 'Perps Withdraw button',
            });
            await Assertions.expectElementToBeVisible(
              TransactionPayConfirmation.keyboardContainer,
              {
                description:
                  'MetaMask Pay withdraw confirmation reached after tapping Withdraw',
                timeout: 5000,
              },
            );
          },
          { interval: 1000, timeout: 30000 },
        );

        // New-flow marker absent from the legacy PerpsWithdrawView: the available
        // Perps balance row rendered on the shared CustomAmount confirmation.
        // iOS matches by.text(regex) against the whole string, so the pattern
        // must span the trailing balance amount (e.g. "Available balance: $8,000").
        await Assertions.expectElementToBeVisible(
          Matchers.getElementByText(/Available balance: \$[0-9,.]+/u),
          {
            description: 'Available Perps balance row visible',
            timeout: 15000,
          },
        );

        logger.info(
          '🎉 E2E Mock: Perps withdraw-to-any-token confirmation reached',
        );
      },
    );
  });
});
