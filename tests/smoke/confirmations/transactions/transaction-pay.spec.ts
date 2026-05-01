import { withFixtures } from '../../../framework/fixtures/FixtureHelper';
import FixtureBuilder from '../../../framework/fixtures/FixtureBuilder';
import { SmokeConfirmations } from '../../../tags';
import { loginToApp } from '../../../flows/wallet.flow';
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
import TransactionPayConfirmation from '../../../page-objects/Confirmation/TransactionPayConfirmation';
import FooterActions from '../../../page-objects/Browser/Confirmations/FooterActions';
import { Gestures } from '../../../framework';
import TransactionDetailsModal from '../../../page-objects/Transactions/TransactionDetailsModal';
import TabBarComponent from '../../../page-objects/wallet/TabBarComponent';
import WalletActionsBottomSheet from '../../../page-objects/wallet/WalletActionsBottomSheet';
import ActivitiesView from '../../../page-objects/Transactions/ActivitiesView';
import PredictMarketList from '../../../page-objects/Predict/PredictMarketList';

describe(SmokeConfirmations('Transaction Pay'), () => {
  it('deposits to predict balance', async () => {
    const expectedAmounts = getExpectedAmounts();

    await withFixtures(
      {
        fixture: new FixtureBuilder()
          .withPolygon()
          .withTokens(
            [
              {
                address: '0xC011a7E12a19f7B1f670d46F03B03f3342E82DFB',
                decimals: 6,
                name: 'Polymarket USD',
                symbol: 'pUSD',
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
        await TransactionPayConfirmation.verifyTransactionFee(
          expectedAmounts.confirmationTransactionFee,
        );
        if (device.getPlatform() !== 'android') {
          await TransactionPayConfirmation.verifyBridgeTime('< 1 min');
        }
        await TransactionPayConfirmation.verifyTotal(expectedAmounts.total);
        await FooterActions.tapConfirmButton();

        await PredictMarketList.tapBackButton();
        await TabBarComponent.tapActivity();
        await Gestures.waitAndTap(ActivitiesView.predictDeposit, {
          elemDescription: 'Predict Deposit transaction item',
        });
        await TransactionDetailsModal.verifyNetworkFee(
          expectedAmounts.networkFee,
        );
        await TransactionDetailsModal.verifyPaidWithSymbol('LineaETH');
        await TransactionDetailsModal.verifyTotal(expectedAmounts.total);
        await TransactionDetailsModal.verifyTransactionFee(
          expectedAmounts.detailsTransactionFee,
        );
        await TransactionDetailsModal.verifyStatus('Confirmed');
      },
    );
  });
});

function getExpectedAmounts() {
  if (device.getPlatform() === 'android') {
    return {
      confirmationTransactionFee: '$88.79',
      detailsTransactionFee: '$0.04',
      networkFee: '$88.75',
      total: '$88.79',
    };
  }

  return {
    confirmationTransactionFee: '$0.04',
    detailsTransactionFee: '$0.04',
    networkFee: '$0.01',
    total: '$1.31',
  };
}

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
