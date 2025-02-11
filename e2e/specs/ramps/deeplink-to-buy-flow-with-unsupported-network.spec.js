'use strict';
import TestHelpers from '../../helpers';

import { loginToApp } from '../../viewHelper';
import { withFixtures } from '../../fixtures/fixture-helper';
import { SmokeRamps } from '../../tags';
import FixtureBuilder from '../../fixtures/fixture-builder';

import SellGetStartedView from '../../pages/Ramps/SellGetStartedView';
import BuyGetStartedView from '../../pages/Ramps/BuyGetStartedView';

import Assertions from '../../utils/Assertions';
import NetworkAddedBottomSheet from '../../pages/Network/NetworkAddedBottomSheet';
import NetworkApprovalBottomSheet from '../../pages/Network/NetworkApprovalBottomSheet';
import NetworkEducationModal from '../../pages/Network/NetworkEducationModal';
import NetworkListModal from '../../pages/Network/NetworkListModal';
import { PopularNetworksList } from '../../resources/networks.e2e';

describe(SmokeRamps('Buy Crypto Deeplinks'), () => {
  beforeAll(async () => {
    await TestHelpers.reverseServerPort();
  });

  beforeEach(async () => {
    jest.setTimeout(150000);
  });

  it('should deep link to onramp to unsupported network', async () => {
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

        await Assertions.checkIfVisible(
          await SellGetStartedView.getStartedButton,
        );

        await BuyGetStartedView.tapGetStartedButton();

        await Assertions.checkIfTextIsDisplayed('Unsupported buy Network');
        await NetworkListModal.changeNetworkTo(
          PopularNetworksList.Avalanche.providerConfig.nickname,
        );
        await NetworkApprovalBottomSheet.tapApproveButton();
        await NetworkAddedBottomSheet.tapCloseButton();
        await Assertions.checkIfVisible(NetworkEducationModal.container);
        await NetworkEducationModal.tapGotItButton();
        await Assertions.checkIfTextIsNotDisplayed('Unsupported buy Network');
        await Assertions.checkIfTextIsDisplayed('Avalanche');
      },
    );
  });
});
