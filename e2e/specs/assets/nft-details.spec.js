'use strict';

import { SmokeNetworkAbstractions } from '../../tags';
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

describe(SmokeNetworkAbstractions('NFT Details page'), () => {
  const NFT_CONTRACT = SMART_CONTRACTS.NFTS;
  const TEST_DAPP_CONTRACT = 'TestDappNFTs';
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

        await WalletView.tapImportNFTButton();
        await Assertions.checkIfVisible(ImportNFTView.container);
        await ImportNFTView.typeInNFTAddress('1234');
        await ImportNFTView.typeInNFTIdentifier('');
        await Assertions.checkIfVisible(ImportNFTView.addressWarningMessage);
        //await ImportNFTView.tapBackButton();

        await ImportNFTView.typeInNFTAddress(nftsAddress);
        await ImportNFTView.typeInNFTIdentifier('1');

        await Assertions.checkIfVisible(WalletView.container);
        // Wait for asset to load
        await Assertions.checkIfVisible(
          WalletView.nftInWallet(TEST_DAPP_CONTRACT),
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
