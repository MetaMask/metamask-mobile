'use strict';
import { SmokeSwaps } from '../../tags';
import WalletView from '../../pages/wallet/WalletView';
import TokenOverview from '../../pages/wallet/TokenOverview';
import {
  importWalletWithRecoveryPhrase,
  loginToApp,
  switchToSepoliaNetwork,
} from '../../viewHelper';
import Assertions from '../../utils/Assertions';
import CommonView from '../../pages/CommonView';
import TestHelpers from '../../helpers';
import FixtureBuilder from '../../fixtures/fixture-builder';
import {
  defaultGanacheOptions,
  withFixtures,
} from '../../fixtures/fixture-helper';
import SendView from '../../pages/Send/SendView';
import AmountView from '../../pages/Send/AmountView';
import TransactionConfirmationView from '../../pages/Send/TransactionConfirmView';
import TabBarComponent from '../../pages/wallet/TabBarComponent';
import enContent from '../../../locales/languages/en.json';

describe(SmokeSwaps('Token Chart Tests'), () => {
  beforeAll(async () => {
    jest.setTimeout(150000);
    await TestHelpers.launchApp();
  });

  it('should import wallet and go to the wallet view', async () => {
    await importWalletWithRecoveryPhrase();
  });

  it('should view the token chart', async () => {
    await WalletView.tapOnToken();
    await Assertions.checkIfElementNotToHaveText(
      TokenOverview.tokenPrice,
      '$0',
    );

    await TokenOverview.tapChartPeriod1d();
    await Assertions.checkIfVisible(TokenOverview.chartPeriod1d);
    await TokenOverview.tapChartPeriod1w();
    await Assertions.checkIfVisible(TokenOverview.chartPeriod1w);
    await TokenOverview.tapChartPeriod1m();
    await Assertions.checkIfVisible(TokenOverview.chartPeriod1m);
    await TokenOverview.tapChartPeriod3m();
    await Assertions.checkIfVisible(TokenOverview.chartPeriod3m);
    await TokenOverview.tapChartPeriod1y();
    await Assertions.checkIfVisible(TokenOverview.chartPeriod1y);
    await TokenOverview.tapChartPeriod3y();
    await Assertions.checkIfVisible(TokenOverview.chartPeriod3y);

    await TokenOverview.scrollOnScreen();
    await Assertions.checkIfVisible(TokenOverview.receiveButton);
    await Assertions.checkIfVisible(TokenOverview.sendButton);
    await Assertions.checkIfVisible(TokenOverview.swapButton);
    await CommonView.tapBackButton();
  });

  it('should not display the chart when using Sepolia test network', async () => {
    const sepoliaTokenSymbol = 'S';
    await switchToSepoliaNetwork();
    await WalletView.tapOnToken(sepoliaTokenSymbol);
    await Assertions.checkIfVisible(TokenOverview.noChartData, 60000);
    await Assertions.checkIfElementToHaveText(TokenOverview.tokenPrice, '$0');
  });

  it('should send ETH to an EOA from token detail page', async () => {
    const ETHEREUM_NAME = 'Ethereum';
    const RECIPIENT = '0x1FDb169Ef12954F20A15852980e1F0C122BfC1D6';
    const AMOUNT = '0.12345';
    const TOKEN_NAME = enContent.unit.eth;

    await withFixtures(
      {
        fixture: new FixtureBuilder().withGanacheNetwork().build(),
        restartDevice: true,
        ganacheOptions: defaultGanacheOptions,
      },
      async () => {
        await loginToApp();
        await WalletView.tapOnToken(ETHEREUM_NAME);
        await TokenOverview.tapSendButton();

        await SendView.inputAddress(RECIPIENT);
        await SendView.tapNextButton();

        await AmountView.typeInTransactionAmount(AMOUNT);
        await AmountView.tapNextButton();

        await TransactionConfirmationView.tapConfirmButton();
        await TabBarComponent.tapActivity();

        await Assertions.checkIfTextIsDisplayed(`${AMOUNT} ${TOKEN_NAME}`);
      },
    );
  });
});
