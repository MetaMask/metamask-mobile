'use strict';

import { loginToApp } from '../../viewHelper';
import Onboarding from '../../pages/swaps/OnBoarding';
import QuoteView from '../../pages/swaps/QuoteView';
import SwapView from '../../pages/swaps/SwapView';
import TabBarComponent from '../../pages/TabBarComponent';
import ActivitiesView from '../../pages/ActivitiesView';
import DetailsModal from '../../pages/modals/DetailsModal';
import WalletActionsModal from '../../pages/modals/WalletActionsModal';
import WalletView from '../../pages/WalletView';
import TokenOverview from '../../pages/TokenOverview';
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

const fixtureServer = new FixtureServer();

describe('Swap Tests', () => {
  let swapOnboarded = false;
  beforeAll(async () => {
    await TestHelpers.reverseServerPort();
    const fixture = new FixtureBuilder()
      .withNetworkController(Networks.Tenderly)
      .build();
    await startFixtureServer(fixtureServer);
    await loadFixture(fixtureServer, { fixture });
    await device.launchApp({
      delete: true,
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
    ${'1'}   | ${'ETH'}          | ${'WETH'}
    ${'1'}   | ${'WETH'}         | ${'ETH'}
    ${'.05'} | ${'ETH'}          | ${'USDC'}
    ${'10'}  | ${'USDC'}         | ${'ETH'}
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
      await SwapView.swipeToSwap();
      await SwapView.waitForSwapToComplete(sourceTokenSymbol, destTokenSymbol);
      await TabBarComponent.tapActivity();
      await ActivitiesView.isVisible();
      await ActivitiesView.tapOnSwapActivity(
        sourceTokenSymbol,
        destTokenSymbol,
      );
      await DetailsModal.isTitleVisible(sourceTokenSymbol, destTokenSymbol);
      await DetailsModal.isStatusCorrect('Confirmed');
      await DetailsModal.tapOnCloseIcon();
    },
  );

  it('should complete a USDC to DAI swap from the token chart', async () => {
    await TabBarComponent.tapWallet();
    await WalletView.isVisible();
    await WalletView.tapOnToken('Ethereum');
    await TokenOverview.isVisible();
    await WalletView.toastNotificationNotVisible();
    await TokenOverview.tapSwapButton();
    if (!swapOnboarded) await Onboarding.tapStartSwapping();
    await QuoteView.isVisible();
    await QuoteView.tapOnSelectSourceToken();
    await QuoteView.selectToken('USDC');
    await QuoteView.enterSwapAmount('5');
    await QuoteView.tapOnSelectDestToken();
    await QuoteView.selectToken('DAI');
    await QuoteView.tapOnGetQuotes();
    await SwapView.isVisible();
    await SwapView.swipeToSwap();
    await SwapView.waitForSwapToComplete('USDC', 'DAI');
  });
});
