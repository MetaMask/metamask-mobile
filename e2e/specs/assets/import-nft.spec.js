'use strict';
import { SmokeCore } from '../../tags';
import TestHelpers from '../../helpers';
import WalletView from '../../pages/WalletView';
import AddCustomTokenView from '../../pages/AddCustomTokenView';
import NetworkListModal from '../../pages/modals/NetworkListModal';
import NetworkEducationModal from '../../pages/modals/NetworkEducationModal';
import { importWalletWithRecoveryPhrase } from '../../viewHelper';
import Collectibles from '../../resources/collectibles.json';

describe(SmokeCore('Import NFT'), () => {
  const GOERLI = 'Goerli Test Network';

  beforeAll(async () => {
    jest.setTimeout(150000);
    await device.launchApp();
  });

  it('should import wallet and go to the wallet view', async () => {
    await importWalletWithRecoveryPhrase();
  });

  it('should switch to Goerli network', async () => {
    await WalletView.tapNetworksButtonOnNavBar();
    await NetworkListModal.isVisible();
    await NetworkListModal.tapTestNetworkSwitch();
    await NetworkListModal.isTestNetworkToggleOn();
    await NetworkListModal.changeNetwork(GOERLI);
    await WalletView.isNetworkNameVisible(GOERLI);
  });

  it('should dismiss network education modal', async () => {
    await NetworkEducationModal.isVisible();
    await NetworkEducationModal.tapGotItButton();
    await NetworkEducationModal.isNotVisible();
  });

  it('should add a collectible', async () => {
    await WalletView.isVisible();
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
    await AddCustomTokenView.typeInNFTAddress(Collectibles.erc1155tokenAddress);
    await AddCustomTokenView.typeInNFTIdentifier(Collectibles.erc1155tokenID);
    await WalletView.isVisible();
    // Wait for asset to load
    await TestHelpers.delay(3000);
    await WalletView.isNFTVisibleInWallet(Collectibles.erc1155collectionName);
    // Tap on Collectible
    await WalletView.tapOnNFTInWallet(Collectibles.erc1155collectionName);
    await WalletView.isNFTNameVisible(Collectibles.erc1155tokenName);
    await WalletView.scrollUpOnNFTsTab();
  });
});
