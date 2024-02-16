'use strict';
import { SmokeCore } from '../../tags';
import TestHelpers from '../../helpers';
import WalletView from '../../pages/WalletView';
import AddCustomTokenView from '../../pages/AddCustomTokenView';
import NetworkListModal from '../../pages/modals/NetworkListModal';
import NetworkEducationModal from '../../pages/modals/NetworkEducationModal';
import { importWalletWithRecoveryPhrase, loginToApp } from '../../viewHelper';
import {
  withFixtures,
  defaultGanacheOptions,
} from '../../fixtures/fixture-helper';
import { SMART_CONTRACTS } from '../../../app/util/test/smart-contracts';
import FixtureBuilder from '../../fixtures/fixture-builder';

describe(SmokeCore('Import NFT'), () => {
  const SEPOLIA = 'Sepolia Test Network';

  beforeAll(async () => {
    jest.setTimeout(150000);
    await device.launchApp();
  });

  it('should import wallet and go to the wallet view', async () => {
    await importWalletWithRecoveryPhrase();
  });

  it('should switch to Sepolia network', async () => {
    await WalletView.tapNetworksButtonOnNavBar();
    await NetworkListModal.isVisible();
    await NetworkListModal.tapTestNetworkSwitch();
    await NetworkListModal.isTestNetworkToggleOn();
    await NetworkListModal.changeNetwork(SEPOLIA);
    await WalletView.isNetworkNameVisible(SEPOLIA);
  });

  it('should dismiss network education modal', async () => {
    await NetworkEducationModal.isVisible();
    await NetworkEducationModal.tapGotItButton();
    await NetworkEducationModal.isNotVisible();
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
        await WalletView.isVisible();
        // Wait for asset to load
        await TestHelpers.delay(3000);
        await WalletView.isNFTVisibleInWallet('TestDappNFTs');
        // Tap on Collectible
        await WalletView.tapOnNFTInWallet('TestDappNFTs');
        await WalletView.isNFTNameVisible('TestDappNFTs #1');
        await WalletView.scrollUpOnNFTsTab();
      },
    );
  });
});
