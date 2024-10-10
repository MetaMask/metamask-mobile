'use strict';
import { loginToApp } from '../../viewHelper';
import TabBarComponent from '../../pages/TabBarComponent';
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
import { SmokeAssets } from '../../tags';
import Assertions from '../../utils/Assertions';
import SellGetStartedView from '../../pages/Ramps/SellGetStartedView';
import SelectRegionView from '../../pages/Ramps/SelectRegionView';
import SelectPaymentMethodView from '../../pages/Ramps/SelectPaymentMethodView';
import BuildQuoteView from '../../pages/Ramps/BuildQuoteView';

const fixtureServer = new FixtureServer();

describe(SmokeAssets('OffRamp'), () => {
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

  it('should select Region and Payment Method to see the Build Sell Quote screen', async () => {
    await TabBarComponent.tapWallet();
    await TabBarComponent.tapActions();
    await WalletActionsModal.tapSellButton();
    await SellGetStartedView.tapGetStartedButton();
    await SelectRegionView.tapSelectRegionDropdown();
    await SelectRegionView.tapRegionOption('United States of America');
    await SelectRegionView.tapRegionOption('California');
    await SelectRegionView.tapContinueButton();
    await SelectPaymentMethodView.tapPaymentMethodOption('Debit or Credit');
    await SelectPaymentMethodView.tapContinueButton();    
    await Assertions.checkIfVisible(BuildQuoteView.amountToSellLabel);
    await Assertions.checkIfVisible(BuildQuoteView.getQuotesButton);
  });

});
