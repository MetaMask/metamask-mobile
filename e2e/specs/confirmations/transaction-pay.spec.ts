import { withFixtures } from '../../../tests/framework/fixtures/FixtureHelper';
import FixtureBuilder from '../../../tests/framework/fixtures/FixtureBuilder';
import { SmokeConfirmationsRedesigned } from '../../tags';
import { loginToApp } from '../../viewHelper';
import {
  remoteFeatureEip7702,
  remoteFeatureFlagPredictEnabled,
} from '../../../tests/api-mocking/mock-responses/feature-flags-mocks';
import { Mockttp } from 'mockttp';
import { setupRemoteFeatureFlagsMock } from '../../../tests/api-mocking/helpers/remoteFeatureFlagsHelper';
import { POLYMARKET_COMPLETE_MOCKS } from '../../../tests/api-mocking/mock-responses/polymarket/polymarket-mocks';
import PredictAddFunds from '../../../tests/page-objects/Predict/PredictAddFunds';
import {
  mockRelayQuote,
  mockRelayStatus,
} from '../../../tests/api-mocking/mock-responses/transaction-pay';
import { CHAIN_IDS } from '@metamask/transaction-controller';
import TransactionPayConfirmation from '../../pages/Confirmation/TransactionPayConfirmation';
import FooterActions from '../../pages/Browser/Confirmations/FooterActions';
import { Gestures } from '../../../tests/framework';
import TransactionDetailsModal from '../../pages/Transactions/TransactionDetailsModal';
import TabBarComponent from '../../pages/wallet/TabBarComponent';
import WalletActionsBottomSheet from '../../pages/wallet/WalletActionsBottomSheet';
import ActivitiesView from '../../pages/Transactions/ActivitiesView';
import PredictMarketList from '../../../tests/page-objects/Predict/PredictMarketList';

describe(SmokeConfirmationsRedesigned('Transaction Pay'), () => {
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
