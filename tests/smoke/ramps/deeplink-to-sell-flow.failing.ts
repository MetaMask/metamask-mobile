import { loginToApp } from '../../page-objects/viewHelper.ts';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder';
import { withFixtures } from '../../framework/fixtures/FixtureHelper';
import TestHelpers from '../../helpers';
import SellGetStartedView from '../../page-objects/Ramps/SellGetStartedView';
import { RegressionTrade } from '../../tags';
import BuildQuoteView from '../../page-objects/Ramps/BuildQuoteView';
import Assertions from '../../framework/Assertions';
import NetworkApprovalBottomSheet from '../../page-objects/Network/NetworkApprovalBottomSheet';
import NetworkAddedBottomSheet from '../../page-objects/Network/NetworkAddedBottomSheet';
import NetworkEducationModal from '../../page-objects/Network/NetworkEducationModal';
import NetworkListModal from '../../page-objects/Network/NetworkListModal';
import { PopularNetworksList } from '../../resources/networks.e2e';

// This test was migrated to the new framework but should be reworked to use withFixtures properly
describe.skip(RegressionTrade('Sell Crypto Deeplinks'), () => {
  beforeAll(async () => {
    await TestHelpers.reverseServerPort();
  });

  beforeEach(async () => {
    jest.setTimeout(150000);
  });

  const itif = (condition: boolean) => (condition ? it : it.skip);

  itif(device.getPlatform() === 'android')(
    'should deep link to offramp ETH',
    async () => {
      const sellDeepLinkURL = 'metamask://sell?chainId=1&amount=50';
      const franceRegion = {
        currencies: ['/currencies/fiat/eur'],
        emoji: '🇫🇷',
        id: '/regions/fr',
        name: 'France',
        support: { buy: true, sell: true, recurringBuy: true },
        unsupported: false,
        recommended: false,
        detected: false,
      };
      await withFixtures(
        {
          fixture: new FixtureBuilder()
            .withRampsSelectedRegion(franceRegion)
            .withRampsSelectedPaymentMethod()
            .build(),
          restartDevice: true,
        },
        async () => {
          await loginToApp();

          await device.sendToHome();
          await device.launchApp({
            url: sellDeepLinkURL,
          });
          await Assertions.expectElementToBeVisible(
            SellGetStartedView.getStartedButton,
          );

          await SellGetStartedView.tapGetStartedButton();
          await Assertions.expectElementToBeVisible(
            BuildQuoteView.getQuotesButton,
          );

          await Assertions.expectTextDisplayed('50 ETH');
        },
      );
    },
  );

  itif(device.getPlatform() === 'android')(
    'should deep link to offramp with Base but switch network to OP Mainnet',
    async () => {
      const sellDeepLink = 'metamask://sell?chainId=8453';

      await withFixtures(
        {
          fixture: new FixtureBuilder()
            .withRampsSelectedRegion()
            .withRampsSelectedPaymentMethod()
            .build(),
          restartDevice: true,
        },
        async () => {
          await loginToApp();
          await device.sendToHome();
          await device.launchApp({
            url: sellDeepLink,
          });
          await Assertions.expectElementToBeVisible(
            SellGetStartedView.getStartedButton,
          );
          await SellGetStartedView.tapGetStartedButton();
          await Assertions.expectElementToBeVisible(
            NetworkApprovalBottomSheet.container,
          );
          await NetworkApprovalBottomSheet.tapCancelButton();
          await NetworkListModal.changeNetworkTo(
            PopularNetworksList.Optimism.providerConfig.nickname,
          );
          await NetworkApprovalBottomSheet.tapApproveButton();
          await NetworkAddedBottomSheet.tapCloseButton();
          await Assertions.expectElementToBeVisible(
            NetworkEducationModal.container,
          );
          await NetworkEducationModal.tapGotItButton();
          await Assertions.expectTextDisplayed(
            PopularNetworksList.Optimism.providerConfig.nickname,
          );
        },
      );
    },
  );
});
