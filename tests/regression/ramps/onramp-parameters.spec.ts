import { loginToApp } from '../../flows/wallet.flow';
import WalletView from '../../page-objects/wallet/WalletView';
import FundActionMenu from '../../page-objects/UI/FundActionMenu';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder';
import { withFixtures } from '../../framework/fixtures/FixtureHelper';
import { CustomNetworks } from '../../resources/networks.e2e';
import { RegressionTrade } from '../../tags';
import Assertions from '../../framework/Assertions';
import BuildQuoteView from '../../page-objects/Ramps/BuildQuoteView';
import SelectCurrencyView from '../../page-objects/Ramps/SelectCurrencyView';
import TokenSelectScreen from '../../page-objects/Ramps/TokenSelectScreen';
import SelectRegionView from '../../page-objects/Ramps/SelectRegionView';
import SelectPaymentMethodView from '../../page-objects/Ramps/SelectPaymentMethodView';
import BuyGetStartedView from '../../page-objects/Ramps/BuyGetStartedView';
import { RampsRegions, RampsRegionsEnum } from '../../framework/Constants';
import Matchers from '../../framework/Matchers';
import { Mockttp } from 'mockttp';
import { setupRegionAwareOnRampMocks } from '../../api-mocking/mock-responses/ramps/ramps-mocks';

const setupOnRampTest = async (testFn: () => Promise<void>) => {
  const selectedRegion = RampsRegions[RampsRegionsEnum.SPAIN];

  await withFixtures(
    {
      fixture: new FixtureBuilder()
        .withNetworkController(CustomNetworks.Tenderly.Mainnet.providerConfig)
        .withRampsSelectedRegion(selectedRegion)
        .withMetaMetricsOptIn()
        .build(),
      restartDevice: true,
      testSpecificMock: async (mockServer: Mockttp) => {
        await setupRegionAwareOnRampMocks(mockServer, selectedRegion);
      },
    },
    async () => {
      await loginToApp();
      await WalletView.tapWalletBuyButton();
      await FundActionMenu.tapBuyButton();
      await BuyGetStartedView.tapGetStartedButton();
      await testFn();
    },
  );
};

describe.skip(RegressionTrade('On-Ramp Parameters'), () => {
  beforeEach(async () => {
    jest.setTimeout(150000);
  });

  it('should select currency and verify display', async () => {
    await setupOnRampTest(async () => {
      await BuildQuoteView.tapCurrencySelector();
      await SelectCurrencyView.tapCurrencyOption('Euro');
      await Assertions.expectTextDisplayed('€0');
      await Assertions.expectTextNotDisplayed('$0');
    });
  });

  it('should select token and verify display', async () => {
    await setupOnRampTest(async () => {
      await BuildQuoteView.tapTokenDropdown('Ethereum');
      await TokenSelectScreen.tapTokenByName('DAI');
      await Assertions.expectTextDisplayed('Dai Stablecoin');
    });
  });

  it('should select region and verify display', async () => {
    await setupOnRampTest(async () => {
      await BuildQuoteView.tapRegionSelector();
      await SelectRegionView.tapRegionOption('Spain');
      await Assertions.expectTextNotDisplayed('🇺🇸');
      await Assertions.expectTextDisplayed('🇪🇸');
    });
  });

  it('should select payment method and verify display', async () => {
    await setupOnRampTest(async () => {
      const paymentMethod = 'Apple Pay'; // This is now mocked so the dropdown will display the correct options even on Android
      await BuildQuoteView.tapPaymentMethodDropdown(paymentMethod);
      await SelectPaymentMethodView.tapPaymentMethodOption('Debit or Credit');
      await Assertions.expectElementToNotBeVisible(
        Matchers.getElementByText(paymentMethod),
      );
      await Assertions.expectTextDisplayed('Debit or Credit');
    });
  });
});
