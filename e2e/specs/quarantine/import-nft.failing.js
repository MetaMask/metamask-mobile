'use strict';
import { SmokeAssets } from '../../tags';
import Assertions from '../../utils/Assertions';
import WalletView from '../../pages/wallet/WalletView';
import AddCustomTokenView from '../../pages/AddCustomTokenView';
import { loginToApp } from '../../viewHelper';
import {
  withFixtures,
  defaultGanacheOptions,
} from '../../fixtures/fixture-helper';
import { SMART_CONTRACTS } from '../../../app/util/test/smart-contracts';
import FixtureBuilder from '../../fixtures/fixture-builder';

describe(SmokeAssets('Import NFT'), () => {
  beforeAll(async () => {
    jest.setTimeout(150000);
  });

  it('should add a collectible', async () => {
    const SMART_CONTRACT = SMART_CONTRACTS.NFTS;
    await withFixtures(
      {
        dapp: true,
        fixture: new FixtureBuilder()
          .withGanacheNetwork()
          .withPermissionControllerConnectedToTestDapp()
          .build(),
        restartDevice: true,
        ganacheOptions: defaultGanacheOptions,
        smartContract: SMART_CONTRACT,
      },
      async ({ contractRegistry }) => {
        const erc1155ContractAddress =
          await contractRegistry.getContractAddress(SMART_CONTRACT);
        await loginToApp();
        // Tap on COLLECTIBLES tab
        await WalletView.tapNftTab();
        await WalletView.scrollDownOnNFTsTab();
        // Tap on the add collectibles button
        await WalletView.tapImportNFTButton();
        await AddCustomTokenView.isVisible();
        // Input incorrect contract address
        await AddCustomTokenView.typeInNFTAddress('1234');
        await AddCustomTokenView.typeInNFTIdentifier('');
        await AddCustomTokenView.isNFTAddressWarningVisible();
        await AddCustomTokenView.tapBackButton();
        await WalletView.tapImportNFTButton();
        await AddCustomTokenView.isVisible();
        await AddCustomTokenView.typeInNFTAddress(erc1155ContractAddress);
        await AddCustomTokenView.typeInNFTIdentifier('1');
        await Assertions.checkIfVisible(WalletView.container);
        // Wait for asset to load
        await Assertions.checkIfVisible(WalletView.nftInWallet('TestDappNFTs'));
        // Tap on Collectible
        await WalletView.tapOnNFTInWallet('TestDappNFTs');
        //TODO: isNFTNameVisible have been removed. Update it for valid implementations
        //await WalletView.isNFTNameVisible('TestDappNFTs #1');
        await WalletView.scrollUpOnNFTsTab();
      },
    );
  });
});
