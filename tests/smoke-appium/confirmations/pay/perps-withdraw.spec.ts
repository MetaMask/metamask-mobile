import { Mockttp } from 'mockttp';
import { test as appiumTest } from '../../../framework/fixtures/playwright/index.js';
import { withFixtures } from '../../../framework/fixtures/FixtureHelper.js';
import FixtureBuilder from '../../../framework/fixtures/FixtureBuilder.js';
import {
  PREDEFINED_TOKENS,
  type TokenHolding,
} from '../../../framework/fixtures/mmpay-token-holdings-registry.js';
import { SmokeConfirmations } from '../../../tags.js';
import {
  loginToAppPlaywright,
  waitForWalletHomePlaywright,
} from '../../../flows/wallet.flow.js';
import { openPerpsWithdrawPayConfirmation } from '../../../flows/perps.flow.js';
import { resolveE2EWaitTimeoutMs } from '../../../framework/Constants.js';
import { Assertions, Utilities } from '../../../framework/index.js';
import WalletView from '../../../page-objects/wallet/WalletView.js';
import PerpsHomeView from '../../../page-objects/Perps/PerpsHomeView.js';
import TransactionPayConfirmation from '../../../page-objects/Confirmation/TransactionPayConfirmation.js';
import PayWithModal from '../../../page-objects/Confirmation/PayWithModal.js';
import PayWithModalTokenPicker from '../../../page-objects/Confirmation/PayWithModalTokenPicker.js';
import FooterActions from '../../../page-objects/Browser/Confirmations/FooterActions.js';
import ActivitiesView from '../../../page-objects/Transactions/ActivitiesView.js';
import ActivityDetails from '../../../page-objects/Transactions/ActivityDetails.js';
import { setupRemoteFeatureFlagsMock } from '../../../api-mocking/helpers/remoteFeatureFlagsHelper.js';
import { perpsWithdrawFlags } from '../../../api-mocking/mock-responses/pay/feature-flag-mocks.js';
import { PERPS_WITHDRAW_MOCKS } from '../../../api-mocking/mock-responses/pay/perps-withdraw-mocks.js';
import { applyTokenHoldingsMocks } from '../../../api-mocking/mock-responses/pay/holdings-mocks.js';

const PERPS_WITHDRAW_HOLDINGS: TokenHolding[] = [
  { ...PREDEFINED_TOKENS.ARBITRUM.ETH, amount: '0.01' },
  { ...PREDEFINED_TOKENS.ARBITRUM.USDC, amount: '500' },
  // Keep these to have fiat rates available
  { ...PREDEFINED_TOKENS.ETHEREUM.ETH, amount: '0' },
  { ...PREDEFINED_TOKENS.ETHEREUM.USDC, amount: '0' },
];

appiumTest.describe(SmokeConfirmations('MM Pay - Perps withdraw'), () => {
  appiumTest.describe.configure({ timeout: 250_000 });

  appiumTest(
    'withdraws Perps balance to Arbitrum ETH',
    async ({ driver: _driver, currentDeviceDetails }) => {
      await withFixtures(
        {
          fixture: new FixtureBuilder()
            .withPerpsProfile('no-positions')
            .withPerpsFirstTimeUser(false)
            .withDisabledSmartTransactions()
            .withNetworkController({
              type: 'rpc',
              chainId: '0xa4b1',
              rpcUrl: 'https://arb1.arbitrum.io/rpc',
              nickname: 'Arbitrum One',
              ticker: 'ETH',
            })
            .withTokenHoldings(PERPS_WITHDRAW_HOLDINGS)
            .withDetectedGeolocation('FR')
            .build(),
          currentDeviceDetails,
          restartDevice: true,
          disableLocalNodes: true,
          testSpecificMock: async (mockServer: Mockttp) => {
            await setupRemoteFeatureFlagsMock(mockServer, perpsWithdrawFlags());
            await applyTokenHoldingsMocks(mockServer, PERPS_WITHDRAW_HOLDINGS);
            await PERPS_WITHDRAW_MOCKS(mockServer);
          },
        },
        async () => {
          await loginToAppPlaywright({ scenarioType: 'e2e' });

          await openPerpsWithdrawPayConfirmation();

          await TransactionPayConfirmation.verifyAvailableBalanceVisible();

          await TransactionPayConfirmation.tapPayWithRow();
          await PayWithModal.tapOtherAssets();
          await PayWithModalTokenPicker.tapAssetOnNetwork('ETH', '0xa4b1');

          await TransactionPayConfirmation.verifyPayWithSymbol('ETH');

          await TransactionPayConfirmation.enterAmountAndContinue('5');
          await TransactionPayConfirmation.verifyTransactionFeeVisible();

          await FooterActions.tapConfirmAndExpectConfirmationUnmount();

          // Withdraw confirmations dismiss the whole Perps stack straight to
          // wallet home (unlike deposits, which return to Perps home): only go
          // back via Perps home when its back button is actually present.
          if (await Utilities.isElementVisible(PerpsHomeView.backHome, 5000)) {
            await PerpsHomeView.tapBackHomeButton();
          }
          await waitForWalletHomePlaywright(resolveE2EWaitTimeoutMs(20_000));
          await WalletView.tapActivityButton();

          await ActivitiesView.tapTypeFilterChip();
          await ActivitiesView.tapTypeFilterOption('perps');

          await ActivitiesView.tapPerpsFilterChip();
          await ActivitiesView.tapPerpsFilterOption('deposit');

          await ActivitiesView.verifyActivityItemLabelAndAmount(
            'Perps withdrawal',
            '-$5',
          );

          await ActivitiesView.tapOnActivityItemByLabel('Perps withdrawal');

          await Assertions.expectElementToBeVisible(ActivityDetails.screen, {
            description: 'Activity details screen should be visible',
          });
          await ActivityDetails.verifyStatus('Confirmed');
        },
      );
    },
  );
});
