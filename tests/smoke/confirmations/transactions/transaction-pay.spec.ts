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
import { toChecksumHexAddress } from '@metamask/controller-utils';
import TransactionPayConfirmation from '../../../page-objects/Confirmation/TransactionPayConfirmation';
import FooterActions from '../../../page-objects/Browser/Confirmations/FooterActions';
import { Gestures } from '../../../framework';
import TransactionDetailsModal from '../../../page-objects/Transactions/TransactionDetailsModal';
import TabBarComponent from '../../../page-objects/wallet/TabBarComponent';
import WalletActionsBottomSheet from '../../../page-objects/wallet/WalletActionsBottomSheet';
import ActivitiesView from '../../../page-objects/Transactions/ActivitiesView';
import PredictMarketList from '../../../page-objects/Predict/PredictMarketList';

const POLYGON_PUSD_TOKEN_ADDRESS = '0xC011a7E12a19f7B1f670d46F03B03f3342E82DFB';
const POLYGON_NATIVE_USD_RATE = 1;

function buildTransactionPayFixture() {
  const fixture = new FixtureBuilder()
    .withPolygon()
    .withTokens(
      [
        {
          address: POLYGON_PUSD_TOKEN_ADDRESS,
          decimals: 6,
          name: 'Polymarket USD',
          symbol: 'pUSD',
        },
      ],
      CHAIN_IDS.POLYGON,
    )
    // TransactionPayController still derives required-token pricing for
    // Predict deposits from Polygon marketData/currencyRates. Seed explicit
    // pUSD + Polygon native rates so the deposit amount is recognized as a
    // priced required token instead of collapsing to a gas-only confirmation.
    .withTokenRates(
      CHAIN_IDS.POLYGON,
      toChecksumHexAddress(POLYGON_PUSD_TOKEN_ADDRESS),
      1 / POLYGON_NATIVE_USD_RATE,
    )
    .build();

  fixture.state.engine.backgroundState.CurrencyRateController.currencyRates = {
    ...fixture.state.engine.backgroundState.CurrencyRateController
      .currencyRates,
    MATIC: {
      conversionDate: Date.now() / 1000,
      conversionRate: POLYGON_NATIVE_USD_RATE,
      usdConversionRate: POLYGON_NATIVE_USD_RATE,
    },
  };

  return fixture;
}

describe(SmokeConfirmations('Transaction Pay'), () => {
  it('deposits to predict balance', async () => {
    await withFixtures(
      {
        fixture: buildTransactionPayFixture(),
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
