import TestHelpers from '../../helpers';
import { loginToApp } from '../../viewHelper';
import { withFixtures } from '../../framework/fixtures/FixtureHelper';
import { SmokeTrade } from '../../tags';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder';
import SellGetStartedView from '../../pages/Ramps/SellGetStartedView';
import BuyGetStartedView from '../../pages/Ramps/BuyGetStartedView';
import Assertions from '../../framework/Assertions';
import NetworkAddedBottomSheet from '../../pages/Network/NetworkAddedBottomSheet';
import NetworkApprovalBottomSheet from '../../pages/Network/NetworkApprovalBottomSheet';
import NetworkEducationModal from '../../pages/Network/NetworkEducationModal';
import NetworkListModal from '../../pages/Network/NetworkListModal';
import { PopularNetworksList } from '../../resources/networks.e2e';

// This test was migrated to the new framework but should be reworked to use withFixtures properly
describe(SmokeTrade('Buy Crypto Deeplinks'), () => {
  beforeAll(async () => {
    await TestHelpers.reverseServerPort();
  });

  beforeEach(async () => {
    jest.setTimeout(150000);
  });
  const itif = (condition: boolean) => (condition ? it : it.skip);

  itif(device.getPlatform() === 'android')(
    'should deep link to onramp to unsupported network',
    async () => {
      const BuyDeepLink = 'metamask://buy?chainId=2';

      await withFixtures(
        {
          fixture: new FixtureBuilder().withRampsSelectedRegion().build(),
          restartDevice: true,
        },
        async () => {
          await loginToApp();
          await device.sendToHome();
          await device.launchApp({
            url: BuyDeepLink,
          });

          await Assertions.expectElementToBeVisible(
            SellGetStartedView.getStartedButton,
          );

          await BuyGetStartedView.tapGetStartedButton();

          await Assertions.expectTextDisplayed('Unsupported buy Network');
          await NetworkListModal.changeNetworkTo(
            PopularNetworksList.Avalanche.providerConfig.nickname,
          );
          await NetworkApprovalBottomSheet.tapApproveButton();
          await NetworkAddedBottomSheet.tapCloseButton();
          await Assertions.expectElementToBeVisible(
            NetworkEducationModal.container,
          );
          await NetworkEducationModal.tapGotItButton();
          await Assertions.expectTextNotDisplayed('Unsupported buy Network');
          await Assertions.expectTextDisplayed('Avalanche');
        },
      );
    },
  );
});
