import { Mockttp } from 'mockttp';
import { test as appiumTest } from '../../../framework/fixtures/playwright/index.js';
import { withFixtures } from '../../../framework/fixtures/FixtureHelper.js';
import FixtureBuilder from '../../../framework/fixtures/FixtureBuilder.js';
import {
  PREDEFINED_TOKENS,
  type TokenHolding,
} from '../../../framework/fixtures/mmpay-token-holdings-registry.js';
import { SmokeConfirmations } from '../../../tags.js';
import { loginToAppPlaywright } from '../../../flows/wallet.flow.js';
import { Assertions } from '../../../framework/index.js';
import WalletView from '../../../page-objects/wallet/WalletView.js';
import PerpsHomeView from '../../../page-objects/Perps/PerpsHomeView.js';
import TransactionPayConfirmation from '../../../page-objects/Confirmation/TransactionPayConfirmation.js';
import PayWithModal from '../../../page-objects/Confirmation/PayWithModal.js';
import PayWithModalTokenPicker from '../../../page-objects/Confirmation/PayWithModalTokenPicker.js';
import FooterActions from '../../../page-objects/Browser/Confirmations/FooterActions.js';
import TabBarComponent from '../../../page-objects/wallet/TabBarComponent.js';
import WalletActionsBottomSheet from '../../../page-objects/wallet/WalletActionsBottomSheet.js';

import ActivitiesView from '../../../page-objects/Transactions/ActivitiesView.js';
import ActivityDetails from '../../../page-objects/Transactions/ActivityDetails.js';
import { setupRemoteFeatureFlagsMock } from '../../../api-mocking/helpers/remoteFeatureFlagsHelper.js';
import { perpsDepositFlags } from '../../../api-mocking/mock-responses/pay/feature-flag-mocks.js';
import { PERPS_DEPOSIT_MOCKS } from '../../../api-mocking/mock-responses/pay/perps-deposit-mocks.js';
import { applyTokenHoldingsMocks } from '../../../api-mocking/mock-responses/pay/holdings-mocks.js';

const PERPS_HOLDINGS: TokenHolding[] = [
  { ...PREDEFINED_TOKENS.ETHEREUM.USDC, amount: '500' },
  { ...PREDEFINED_TOKENS.ETHEREUM.ETH, amount: '1' },
  // Keep these to have fiat rates to be available
  { ...PREDEFINED_TOKENS.ARBITRUM.USDC, amount: '0' },
  { ...PREDEFINED_TOKENS.ARBITRUM.ETH, amount: '0' },
];

appiumTest.describe(SmokeConfirmations('MM Pay - Perps deposit'), () => {
  appiumTest.describe.configure({ timeout: 250_000 });

  appiumTest(
    'deposits $50 with Mainnet USDC, verifies the MM Pay quote, confirms the transaction, and sees it in perps activity',
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
            .withTokenHoldings(PERPS_HOLDINGS)
            .withDetectedGeolocation('FR')
            .build(),
          currentDeviceDetails,
          restartDevice: true,
          disableLocalNodes: true,
          testSpecificMock: async (mockServer: Mockttp) => {
            await setupRemoteFeatureFlagsMock(mockServer, perpsDepositFlags());
            await applyTokenHoldingsMocks(mockServer, PERPS_HOLDINGS);
            await PERPS_DEPOSIT_MOCKS(mockServer);
          },
        },
        async () => {
          await loginToAppPlaywright({ scenarioType: 'e2e' });

          await WalletView.scrollAndTapPerpsSection();
          await PerpsHomeView.tapExploreCryptoIfVisible();
          await PerpsHomeView.tapAddFundsButton();

          await TransactionPayConfirmation.expectKeyboardLoaded();
          await TransactionPayConfirmation.expectPayWithRowLoaded();
          await TransactionPayConfirmation.tapPayWithRow();

          await PayWithModal.tapOtherAssets();
          await PayWithModalTokenPicker.tapAssetOnNetwork('USDC', '0x1');

          await TransactionPayConfirmation.enterAmountAndContinue('50');
          await TransactionPayConfirmation.verifyTransactionFeeVisible();

          await FooterActions.tapConfirmAndExpectConfirmationUnmount();

          await PerpsHomeView.tapBackHomeButton();
          await WalletView.tapActivityButton();

          await ActivitiesView.tapTypeFilterChip();
          await ActivitiesView.tapTypeFilterOption('perps');

          await ActivitiesView.tapPerpsFilterChip();
          await ActivitiesView.tapPerpsFilterOption('deposit');

          await ActivitiesView.verifyActivityItemLabelAndAmount(
            'Account funded',
            '+$50',
          );

          await ActivitiesView.tapOnActivityItemByLabel('Account funded');

          await Assertions.expectElementToBeVisible(ActivityDetails.screen, {
            description: 'Activity details screen should be visible',
          });
          await ActivityDetails.verifyStatus('Confirmed');
        },
      );
    },
  );
});
