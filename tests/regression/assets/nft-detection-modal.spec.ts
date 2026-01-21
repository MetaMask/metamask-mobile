import WalletView from '../../page-objects/wallet/WalletView';
import { loginToApp } from '../../page-objects/viewHelper.ts';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder';
import { withFixtures } from '../../framework/fixtures/FixtureHelper';
import TestHelpers from '../../helpers';
import Assertions from '../../framework/Assertions';
import NftDetectionModal from '../../page-objects/wallet/NftDetectionModal';
import { RegressionAssets } from '../../tags';

import { NftDetectionModalSelectorsText } from '../../../app/components/Views/NFTAutoDetectionModal/NftDetectionModal.testIds';

describe.skip(RegressionAssets('NFT Detection Modal'), () => {
  beforeAll(async () => {
    jest.setTimeout(170000);
    await TestHelpers.reverseServerPort();
  });

  it('show nft detection modal after user switches to mainnet and taps cancel when nft detection toggle is off', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder()
          .withPreferencesController({
            useNftDetection: false,
          })
          .build(),
        restartDevice: true,
      },
      async () => {
        await loginToApp();
        await Assertions.expectElementToBeVisible(NftDetectionModal.container);

        await NftDetectionModal.tapCancelButton();
        // This is needed due to the animations on the modal causing issues with Detox synchronization
        await device.disableSynchronization();
        // Check that we are on the wallet screen
        await Assertions.expectElementToBeVisible(WalletView.container);

        // Go to NFTs tab and check that the banner is visible
        await WalletView.tapNftTab();
        await Assertions.expectTextDisplayed(
          NftDetectionModalSelectorsText.NFT_AUTO_DETECTION_BANNER,
        );
      },
    );
  });

  it('show nft detection modal after user switches to mainnet and taps allow when nftDetection toggle is off', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder()
          .withPreferencesController({
            useNftDetection: false,
          })
          .build(),
        restartDevice: true,
      },
      async () => {
        await loginToApp();

        await Assertions.expectElementToBeVisible(NftDetectionModal.container);
        await NftDetectionModal.tapAllowButton();
        // Check that we are on the wallet screen
        await Assertions.expectElementToBeVisible(WalletView.container);
        // This is needed due to the animations on the modal causing issues with Detox synchronization
        await device.disableSynchronization();

        // Go to NFTs tab and check that the banner is NOT visible
        await WalletView.tapNftTab();
        await Assertions.expectTextNotDisplayed(
          NftDetectionModalSelectorsText.NFT_AUTO_DETECTION_BANNER,
        );

        await Assertions.expectTextDisplayed('All Networks');
      },
    );
  });
});
