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
import TransactionPayConfirmation from '../../../page-objects/Confirmation/TransactionPayConfirmation.js';
import PayWithModal from '../../../page-objects/Confirmation/PayWithModal.js';
import PayWithModalTokenPicker from '../../../page-objects/Confirmation/PayWithModalTokenPicker.js';
import FooterActions from '../../../page-objects/Browser/Confirmations/FooterActions.js';
import TabBarComponent from '../../../page-objects/wallet/TabBarComponent.js';
import WalletActionsBottomSheet from '../../../page-objects/wallet/WalletActionsBottomSheet.js';
import PredictMarketList from '../../../page-objects/Predict/PredictMarketList.js';
import ActivitiesView from '../../../page-objects/Transactions/ActivitiesView.js';
import ActivityDetails from '../../../page-objects/Transactions/ActivityDetails.js';
import { setupRemoteFeatureFlagsMock } from '../../../api-mocking/helpers/remoteFeatureFlagsHelper.js';
import { predictDepositFlags } from '../../../api-mocking/mock-responses/pay/feature-flag-mocks.js';
import { PREDICT_DEPOSIT_MOCKS } from '../../../api-mocking/mock-responses/pay/predict-deposit-mocks.js';
import { applyTokenHoldingsMocks } from '../../../api-mocking/mock-responses/pay/holdings-mocks.js';

const PREDICT_HOLDINGS: TokenHolding[] = [
  { ...PREDEFINED_TOKENS.ETHEREUM.USDC, amount: '500' },
  { ...PREDEFINED_TOKENS.ETHEREUM.ETH, amount: '1' },
  // Keep these to have fiat rates to be available
  { ...PREDEFINED_TOKENS.POLYGON.POL, amount: '0' },
  { ...PREDEFINED_TOKENS.POLYGON.PUSD, amount: '0' },
];

appiumTest.describe(SmokeConfirmations('MM Pay - Predict deposit'), () => {
  appiumTest.describe.configure({ timeout: 2500000 });

  appiumTest(
    'deposits $50 with Mainnet USDC, verifies the MM Pay quote, confirms the transaction, and sees it in predict activity',
    async ({ driver: _driver, currentDeviceDetails }) => {
      await withFixtures(
        {
          fixture: new FixtureBuilder()
            .withPolygon()
            .withDisabledSmartTransactions()
            .withTokenHoldings(PREDICT_HOLDINGS)
            .build(),
          currentDeviceDetails,
          restartDevice: true,
          disableLocalNodes: true,
          testSpecificMock: async (mockServer: Mockttp) => {
            await setupRemoteFeatureFlagsMock(
              mockServer,
              predictDepositFlags(),
            );
            await applyTokenHoldingsMocks(mockServer, PREDICT_HOLDINGS);
            await PREDICT_DEPOSIT_MOCKS(mockServer);
          },
        },
        async () => {
          await loginToAppPlaywright({ scenarioType: 'e2e' });

          await TabBarComponent.tapActions();
          await WalletActionsBottomSheet.tapPredictButton();
          await PredictMarketList.waitForScreenToDisplay({
            description: 'Predict market list should be visible',
          });
          await PredictMarketList.tapAddFundsButton();

          await TransactionPayConfirmation.expectKeyboardLoaded();
          await TransactionPayConfirmation.expectPayWithRowLoaded();
          await TransactionPayConfirmation.tapPayWithRow();

          await PayWithModal.tapOtherAssets();
          await PayWithModalTokenPicker.tapAssetOnNetwork('USDC', '0x1');

          await TransactionPayConfirmation.enterAmountAndContinue('50');
          await TransactionPayConfirmation.verifyTransactionFeeVisible();
          await FooterActions.tapConfirmAndExpectConfirmationUnmount();

          await PredictMarketList.tapBackButton();
          await WalletView.tapActivityButton();

          await ActivitiesView.tapTypeFilterChip();
          await ActivitiesView.selectTypeFilterOptionSafe('predictions');

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
