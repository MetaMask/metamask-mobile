import { withFixtures } from '../../../framework/fixtures/FixtureHelper';
import FixtureBuilder from '../../../framework/fixtures/FixtureBuilder';
import { SmokeConfirmations } from '../../../../e2e/tags';
import { loginToApp } from '../../../../e2e/viewHelper';
import {
  remoteFeatureEip7702,
  remoteFeatureFlagPredictEnabled,
} from '../../../api-mocking/mock-responses/feature-flags-mocks';
import { Mockttp } from 'mockttp';
import { setupRemoteFeatureFlagsMock } from '../../../api-mocking/helpers/remoteFeatureFlagsHelper';
import { POLYMARKET_COMPLETE_MOCKS } from '../../../api-mocking/mock-responses/polymarket/polymarket-mocks';
import PredictAddFunds from '../../../page-objects/Predict/PredictAddFunds';
import {
  mockRelayQuote,
  mockRelayStatus,
} from '../../../api-mocking/mock-responses/transaction-pay';
import { CHAIN_IDS } from '@metamask/transaction-controller';
import TransactionPayConfirmation from '../../../../e2e/pages/Confirmation/TransactionPayConfirmation';
import FooterActions from '../../../../e2e/pages/Browser/Confirmations/FooterActions';
import { Gestures } from '../../../framework';
import TransactionDetailsModal from '../../../../e2e/pages/Transactions/TransactionDetailsModal';
import TabBarComponent from '../../../../e2e/pages/wallet/TabBarComponent';
import WalletActionsBottomSheet from '../../../../e2e/pages/wallet/WalletActionsBottomSheet';
import ActivitiesView from '../../../../e2e/pages/Transactions/ActivitiesView';
import PredictMarketList from '../../../page-objects/Predict/PredictMarketList';

describe(SmokeConfirmations('Transaction Pay'), () => {
  it('deposits to predict balance', async () => {
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
      },
      async () => {
        await loginToApp();

        await TabBarComponent.tapActions();
        await device.disableSynchronization();
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
  });
});

async function testSpecificMock(mockServer: Mockttp) {
  await setupRemoteFeatureFlagsMock(mockServer, {
    ...remoteFeatureFlagPredictEnabled(true),
    ...remoteFeatureEip7702[1],
  });

  await POLYMARKET_COMPLETE_MOCKS(mockServer);
  await mockRelayQuote(mockServer);
  await mockRelayStatus(mockServer);
}
