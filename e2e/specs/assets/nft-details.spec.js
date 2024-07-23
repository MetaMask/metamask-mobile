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
import AddCustomTokenView from '../../pages/AddCustomTokenView';
import Assertions from '../../utils/Assertions';
import enContent from '../../../locales/languages/en.json';

describe(SmokeAssets('NFT Details page'), () => {
  const NFT_CONTRACT = SMART_CONTRACTS.NFTS;
  beforeAll(async () => {
    jest.setTimeout(170000);
    await TestHelpers.reverseServerPort();
  });

  it('show nft details', async () => {
    await withFixtures(
      {
        dapp: true,
        fixture: new FixtureBuilder()
          .withGanacheNetwork()
          .withPermissionControllerConnectedToTestDapp()
          .build(),
        restartDevice: true,
        ganacheOptions: defaultGanacheOptions,
        smartContract: NFT_CONTRACT,
      },
      async ({ contractRegistry }) => {
        const nftsAddress = await contractRegistry.getContractAddress(
          NFT_CONTRACT,
        );

        await loginToApp();

        await WalletView.tapNftTab();
        await WalletView.scrollDownOnNFTsTab();
        // Tap on the add collectibles button
        await WalletView.tapImportNFTButton();
        await AddCustomTokenView.isVisible();
        await AddCustomTokenView.typeInNFTAddress(nftsAddress);
        await AddCustomTokenView.typeInNFTIdentifier('1');

        await Assertions.checkIfVisible(WalletView.container);
        // Wait for asset to load
        await Assertions.checkIfVisible(WalletView.nftInWallet('TestDappNFTs'));
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
