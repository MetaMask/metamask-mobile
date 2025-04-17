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
import { CustomNetworks } from '../../resources/networks.e2e';
import TestHelpers from '../../helpers';
import FixtureServer from '../../fixtures/fixture-server';
import { getFixturesServerPort } from '../../fixtures/utils';
import { SmokeRamps } from '../../tags';
import Assertions from '../../utils/Assertions';
import SellGetStartedView from '../../pages/Ramps/SellGetStartedView';
import SelectRegionView from '../../pages/Ramps/SelectRegionView';
import SelectPaymentMethodView from '../../pages/Ramps/SelectPaymentMethodView';
import BuildQuoteView from '../../pages/Ramps/BuildQuoteView';
import QuotesView from '../../pages/Ramps/QuotesView';
const fixtureServer = new FixtureServer();

const Regions = {
  USA: 'United States of America',
  CALIFORNIA: 'California',
  FRANCE: 'France',
  UK: 'United Kingdom',
};

const PaymentMethods = {
  DEBIT_OR_CREDIT: 'Debit or Credit',
  INSTANT_ACH_BANK_TRANSFER: 'Insant ACH Bank Transfer',
  ACH_BANK_TRANSFER: 'ACH Bank Transfer',
};

describe(SmokeRamps('Off-Ramp'), () => {
  beforeAll(async () => {
    await TestHelpers.reverseServerPort();
    const fixture = new FixtureBuilder()
      .withNetworkController(CustomNetworks.Tenderly.Mainnet)
      .build();
    await startFixtureServer(fixtureServer);
    await loadFixture(fixtureServer, { fixture });
    await TestHelpers.launchApp({
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

  it('should display Build Sell Quote page after user selects a region', async () => {
    await TabBarComponent.tapWallet();
    await TabBarComponent.tapActions();
    await WalletActionsBottomSheet.tapSellButton();
    await SellGetStartedView.tapGetStartedButton();
    await BuildQuoteView.tapSelectRegionDropdown();
    await SelectRegionView.tapRegionOption(Regions.USA);
    await SelectRegionView.tapRegionOption(Regions.CALIFORNIA);
    await SelectRegionView.tapContinueButton();
    await Assertions.checkIfVisible(BuildQuoteView.amountToSellLabel);
    await Assertions.checkIfVisible(BuildQuoteView.getQuotesButton);
    await BuildQuoteView.tapCancelButton();
  });

  it('should show quotes', async () => {
    await TabBarComponent.tapActions();
    await WalletActionsBottomSheet.tapSellButton();
    await BuildQuoteView.enterAmount('2');
    await BuildQuoteView.tapGetQuotesButton();
    await Assertions.checkIfVisible(QuotesView.quotes);
  });
});
