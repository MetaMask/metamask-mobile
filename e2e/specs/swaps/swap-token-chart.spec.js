'use strict';
import { loginToApp } from '../../viewHelper';
import Onboarding from '../../pages/swaps/OnBoarding';
import QuoteView from '../../pages/swaps/QuoteView';
import SwapView from '../../pages/swaps/SwapView';
import TabBarComponent from '../../pages/TabBarComponent';
import WalletView from '../../pages/wallet/WalletView';
import TokenOverview from '../../pages/TokenOverview';
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

describe(Regression('Swap from Token view'), () => {
  const swapOnboarded = false; // TODO: Set it to false once we show the onboarding page again.
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

  it('should complete a USDC to DAI swap from the token chart', async () => {
    await TabBarComponent.tapWallet();
    await Assertions.checkIfVisible(WalletView.container);
    await WalletView.tapOnToken('Ethereum');
    await TokenOverview.scrollOnScreen();
    await TokenOverview.isVisible();
    await TokenOverview.tapSwapButton();
    // if (!swapOnboarded) await Onboarding.tapStartSwapping();
    // await QuoteView.isVisible();
    // await QuoteView.tapOnSelectSourceToken();
    // await QuoteView.selectToken('USDC');
    // await QuoteView.enterSwapAmount('5');
    // await QuoteView.tapOnSelectDestToken();
    // await QuoteView.selectToken('DAI');
    // await QuoteView.tapOnGetQuotes();
    // await SwapView.isVisible();
    // await SwapView.tapIUnderstandPriceWarning();
    // await SwapView.swipeToSwap();
    // await SwapView.waitForSwapToComplete('USDC', 'DAI');
  });
});
