'use strict';
import WalletView from '../../pages/WalletView';
import { loginToApp } from '../../viewHelper';
import FixtureBuilder from '../../fixtures/fixture-builder';
import {
  withFixtures,
  defaultGanacheOptions,
} from '../../fixtures/fixture-helper';
import TestHelpers from '../../helpers';
import Assertions from '../../utils/Assertions';
import NftDetectionModal from '../../pages/modals/NftDetectionModal';
import { SmokeAssets } from '../../tags';
import NetworkListModal from '../../pages/modals/NetworkListModal';
import NetworkEducationModal from '../../pages/modals/NetworkEducationModal';
import { NftDetectionModalSelectorsText } from '../../selectors/Modals/NftDetectionModal.selectors';

describe(SmokeAssets('NFT Detection Modal'), () => {
  const ETHEREUM = 'Ethereum Main Network';
  beforeAll(async () => {
    jest.setTimeout(170000);
    await TestHelpers.reverseServerPort();
  });

  it('show nft detection modal after user switches to mainnet and taps cancel when nft detection toggle is off', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder()
          .withGanacheNetwork()
          .withPreferencesController({
            useNftDetection: false,
          })
          .build(),
        restartDevice: true,
        ganacheOptions: defaultGanacheOptions,
      },
      async () => {
        await loginToApp();

        // Switch to Mainnet
        await WalletView.tapNetworksButtonOnNavBar();
        await NetworkListModal.changeNetworkTo(ETHEREUM);
        await NetworkEducationModal.tapGotItButton();

        await Assertions.checkIfVisible(NftDetectionModal.container);
        await NftDetectionModal.tapCancelButton();
        // Check that we are on the wallet screen
        await WalletView.isVisible();

        // Go to NFTs tab and check that the banner is visible
        await WalletView.tapNftTab();
        await Assertions.checkIfTextIsDisplayed(
          NftDetectionModalSelectorsText.NFT_AUTO_DETECTION_BANNER,
        );
      },
    );
  });

  it('show nft detection modal after user switches to mainnet and taps allow when nftDetection toggle is off', async () => {
    const testNftOnMainnet = 'LifesAJokeNFT';

    await withFixtures(
      {
        fixture: new FixtureBuilder()
          .withGanacheNetwork()
          .withPreferencesController({
            useNftDetection: false,
          })
          .build(),
        restartDevice: true,
        ganacheOptions: defaultGanacheOptions,
      },
      async () => {
        await loginToApp();

        // Switch to Mainnet
        await WalletView.tapNetworksButtonOnNavBar();
        await NetworkListModal.changeNetworkTo(ETHEREUM);
        await NetworkEducationModal.tapGotItButton();

        await Assertions.checkIfVisible(NftDetectionModal.container);
        await NftDetectionModal.tapAllowButton();
        // Check that we are on the wallet screen
        await WalletView.isVisible();

        // Go to NFTs tab and check that the banner is NOT visible
        await WalletView.tapNftTab();
        await Assertions.checkIfTextIsNotDisplayed(
          NftDetectionModalSelectorsText.NFT_AUTO_DETECTION_BANNER,
        );

        await Assertions.checkIfTextIsDisplayed(testNftOnMainnet);
      },
    );
  });
});
