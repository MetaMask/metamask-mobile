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

  it('should complete a USDC to DAI swap from the token chart', async () => {
    await TabBarComponent.tapWallet();
    await Assertions.checkIfVisible(WalletView.container);
    await WalletView.tapOnToken('Ethereum');
    await TokenOverview.scrollOnScreen();
    await TokenOverview.isVisible();
    await TokenOverview.tapSwapButton();
    if (!swapOnboarded) await Onboarding.tapStartSwapping();
    await Assertions.checkIfVisible(QuoteView.getQuotes);
    await QuoteView.tapOnSelectSourceToken();
    await QuoteView.tapSearchToken();
    await QuoteView.typeSearchToken('LINK');
    await TestHelpers.delay(1000);
    await QuoteView.selectToken('LINK');
    await QuoteView.enterSwapAmount('5');
    await QuoteView.tapOnSelectDestToken();
    await QuoteView.tapSearchToken();
    await QuoteView.typeSearchToken('DAI');
    await TestHelpers.delay(1000);
    await QuoteView.selectToken('DAI');
    await QuoteView.tapOnGetQuotes();
    await Assertions.checkIfVisible(SwapView.fetchingQuotes);
    await Assertions.checkIfVisible(SwapView.quoteSummary);
    await Assertions.checkIfVisible(SwapView.gasFee);
    await SwapView.tapIUnderstandPriceWarning();
    await SwapView.swipeToSwap();
    try {
      await Assertions.checkIfVisible(
        SwapView.swapCompleteLabel('LINK', 'DAI'),
        100000,
      );
    } catch (e) {
      // eslint-disable-next-line no-console
      console.log(`Toast message is slow to appear or did not appear: ${e}`);
    }
    await device.enableSynchronization();
    await TestHelpers.delay(5000);
    await TabBarComponent.tapActivity();
    await Assertions.checkIfVisible(ActivitiesView.title);
    await Assertions.checkIfVisible(ActivitiesView.swapActivity('LINK', 'DAI'));
    await ActivitiesView.tapOnSwapActivity('LINK', 'DAI');

    try {
      await Assertions.checkIfVisible(DetailsModal.title);
    } catch (e) {
      await ActivitiesView.tapOnSwapActivity('LINK', 'DAI');
      await Assertions.checkIfVisible(DetailsModal.title);
    }

    await Assertions.checkIfVisible(DetailsModal.title);
    await Assertions.checkIfElementToHaveText(
      DetailsModal.title,
      DetailsModal.generateExpectedTitle('LINK', 'DAI'),
    );
    await Assertions.checkIfVisible(DetailsModal.statusConfirmed);
    await DetailsModal.tapOnCloseIcon();
    await Assertions.checkIfNotVisible(DetailsModal.title);
  });
});
