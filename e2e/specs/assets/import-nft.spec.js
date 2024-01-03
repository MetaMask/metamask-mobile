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
<<<<<<< HEAD:e2e/specs/wallet/wallet-tests.spec.js

  it('should switch back to Mainnet network', async () => {
    await WalletView.isVisible();
    await WalletView.tapTokensTab();
    await WalletView.tapNetworksButtonOnNavBar();
    await NetworkListModal.isVisible();
    await NetworkListModal.changeNetwork(ETHEREUM);
    await WalletView.isNetworkNameVisible(ETHEREUM);
  });

  it('should dismiss mainnet network education modal', async () => {
    await NetworkEducationModal.isVisible();
    await NetworkEducationModal.tapGotItButton();
    await NetworkEducationModal.isNotVisible();
  });

  it('should add a token via token autocomplete', async () => {
    await WalletView.tapImportTokensButton();
    // Search for XRPL but select XRP20
    await ImportTokensView.typeInTokenName('XRPL');
    await TestHelpers.delay(2000);
    await ImportTokensView.tapOnToken(); // taps the first token in the returned list
    await TestHelpers.delay(500);
    await ImportTokensView.tapImportButton();
    await WalletView.isVisible();
    await TestHelpers.delay(8000); // to prevent flakey behavior in bitrise
    await WalletView.isTokenVisibleInWallet('0 XRP');
  });

  it('should hide token from Wallet view', async () => {
    await WalletView.removeTokenFromWallet('0 XRP');
    await TestHelpers.delay(1500);
    await WalletView.tokenIsNotVisibleInWallet('XRP');
  });
=======
>>>>>>> main:e2e/specs/assets/import-nft.spec.js
});
