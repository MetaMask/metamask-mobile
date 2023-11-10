'use strict';
import { loginToApp } from '../../viewHelper';
import Onboarding from '../../pages/swaps/OnBoarding';
import QuoteView from '../../pages/swaps/QuoteView';
import SwapView from '../../pages/swaps/SwapView';
import TabBarComponent from '../../pages/TabBarComponent';
import ActivitiesView from '../../pages/ActivitiesView';
import WalletActionsModal from '../../pages/modals/WalletActionsModal';
import FixtureBuilder from '../../fixtures/fixture-builder';
import {
  loadFixture,
  startFixtureServer,
  stopFixtureServer,
} from '../../fixtures/fixture-helper';
import Networks from '../../resources/networks.json';
import TestHelpers from '../../helpers';
import FixtureServer from '../../fixtures/fixture-server';
import { getFixturesServerPort } from '../../fixtures/utils';
import { Smoke } from '../../tags';
import { TransactionDetailsModalSelectorsText } from '../../selectors/Modals/TransactionDetailsModal.selectors';

const fixtureServer = new FixtureServer();

describe(Smoke('Swap from Actions'), () => {
  let swapOnboarded = false;
  const transactionList = [];
  beforeAll(async () => {
    await TestHelpers.reverseServerPort();
    const fixture = new FixtureBuilder()
      .withNetworkController(Networks.Tenderly)
      .build();
    await startFixtureServer(fixtureServer);
    await loadFixture(fixtureServer, { fixture });
    await device.launchApp({
      permissions: { notifications: 'YES' },
      launchArgs: { fixtureServerPort: `${getFixturesServerPort()}` },
    });
    await loginToApp();
  });

  afterAll(async () => {
    await stopFixtureServer(fixtureServer);
  });

  beforeEach(async () => {
    jest.setTimeout(150000);
  });

  it.each`
    quantity | sourceTokenSymbol | destTokenSymbol
    ${'.05'} | ${'ETH'}          | ${'USDC'}
  `(
    "should Swap $quantity '$sourceTokenSymbol' to '$destTokenSymbol'",
    async ({ quantity, sourceTokenSymbol, destTokenSymbol }) => {
      await TabBarComponent.tapWallet();
      await TabBarComponent.tapActions();
      await WalletActionsModal.tapSwapButton();

      if (!swapOnboarded) {
        await Onboarding.tapStartSwapping();
        swapOnboarded = true;
      }
      await QuoteView.isVisible();

      //Select source token, if ETH then can skip because already selected
      if (sourceTokenSymbol !== 'ETH') {
        await QuoteView.tapOnSelectSourceToken();
        await QuoteView.selectToken(sourceTokenSymbol);
      }
      await QuoteView.enterSwapAmount(quantity);

      //Select destination token
      await QuoteView.tapOnSelectDestToken();
      await QuoteView.selectToken(destTokenSymbol);

      //Make sure slippage is zero for wrapped tokens
      if (sourceTokenSymbol === 'WETH' || destTokenSymbol === 'WETH') {
        await QuoteView.checkMaxSlippage('Max slippage 0%');
      }
      await QuoteView.tapOnGetQuotes();
      await SwapView.isVisible();
      await SwapView.tapIUnderstandPriceWarning();
      await SwapView.swipeToSwap();
      await SwapView.waitForSwapToComplete(sourceTokenSymbol, destTokenSymbol);

      let transactionTitle = TransactionDetailsModalSelectorsText.TITLE;
      transactionTitle = transactionTitle.replace(
        '{{sourceToken}}',
        sourceTokenSymbol,
      );
      transactionTitle = transactionTitle.replace(
        '{{destinationToken}}',
        destTokenSymbol,
      );

      transactionList.push(transactionTitle);
    },
  );

  it('check that all the transcations appear as confirmed in the activity list', async () => {
    let transactionIndex = 0;

    await TabBarComponent.tapActivity();
    await ActivitiesView.isVisible();

    while (transactionList.length) {
      const transaction = transactionList.pop();
      await ActivitiesView.checkActivityTitle(transaction, transactionIndex);
      await ActivitiesView.checkActivityStatus('Confirmed', transactionIndex++);
    }
  });
});
