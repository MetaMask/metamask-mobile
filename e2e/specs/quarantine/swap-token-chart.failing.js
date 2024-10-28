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
import ActivitiesView from '../../pages/ActivitiesView';
import DetailsModal from '../../pages/modals/DetailsModal';

const fixtureServer = new FixtureServer();
const sourceTokenSymbol = 'USDT';
const destTokenSymbol = 'DAI';

describe(Regression('Swap from Token view'), () => {
  const swapOnboarded = true; // TODO: Set it to false once we show the onboarding page again.
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

  it('should complete a USDT to ETH swap from the token chart', async () => {
    await TabBarComponent.tapWallet();
    await Assertions.checkIfVisible(WalletView.container);
    await WalletView.tapOnToken('Ethereum');
    await Assertions.checkIfVisible(TokenOverview.container);
    await TokenOverview.scrollOnScreen();
    await TokenOverview.tapSwapButton();
    if (!swapOnboarded) await Onboarding.tapStartSwapping();
    await Assertions.checkIfVisible(QuoteView.getQuotes);
    await QuoteView.tapOnSelectSourceToken();
    await QuoteView.tapSearchToken();
    await QuoteView.typeSearchToken(sourceTokenSymbol);
    await TestHelpers.delay(1000);
    await QuoteView.selectToken(sourceTokenSymbol);
    await QuoteView.enterSwapAmount('10');
    await QuoteView.tapOnSelectDestToken();
    await QuoteView.tapSearchToken();
    await QuoteView.typeSearchToken(destTokenSymbol);
    await TestHelpers.delay(1000);
    await QuoteView.selectToken(destTokenSymbol);
    await QuoteView.tapOnGetQuotes();
    await Assertions.checkIfVisible(SwapView.fetchingQuotes);
    await Assertions.checkIfVisible(SwapView.quoteSummary);
    await Assertions.checkIfVisible(SwapView.gasFee);
    await SwapView.tapIUnderstandPriceWarning();
    await SwapView.swipeToSwap();
    try {
      await Assertions.checkIfVisible(
        SwapView.swapCompleteLabel(sourceTokenSymbol, destTokenSymbol),
        100000,
      );
    } catch (e) {
      // eslint-disable-next-line no-console
      console.log(`Toast message is slow to appear or did not appear: ${e}`);
    }
    await device.enableSynchronization();
    await TestHelpers.delay(5000);
    await TokenOverview.tapBackButton();
    await TabBarComponent.tapActivity();
    await Assertions.checkIfVisible(ActivitiesView.title);
    await Assertions.checkIfVisible(
      ActivitiesView.swapActivity(sourceTokenSymbol, destTokenSymbol),
    );
    await ActivitiesView.tapOnSwapActivity(sourceTokenSymbol, destTokenSymbol);

    try {
      await Assertions.checkIfVisible(DetailsModal.title);
    } catch (e) {
      await ActivitiesView.tapOnSwapActivity(
        sourceTokenSymbol,
        destTokenSymbol,
      );
      await Assertions.checkIfVisible(DetailsModal.title);
    }

    await Assertions.checkIfVisible(DetailsModal.title);
    await Assertions.checkIfElementToHaveText(
      DetailsModal.title,
      DetailsModal.generateExpectedTitle(sourceTokenSymbol, destTokenSymbol),
    );
    await Assertions.checkIfVisible(DetailsModal.statusConfirmed);
    await DetailsModal.tapOnCloseIcon();
    await Assertions.checkIfNotVisible(DetailsModal.title);
  });
});
