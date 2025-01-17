'use strict';
import { loginToApp } from '../../viewHelper';
import TabBarComponent from '../../pages/wallet/TabBarComponent';
import WalletActionsBottomSheet from '../../pages/wallet/WalletActionsBottomSheet';
import FixtureBuilder from '../../fixtures/fixture-builder';
import {
  loadFixture,
  startFixtureServer,
  stopFixtureServer,
} from '../../fixtures/fixture-helper';
import FixtureServer from '../../fixtures/fixture-server';
import { getFixturesServerPort } from '../../fixtures/utils';
import { SmokeRamps } from '../../tags';
import BuyGetStartedView from '../../pages/Ramps/BuyGetStartedView';
import SelectRegionView from '../../pages/Ramps/SelectRegionView';
import SelectPaymentMethodView from '../../pages/Ramps/SelectPaymentMethodView';
import BuildQuoteView from '../../pages/Ramps/BuildQuoteView';
import Assertions from '../../utils/Assertions';
import Utilities from '../../utils/Utilities';

const fixtureServer = new FixtureServer();

describe(SmokeRamps('Buy Crypto'), () => {
  beforeAll(async () => {
    await Utilities.reverseServerPort();
    const fixture = new FixtureBuilder().build();
    await startFixtureServer(fixtureServer);
    await loadFixture(fixtureServer, { fixture });
    await Utilities.launchApp({
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

  it('should select Region and Payment Method to see the Build Buy Quote screen', async () => {
    await TabBarComponent.tapWallet();
    await TabBarComponent.tapActions();
    await WalletActionsBottomSheet.tapBuyButton();
    await BuyGetStartedView.tapGetStartedButton();
    await SelectRegionView.tapSelectRegionDropdown();
    await SelectRegionView.tapRegionOption('United States of America');
    await SelectRegionView.tapRegionOption('California');
    await SelectRegionView.tapContinueButton();
    await SelectPaymentMethodView.tapPaymentMethodOption('Debit or Credit');
    await SelectPaymentMethodView.tapContinueButton();
    await Assertions.checkIfVisible(BuildQuoteView.amountToBuyLabel);
    await Assertions.checkIfVisible(BuildQuoteView.getQuotesButton);
    await BuildQuoteView.tapCancelButton();
  });

  it('should skip to the Build Quote screen for returning user', async () => {
    await TabBarComponent.tapActions();
    await WalletActionsBottomSheet.tapBuyButton();
    await Assertions.checkIfVisible(BuildQuoteView.amountToBuyLabel);
    await Assertions.checkIfVisible(BuildQuoteView.getQuotesButton);
  });
});
