'use strict';
import { loginToApp } from '../../viewHelper';
import Onboarding from '../../pages/swaps/OnBoarding';
import QuoteView from '../../pages/swaps/QuoteView';
import SwapView from '../../pages/swaps/SwapView';
import TabBarComponent from '../../pages/TabBarComponent';
import ActivitiesView from '../../pages/ActivitiesView';
import DetailsModal from '../../pages/modals/DetailsModal';
import WalletActionsModal from '../../pages/modals/WalletActionsModal';
import FixtureBuilder from '../../fixtures/fixture-builder';
import {
  loadFixture,
  startFixtureServer,
  stopFixtureServer,
} from '../../fixtures/fixture-helper';
import { CustomNetworks } from '../../resources/networks.e2e';
import TestHelpers from '../../helpers';
import FixtureServer from '../../fixtures/fixture-server';
import { getFixturesServerPort } from '../../fixtures/utils';
import { Regression } from '../../tags';
import Assertions from '../../utils/Assertions';

const fixtureServer = new FixtureServer();

describe(Regression('Multiple Swaps from Actions'), () => {
  let swapOnboarded = true; // TODO: Set it to false once we show the onboarding page again.
  beforeAll(async () => {
    await TestHelpers.reverseServerPort();
    const fixture = new FixtureBuilder()
      .withNetworkController(CustomNetworks.Tenderly)
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
    ${'1'}   | ${'ETH'}          | ${'WETH'}
    ${'1'}   | ${'WETH'}         | ${'ETH'}
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
      await SwapView.tapIUnderstandPriceWarning();
      await SwapView.swipeToSwap();
      await SwapView.waitForSwapToComplete(sourceTokenSymbol, destTokenSymbol);
      await TabBarComponent.tapActivity();
      await ActivitiesView.isVisible();
      await ActivitiesView.tapOnSwapActivity(
        sourceTokenSymbol,
        destTokenSymbol,
      );
      await Assertions.checkIfVisible(DetailsModal.title);
      await Assertions.checkIfElementToHaveText(
        DetailsModal.title,
        DetailsModal.generateExpectedTitle(sourceTokenSymbol, destTokenSymbol),
      );
      await Assertions.checkIfVisible(DetailsModal.statusConfirmed);
      await DetailsModal.tapOnCloseIcon();
    },
  );
});
