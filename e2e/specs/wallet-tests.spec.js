'use strict';
import { Smoke } from '../tags';

import TestHelpers from '../helpers';
import WalletView from '../pages/WalletView';
// import ImportAccountView from '../pages/ImportAccountView';
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
  // const TEST_PRIVATE_KEY =
  //   'cbfd798afcfd1fd8ecc48cbecb6dc7e876543395640b758a90e11d986e758ad1';

  beforeEach(() => {
    jest.setTimeout(200000);
  });

  it('should import wallet and go to the wallet view', async () => {
    await importWalletWithRecoveryPhrase();
  });

  // Disabling for now until the RN 71 branch is ready.

  // it('should be able to add new accounts', async () => {
  //   await WalletView.tapIdenticon();
  //   await AccountListView.isVisible();

  //   // Tap on Create New Account
  //   await AccountListView.tapCreateAccountButton();
  //   await AccountListView.isNewAccountNameVisible();
  // });

  // it('should be able to import account', async () => {
  //   await AccountListView.isVisible();
  //   await AccountListView.tapImportAccountButton();

  //   await ImportAccountView.isVisible();
  //   // Tap on import button to make sure alert pops up
  //   await ImportAccountView.tapImportButton();
  //   await ImportAccountView.tapOKAlertButton();

  //   await ImportAccountView.enterPrivateKey(TEST_PRIVATE_KEY);
  //   await ImportAccountView.isImportSuccessSreenVisible();
  //   await ImportAccountView.tapCloseButtonOnImportSuccess();

  //   await AccountListView.swipeToDimssAccountsModal();

  //   await WalletView.isVisible();
  //   await WalletView.isAccountNameCorrect('Account 3');
  // });

  // it('should be able to switch accounts', async () => {
  //   await WalletView.tapDrawerButton();

  //   await DrawerView.isVisible();
  //   await DrawerView.tapAccountCaretButton();

  //   await AccountListView.isVisible();
  //   await AccountListView.swipeOnAccounts();
  //   await AccountListView.tapAccountByName('Account 1');

  //   await WalletView.tapDrawerButton();

  //   await DrawerView.isVisible();
  //   await DrawerView.tapOnAddFundsButton();

  //   await RequestPaymentModal.isVisible();
  //   await RequestPaymentModal.isPublicAddressCorrect(validAccount.address);

  //   await RequestPaymentModal.closeRequestModal();

  //   await WalletView.isVisible();
  // });

  it('should switch to Goerli network', async () => {
    await WalletView.tapNetworksButtonOnNavBar();
    await NetworkListModal.isVisible();
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

  it('should add a token', async () => {
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
