import { withFixtures } from '../../framework/fixtures/FixtureHelper';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder';
import { SmokePredictions } from '../../tags';
import { loginToApp } from '../../viewHelper';
import {
  remoteFeatureEip7702,
  remoteFeatureFlagPredictEnabled,
} from '../../api-mocking/mock-responses/feature-flags-mocks';
import { Mockttp } from 'mockttp';
import { setupRemoteFeatureFlagsMock } from '../../api-mocking/helpers/remoteFeatureFlagsHelper';
import { POLYMARKET_COMPLETE_MOCKS } from '../../api-mocking/mock-responses/polymarket/polymarket-mocks';
import PredictAddFunds from '../../pages/Predict/PredictAddFunds';
import {
  mockRelayQuote,
  mockRelayStatus,
} from '../../api-mocking/mock-responses/transaction-pay';
import { CHAIN_IDS } from '@metamask/transaction-controller';
import TransactionPayConfirmation from '../../pages/Confirmation/TransactionPayConfirmation';
import FooterActions from '../../pages/Browser/Confirmations/FooterActions';
import { Gestures } from '../../framework';
import TransactionDetailsModal from '../../pages/Transactions/TransactionDetailsModal';
import TabBarComponent from '../../pages/wallet/TabBarComponent';
import WalletActionsBottomSheet from '../../pages/wallet/WalletActionsBottomSheet';
import ActivitiesView from '../../pages/Transactions/ActivitiesView';
import PredictMarketList from '../../pages/Predict/PredictMarketList';

const PredictionMarketFeature = async (mockServer: Mockttp) => {
  await setupRemoteFeatureFlagsMock(mockServer, {
    ...remoteFeatureFlagPredictEnabled(true),
    ...remoteFeatureEip7702[1],
  });

  await POLYMARKET_COMPLETE_MOCKS(mockServer);
  await mockRelayQuote(mockServer);
  await mockRelayStatus(mockServer);
};

describe(SmokePredictions('Transaction Pay'), () => {
  it('depoits to predict balance', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder()
          .withPolygon()
          .withTokenRates(
            CHAIN_IDS.POLYGON,
            '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174',
            2.0,
          )
          .withTokenRates(
            CHAIN_IDS.LINEA_MAINNET,
            '0x0000000000000000000000000000000000000000',
            2.0,
          )
          .build(),
        restartDevice: true,
        testSpecificMock: PredictionMarketFeature,
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
        await TransactionPayConfirmation.verifyTransactionFee('$0.05');
        await TransactionPayConfirmation.verifyBridgeTime('< 1 min');
        await TransactionPayConfirmation.verifyTotal('$1.28');
        await FooterActions.tapConfirmButton();

        await PredictMarketList.tapBackButton();
        await TabBarComponent.tapActivity();
        await Gestures.waitAndTap(ActivitiesView.predictDeposit);
        await TransactionDetailsModal.verifyNetworkFee('$0.01');
        await TransactionDetailsModal.verifyPaidWithSymbol('LineaETH');
        await TransactionDetailsModal.verifyTotal('$1.28');
        await TransactionDetailsModal.verifyTransactionFee('$0.04');
        await TransactionDetailsModal.verifyStatus('Confirmed');
      },
    );
  });
});
