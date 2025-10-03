import Assertions from '../../framework/Assertions';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder';
import { loginToApp } from '../../viewHelper';
import { withFixtures } from '../../framework/fixtures/FixtureHelper';
import { SmokeConfirmationsRedesigned } from '../../tags';
import { Mockttp } from 'mockttp';
import WalletView from '../../pages/wallet/WalletView';
import PerpsTabView from '../../pages/Perps/PerpsTabView';
import { CHAIN_IDS } from '@metamask/transaction-controller';
import TransactionPayView from '../../pages/Confirmation/TransactionPayView';
import { setupMockRequest } from '../../api-mocking/helpers/mockHelpers';
import { NetworkMock } from '../../api-mocking/mock-responses/network-mock';
import FooterActions from '../../pages/Browser/Confirmations/FooterActions';
import ActivitiesView from '../../pages/Transactions/ActivitiesView';
import TabBarComponent from '../../pages/wallet/TabBarComponent';
import { ActivitiesViewSelectorsText } from '../../selectors/Transactions/ActivitiesView.selectors';
import TransactionDetailsModal from '../../pages/Transactions/TransactionDetailsModal';
import Gestures from '../../utils/Gestures';
import { Matchers } from '../../framework';
import {
  BRIDGE_QUOTE_RESPONSE,
  BRIDGE_STATUS_RESPONSE,
} from '../../api-mocking/mock-responses/transaction-pay';

async function testSpecificMock(mockServer: Mockttp) {
  await NetworkMock(CHAIN_IDS.ARBITRUM)(mockServer);
  await NetworkMock(CHAIN_IDS.BASE)(mockServer);

  await setupMockRequest(mockServer, {
    requestMethod: 'GET',
    url: /getQuote.*destChainId=42161/i,
    response: BRIDGE_QUOTE_RESPONSE,
    responseCode: 200,
  });

  await setupMockRequest(mockServer, {
    requestMethod: 'GET',
    url: /getTxStatus.*/i,
    response: BRIDGE_STATUS_RESPONSE,
    responseCode: 200,
  });

  await setupMockRequest(mockServer, {
    requestMethod: 'GET',
    url: /suggestedGasFees.*/i,
    response: {
      low: {
        suggestedMaxPriorityFeePerGas: '0.0001',
        suggestedMaxFeePerGas: '1.546031535',
        minWaitTimeEstimate: 12000,
        maxWaitTimeEstimate: 48000,
      },
      medium: {
        suggestedMaxPriorityFeePerGas: '0.91143208411',
        suggestedMaxFeePerGas: '3.210682096',
        minWaitTimeEstimate: 12000,
        maxWaitTimeEstimate: 36000,
      },
      high: {
        suggestedMaxPriorityFeePerGas: '1.5',
        suggestedMaxFeePerGas: '3.710682096',
        minWaitTimeEstimate: 12000,
        maxWaitTimeEstimate: 24000,
      },
      estimatedBaseFee: '0.91143208411',
      networkCongestion: 0.9464,
      latestPriorityFeeRange: ['0', '2'],
      historicalPriorityFeeRange: ['0.00016', '177.794417311'],
      historicalBaseFeeRange: ['0.776837074', '1.692845309'],
      priorityFeeTrend: 'down',
      baseFeeTrend: 'up',
      version: '0.0.1',
    },
    responseCode: 200,
  });
}

describe(SmokeConfirmationsRedesigned('MetaMask Pay'), () => {
  it(`bridges funds for perps deposit`, async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder()
          .withPerpsProfile('no-funds')
          .withPerpsFirstTimeUser(false)
          .withDisabledSmartTransactions()
          .withPopularNetworks()
          .withTokenRates(
            CHAIN_IDS.BASE,
            '0x6B175474E89094C44Da98b954EedeAC495271d0F',
            2.0,
          )
          .withTokenRates(
            CHAIN_IDS.ARBITRUM,
            '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
            2.0,
          )
          .withTokensForAllPopularNetworks([
            {
              address: '0x6B175474E89094C44Da98b954EedeAC495271d0F',
              symbol: 'DAI',
              decimals: 18,
              name: 'Dai Stablecoin',
              balance: '0.012345',
            },
          ])
          .build(),
        restartDevice: true,
        testSpecificMock,
      },
      async () => {
        await loginToApp();
        await device.disableSynchronization();
        await WalletView.tapOnPerpsTab();
        await PerpsTabView.tapBalanceButton();
        await PerpsTabView.tapAddFundsButton();

        await Assertions.expectElementToHaveText(
          TransactionPayView.payWithSymbol,
          'DAI',
        );

        await Assertions.expectElementToHaveText(
          TransactionPayView.payWithFiat,
          '$123.45',
        );

        await Assertions.expectElementToHaveText(
          TransactionPayView.payWithBalance,
          '0.0123 DAI',
        );

        await TransactionPayView.tapPayWithRow();

        await Assertions.expectElementToBeVisible(
          TransactionPayView.availableToken(
            '0x6B175474E89094C44Da98b954EedeAC495271d0F',
            CHAIN_IDS.BASE,
          ),
        );

        await Assertions.expectElementToBeVisible(
          TransactionPayView.availableToken(
            '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
            CHAIN_IDS.ARBITRUM,
          ),
        );

        await TransactionPayView.tapPayWithModalCloseButton();
        await TransactionPayView.tapKeyboardAmount('10.12');
        await TransactionPayView.tapKeyboardContinueButton();
        await FooterActions.tapConfirmButton();

        await Gestures.waitAndTap(Matchers.getElementByText('Track'));

        await Assertions.expectElementToHaveText(
          TransactionDetailsModal.paidWithSymbol,
          'DAI',
        );

        await Assertions.expectElementToHaveText(
          TransactionDetailsModal.summaryLine(0),
          'Bridge from DAI to USDC',
        );

        await Assertions.expectElementToHaveText(
          TransactionDetailsModal.summaryLine(1),
          'Add funds',
        );

        await TabBarComponent.tapWallet();
        await TabBarComponent.tapActivity();

        await Assertions.expectElementToHaveText(
          ActivitiesView.transactionStatus(0),
          ActivitiesViewSelectorsText.CONFIRM_TEXT,
        );

        await Assertions.expectElementToNotBeVisible(
          ActivitiesView.transactionItem(1),
        );
      },
    );
  });
});
