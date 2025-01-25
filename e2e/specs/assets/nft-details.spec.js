'use strict';

import { SmokeAssets } from '../../tags';
import TestHelpers from '../../helpers';
import { loginToApp } from '../../viewHelper';
import FixtureBuilder from '../../fixtures/fixture-builder';
import {
  withFixtures,
  defaultGanacheOptions,
} from '../../fixtures/fixture-helper';
import { SMART_CONTRACTS } from '../../../app/util/test/smart-contracts';
import WalletView from '../../pages/wallet/WalletView';
import ImportNFTView from '../../pages/wallet/ImportNFTFlow/ImportNFTView';
import Assertions from '../../utils/Assertions';
import enContent from '../../../locales/languages/en.json';
import NftDetectionModal from '../../pages/wallet/NftDetectionModal';
import { NftDetectionModalSelectorsText } from '../../selectors/wallet/NftDetectionModal.selectors';

describe(SmokeAssets('NFT Details page'), () => {
  // eslint-disable-next-line @metamask/design-tokens/color-no-hex
  const testNftOnMainnet = "Life's A Joke #2875";
  beforeAll(async () => {
    jest.setTimeout(170000);
    await TestHelpers.reverseServerPort();
  });

  it('show nft details', async () => {
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

        await Assertions.checkIfVisible(
          WalletView.nftIDInWallet(testNftOnMainnet),
        );

        await WalletView.tapOnNftName();
        await Assertions.checkIfTextIsDisplayed(enContent.nft_details.token_id);
        await Assertions.checkIfTextIsDisplayed(
          enContent.nft_details.contract_address,
        );
        await Assertions.checkIfTextIsDisplayed(
          enContent.nft_details.token_standard,
        );
      },
    );
  });
});
