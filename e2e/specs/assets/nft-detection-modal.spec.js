'use strict';
import WalletView from '../../pages/wallet/WalletView';
import { loginToApp } from '../../viewHelper';
import FixtureBuilder from '../../fixtures/fixture-builder';
import {
  withFixtures,
  defaultGanacheOptions,
} from '../../fixtures/fixture-helper';
import TestHelpers from '../../helpers';
import Assertions from '../../utils/Assertions';
import NftDetectionModal from '../../pages/wallet/NftDetectionModal';
import { SmokeNetworkAbstractions } from '../../tags';

import { NftDetectionModalSelectorsText } from '../../selectors/wallet/NftDetectionModal.selectors';

describe(SmokeNetworkAbstractions('NFT Detection Modal'), () => {
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
        ganacheOptions: defaultGanacheOptions,
      },
      async () => {
        await loginToApp();
        await Assertions.checkIfVisible(NftDetectionModal.container);

        // fix flaky test: toast should desapear to get access to cancel button
        await TestHelpers.delay(5000);

        await NftDetectionModal.tapCancelButton();
        // Check that we are on the wallet screen
        await Assertions.checkIfVisible(WalletView.container);

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
          .withPreferencesController({
            useNftDetection: false,
          })
          .build(),
        restartDevice: true,
        ganacheOptions: defaultGanacheOptions,
      },
      async () => {
        await loginToApp();

        await Assertions.checkIfVisible(NftDetectionModal.container);
        await NftDetectionModal.tapAllowButton();
        // Check that we are on the wallet screen
        await Assertions.checkIfVisible(WalletView.container);

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
