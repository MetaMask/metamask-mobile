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
import { openPredictWithdrawPayConfirmation } from '../../../flows/predict.flow.js';
import { resolveE2EWaitTimeoutMs } from '../../../framework/Constants.js';
import { Assertions } from '../../../framework/index.js';
import TransactionPayConfirmation from '../../../page-objects/Confirmation/TransactionPayConfirmation.js';
import PayWithModal from '../../../page-objects/Confirmation/PayWithModal.js';
import PayWithModalTokenPicker from '../../../page-objects/Confirmation/PayWithModalTokenPicker.js';
import FooterActions from '../../../page-objects/Browser/Confirmations/FooterActions.js';
import PredictHome from '../../../page-objects/Predict/PredictHome.js';
import ActivitiesView from '../../../page-objects/Transactions/ActivitiesView.js';
import WalletView from '../../../page-objects/wallet/WalletView.js';
import ActivityDetails from '../../../page-objects/Transactions/ActivityDetails.js';
import { setupRemoteFeatureFlagsMock } from '../../../api-mocking/helpers/remoteFeatureFlagsHelper.js';
import { predictWithdrawFlags } from '../../../api-mocking/mock-responses/pay/feature-flag-mocks.js';
import { PREDICT_WITHDRAW_MOCKS } from '../../../api-mocking/mock-responses/pay/predict-withdraw-mocks.js';
import { applyTokenHoldingsMocks } from '../../../api-mocking/mock-responses/pay/holdings-mocks.js';

const PREDICT_WITHDRAW_HOLDINGS: TokenHolding[] = [
  // Shim: the app resolves Polygon's ticker as MATIC (fixture nativeCurrency)
  // and calculateGasCost throws without a MATIC rate; POL holdings seed POL only.
  { ...PREDEFINED_TOKENS.POLYGON.POL, symbol: 'MATIC', amount: '1' },
  { ...PREDEFINED_TOKENS.POLYGON.PUSD, amount: '100' },
  { ...PREDEFINED_TOKENS.POLYGON.POL, amount: '1' },
];

appiumTest.describe(SmokeConfirmations('MM Pay - Predict withdraw'), () => {
  appiumTest.describe.configure({ timeout: 250_000 });

  appiumTest(
    'withdraws Predict balance to Polygon pUSD',
    async ({ driver: _driver, currentDeviceDetails }) => {
      await withFixtures(
        {
          fixture: new FixtureBuilder()
            .withPolygon()
            // Override ticker MATIC (stale, from withPolygon) with POL so the
            // app's native-fiat lookup hits the seeded POL rate.
            .withNetworkController({
              type: 'rpc',
              chainId: '0x89',
              rpcUrl: 'https://polygon-mainnet.infura.io/v3/mock',
              nickname: 'Polygon',
              ticker: 'POL',
            })
            .withDisabledSmartTransactions()
            .withTokenHoldings(PREDICT_WITHDRAW_HOLDINGS)
            .build(),
          currentDeviceDetails,
          restartDevice: true,
          disableLocalNodes: true,
          testSpecificMock: async (mockServer: Mockttp) => {
            await setupRemoteFeatureFlagsMock(
              mockServer,
              predictWithdrawFlags(),
            );
            await applyTokenHoldingsMocks(
              mockServer,
              PREDICT_WITHDRAW_HOLDINGS,
            );
            await PREDICT_WITHDRAW_MOCKS(mockServer);
          },
        },
        async () => {
          await loginToAppPlaywright({ scenarioType: 'e2e' });

          await openPredictWithdrawPayConfirmation();

          await TransactionPayConfirmation.verifyAvailableBalanceVisible();
          await TransactionPayConfirmation.tapPayWithRow();

          await PayWithModal.tapOtherAssets();
          await PayWithModalTokenPicker.tapAssetOnNetwork('pUSD', '0x89');

          await TransactionPayConfirmation.verifyPayWithSymbol('pUSD');
          await TransactionPayConfirmation.enterAmountAndContinue('5');
          await TransactionPayConfirmation.verifyTransactionFeeVisible();
          await FooterActions.tapConfirmAndExpectConfirmationUnmount();

          await PredictHome.tapBackButton();
          await waitForWalletHomePlaywright(resolveE2EWaitTimeoutMs(20_000));
          await WalletView.tapActivityButton();

          await ActivitiesView.tapTypeFilterChip();
          await ActivitiesView.tapTypeFilterOption('predictions');

          await ActivitiesView.verifyActivityItemLabelAndAmount(
            'Prediction withdrawal',
            '-$5',
          );
          await ActivitiesView.tapOnActivityItemByLabel(
            'Prediction withdrawal',
          );

          await Assertions.expectElementToBeVisible(ActivityDetails.screen, {
            description: 'Activity details screen should be visible',
          });

          await ActivityDetails.verifyStatus('Confirmed');
        },
      );
    },
  );
});
