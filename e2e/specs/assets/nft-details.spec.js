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
  const testNftOnMainnetAddress = '0x6cb26df0c825fece867a84658f87b0ecbcea72f6';
  const testNftOnMainnetID = '2875';
  const badNftId = '1234';
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
        await NftDetectionModal.tapCancelButton();
        // Check that we are on the wallet screen
        await Assertions.checkIfVisible(WalletView.container);

        // Go to NFTs tab
        await WalletView.tapNftTab();

        // Go to Import NFT flow
        await WalletView.tapImportNFTButton();
        await Assertions.checkIfVisible(ImportNFTView.container);

        // Import bad NFT address
        await ImportNFTView.typeInNFTAddress(badNftId);
        await ImportNFTView.typeInNFTIdentifier('');
        await Assertions.checkIfVisible(ImportNFTView.addressWarningMessage);

        // Import Mainnet NFT address
        await ImportNFTView.typeInNFTAddress(testNftOnMainnetAddress);
        await ImportNFTView.typeInNFTIdentifier(testNftOnMainnetID);

        // Ensure that NFT gets imported, and data propogates to detail page
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
