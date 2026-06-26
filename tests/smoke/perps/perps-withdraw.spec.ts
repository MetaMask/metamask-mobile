import { withFixtures } from '../../framework/fixtures/FixtureHelper';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder';
import { SmokePerps } from '../../tags';
import { loginToApp } from '../../flows/wallet.flow';
import {
  PERPS_ARBITRUM_MOCKS,
  mockPerpsGeolocation,
} from '../../api-mocking/mock-responses/perps-arbitrum-mocks';
import {
  mockRelayQuote,
  mockRelayStatus,
} from '../../api-mocking/mock-responses/transaction-pay';
import { RampsRegions, RampsRegionsEnum } from '../../framework/Constants';
import Assertions from '../../framework/Assertions';
import Matchers from '../../framework/Matchers';
import Gestures from '../../framework/Gestures';
import Utilities from '../../framework/Utilities';
import WalletView from '../../page-objects/wallet/WalletView';
import PerpsHomeView from '../../page-objects/Perps/PerpsHomeView';
import TransactionPayConfirmation from '../../page-objects/Confirmation/TransactionPayConfirmation';
import FooterActions from '../../page-objects/Browser/Confirmations/FooterActions';
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

  it('reaches the MetaMask Pay withdraw confirmation and submits a withdrawal', async () => {
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
          // Bridge/relay quote + status power the MetaMask Pay review and submit.
          await mockRelayQuote(mockServer);
          await mockRelayStatus(mockServer);
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

        // Open Perps and tap Withdraw. With the perpsWithdraw post-quote flag
        // enabled this routes to the new MetaMask Pay confirmation.
        await WalletView.scrollAndTapPerpsSection();
        await PerpsHomeView.tapExploreCryptoIfVisible();

        const withdrawButton = Matchers.getElementByID(
          PerpsMarketBalanceActionsSelectorsIDs.WITHDRAW_BUTTON,
        );

        // Perps balance actions can show a skeleton briefly before the CTA lands.
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
          { interval: 1000, timeout: 20000 },
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

        // New-flow markers absent from the legacy view: available Perps balance
        // row and the receive-token selector (the "any token" capability).
        await Assertions.expectElementToBeVisible(
          Matchers.getElementByText(/Available balance:/u),
          {
            description: 'Available Perps balance row visible',
            timeout: 15000,
          },
        );
        await Assertions.expectElementToBeVisible(
          TransactionPayConfirmation.payWithRow,
          {
            description: 'Receive-token (pay-with) selector visible',
            timeout: 15000,
          },
        );

        // Enter an amount within the $8,000 mock balance and continue to review.
        await TransactionPayConfirmation.tapKeyboardAmount('100');
        await TransactionPayConfirmation.tapKeyboardContinueButton();

        // Review shows the bridge quote: a transaction fee and a "You'll receive"
        // amount (withdraw flows render ReceiveRow instead of TotalRow).
        await TransactionPayConfirmation.verifyTransactionFeeVisible();
        await TransactionPayConfirmation.verifyReceiveVisible();

        // Submit the withdrawal.
        await FooterActions.tapConfirmButton();

        // Submitting dismisses the confirmation and returns to Perps.
        await Utilities.executeWithRetry(
          async () => {
            await Assertions.expectElementToNotBeVisible(
              TransactionPayConfirmation.keyboardContainer,
              {
                description:
                  'MetaMask Pay withdraw confirmation dismissed after submit',
                timeout: 5000,
              },
            );
          },
          { interval: 1000, timeout: 30000 },
        );

        logger.info('🎉 E2E Mock: Perps withdraw-to-any-token submitted');
      },
    );
  });
});
