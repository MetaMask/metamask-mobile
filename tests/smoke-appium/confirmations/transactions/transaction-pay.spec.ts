import { test as appiumTest } from '../../../framework/fixtures/playwright/index.js';
import { withFixtures } from '../../../framework/fixtures/FixtureHelper.js';
import FixtureBuilder from '../../../framework/fixtures/FixtureBuilder.js';
import { SmokeConfirmations } from '../../../tags.js';
import { loginToAppPlaywright } from '../../../flows/wallet.flow.js';
import {
  remoteFeatureEip7702,
  remoteFeatureFlagPredictEnabled,
} from '../../../api-mocking/mock-responses/feature-flags-mocks.js';
import { Mockttp } from 'mockttp';
import { setupRemoteFeatureFlagsMock } from '../../../api-mocking/helpers/remoteFeatureFlagsHelper.js';
import { POLYMARKET_COMPLETE_MOCKS } from '../../../api-mocking/mock-responses/polymarket/polymarket-mocks.js';
import PredictAddFunds from '../../../page-objects/Predict/PredictAddFunds.js';
import {
  mockRelayQuote,
  mockRelayStatus,
} from '../../../api-mocking/mock-responses/transaction-pay.js';
import { CHAIN_IDS } from '@metamask/transaction-controller';
import TransactionPayConfirmation from '../../../page-objects/Confirmation/TransactionPayConfirmation.js';
import FooterActions from '../../../page-objects/Browser/Confirmations/FooterActions.js';
import Gestures from '../../../framework/Gestures.js';
import TransactionDetailsModal from '../../../page-objects/Transactions/TransactionDetailsModal.js';
import TabBarComponent from '../../../page-objects/wallet/TabBarComponent.js';
import WalletActionsBottomSheet from '../../../page-objects/wallet/WalletActionsBottomSheet.js';
import ActivitiesView from '../../../page-objects/Transactions/ActivitiesView.js';
import PredictMarketList from '../../../page-objects/Predict/PredictMarketList.js';

// Skipped: Detox deposit case was it.skip pending Predict CLOB v2 activity
// stability. Un-skip after Appium validation on main-e2e.
appiumTest.describe.skip(SmokeConfirmations('Transaction Pay'), () => {
  appiumTest.describe.configure({ timeout: 2500000 });

  // TODO: Re-enable once Predict deposit activity is stable again after the
  // CLOB v2 migration work.
  appiumTest(
    'deposits to predict balance',
    async ({ driver: _driver, currentDeviceDetails }) => {
      await withFixtures(
        {
          fixture: new FixtureBuilder()
            .withPolygon()
            .withTokens(
              [
                {
                  address: '0x2791bca1f2de4661ed88a30c99a7a9449aa84174',
                  decimals: 6,
                  name: 'USD Coin (PoS)',
                  symbol: 'USDC.e',
                },
              ],
              CHAIN_IDS.POLYGON,
            )
            .build(),
          restartDevice: true,
          testSpecificMock,
          currentDeviceDetails,
        },
        async () => {
          await loginToAppPlaywright({ scenarioType: 'e2e' });

          await TabBarComponent.tapActions();
          await WalletActionsBottomSheet.tapPredictButton();
          await PredictAddFunds.tapAddFunds();

          await TransactionPayConfirmation.tapPayWithRow();
          await TransactionPayConfirmation.tapPayWithToken('LineaETH');
          await TransactionPayConfirmation.tapKeyboardAmount('1.23');
          await TransactionPayConfirmation.tapKeyboardContinueButton();
          await TransactionPayConfirmation.verifyTransactionFee('$4.17');
          await TransactionPayConfirmation.verifyBridgeTime('< 1 min');
          await TransactionPayConfirmation.verifyTotal('$5.40');
          await FooterActions.tapConfirmButton();

          await PredictMarketList.tapBackButton();
          await TabBarComponent.tapActivity();
          await Gestures.waitAndTap(ActivitiesView.predictDeposit, {
            elemDescription: 'Predict Deposit transaction item',
          });
          await TransactionDetailsModal.verifyNetworkFee('$4.13');
          await TransactionDetailsModal.verifyPaidWithSymbol('LineaETH');
          await TransactionDetailsModal.verifyTotal('$5.40');
          await TransactionDetailsModal.verifyTransactionFee('$0.04');
          await TransactionDetailsModal.verifyStatus('Confirmed');
        },
      );
    },
  );
});

async function testSpecificMock(mockServer: Mockttp) {
  await setupRemoteFeatureFlagsMock(mockServer, {
    ...remoteFeatureFlagPredictEnabled(true),
    ...remoteFeatureEip7702[1],
  });

  await POLYMARKET_COMPLETE_MOCKS(mockServer);
  await mockRelayQuote(mockServer);
  await mockRelayStatus(mockServer);
  // Mock all token-by-address lookups on Polygon (chainId 137) to avoid
  // unmocked live requests when TokensController fetches metadata for
  // detected tokens (e.g. SNX) while the Polygon network is active.
  await mockPolygonTokenByAddress(mockServer);
}

async function mockPolygonTokenByAddress(mockServer: Mockttp) {
  await mockServer
    .forGet('/proxy')
    .matching((request) => {
      const urlParam = new URL(request.url).searchParams.get('url') || '';
      return urlParam.includes('token.api.cx.metamask.io/token/137');
    })
    .thenCallback((request) => {
      const urlParam = new URL(request.url).searchParams.get('url') || '';
      const tokenUrl = new URL(urlParam);
      const address = tokenUrl.searchParams.get('address') ?? '';
      return {
        statusCode: 200,
        json: {
          address: address.toLowerCase(),
          symbol: 'UNKNOWN',
          decimals: 18,
          name: 'Unknown Token',
        },
      };
    });
}
