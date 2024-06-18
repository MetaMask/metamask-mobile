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
import { SmokeNftDetection } from '../../tags';
import NetworkListModal from '../../pages/modals/NetworkListModal';
import NetworkEducationModal from '../../pages/modals/NetworkEducationModal';
import enContent from '../../../locales/languages/en.json';

describe(SmokeNftDetection('NFT Detection Modal'), () => {
  const ETHEREUM = 'Ethereum Main Network';
  beforeAll(async () => {
    jest.setTimeout(170000);
    await TestHelpers.reverseServerPort();
  });

  it('should show nft detection modal after switching to mainnet and when nftDetection toggle is off and tap cancel', async () => {
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

        // Tap on Close for the privacy toast
        await TestHelpers.waitAndTapByLabel('Close');

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
        await TestHelpers.checkIfElementByTextIsVisible(
          enContent.wallet.nfts_autodetection_desc,
        );
      },
    );
  });

  it('should show nft detection modal after switching to mainnet and when nftDetection toggle is off and tap allow', async () => {
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

        // Tap on Close for the privacy toast
        await TestHelpers.waitAndTapByLabel('Close');

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
        await TestHelpers.checkIfNotVisible(
          enContent.wallet.nfts_autodetection_desc,
        );
      },
    );
  });
});
