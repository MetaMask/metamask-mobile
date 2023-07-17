'use strict';
import { Smoke } from '../tags';

import TestHelpers from '../helpers';
import WalletView from '../pages/WalletView';
import AddCustomTokenView from '../pages/AddCustomTokenView';
import ImportTokensView from '../pages/ImportTokensView';
import NetworkListModal from '../pages/modals/NetworkListModal';
import NetworkEducationModal from '../pages/modals/NetworkEducationModal';
import { importWalletWithRecoveryPhrase } from '../viewHelper';
import Collectibles from '../resources/collectibles.json';

describe(Smoke('Wallet Tests'), () => {
  const GOERLI = 'Goerli Test Network';
  const ETHEREUM = 'Ethereum Main Network';

  // This key is for testing private key import only
  // I should NEVER hold any eth or token

  beforeEach(() => {
    jest.setTimeout(200000);
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
    await AddCustomTokenView.isNFTAddressWarningVisible();
    await AddCustomTokenView.tapImportButton();

    await AddCustomTokenView.isNFTIdentifierWarningVisible();

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
    // Search for XRPL but select RPL
    await ImportTokensView.typeInTokenName('XRPL');
    await TestHelpers.delay(2000);

    await ImportTokensView.tapOnToken(); // taps the first token in the returned list
    await TestHelpers.delay(500);

    await ImportTokensView.tapImportButton();
    await WalletView.isVisible();
    await TestHelpers.delay(8000); // to prevent flakey behavior in bitrise

    await WalletView.isTokenVisibleInWallet('0 RPL');
    await WalletView.removeTokenFromWallet('0 RPL');
    await TestHelpers.delay(1500);
    await WalletView.tokenIsNotVisibleInWallet('0 RPL');
  });
});
