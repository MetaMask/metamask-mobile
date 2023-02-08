'use strict';
import TestHelpers from '../helpers';

import OnboardingView from '../pages/Onboarding/OnboardingView';
import OnboardingCarouselView from '../pages/Onboarding/OnboardingCarouselView';
import ImportWalletView from '../pages/Onboarding/ImportWalletView';
import MetaMetricsOptIn from '../pages/Onboarding/MetaMetricsOptInView';

import WalletView from '../pages/WalletView';
import AccountListView from '../pages/AccountListView';
import ImportAccountView from '../pages/ImportAccountView';
import EnableAutomaticSecurityChecksView from '../pages/EnableAutomaticSecurityChecksView';

import DrawerView from '../pages/Drawer/DrawerView';
import SendView from '../pages/SendView';
import AmountView from '../pages/AmountView';
import TransactionConfirmationView from '../pages/TransactionConfirmView';
import AddCustomTokenView from '../pages/AddCustomTokenView';
import ImportTokensView from '../pages/ImportTokensView';

import OnboardingWizardModal from '../pages/modals/OnboardingWizardModal';
import NetworkListModal from '../pages/modals/NetworkListModal';
import RequestPaymentModal from '../pages/modals/RequestPaymentModal';
import NetworkEducationModal from '../pages/modals/NetworkEducationModal';
import WhatsNewModal from '../pages/modals/WhatsNewModal';

const SECRET_RECOVERY_PHRASE =
  'fold media south add since false relax immense pause cloth just raven';
const PASSWORD = `12345678`;
const TEST_PUBLIC_ADDRESS = '0xd3B9Cbea7856AECf4A6F7c3F4E8791F79cBeeD62';
const GOERLI = 'Goerli Test Network';
const ETHEREUM = 'Ethereum Main Network';
const COLLECTIBLE_CONTRACT_ADDRESS =
  '0x306d717D109e0995e0f56027Eb93D9C1d5686dE1';
const COLLECTIBLE_IDENTIFIER = '179';
const BLT_TOKEN_ADDRESS = '0x107c4504cd79c5d2696ea0030a8dd4e92601b82e';
const TEST_PRIVATE_KEY =
  'cbfd798afcfd1fd8ecc48cbecb6dc7e876543395640b758a90e11d986e758ad1';
const VALID_ADDRESS = '0xebe6CcB6B55e1d094d9c58980Bc10Fed69932cAb';

describe('Wallet Tests', () => {
  beforeEach(() => {
    jest.setTimeout(200000);
  });

  it('should tap on import seed phrase button', async () => {
    await OnboardingCarouselView.isVisible();
    await OnboardingCarouselView.tapOnGetStartedButton();

    await OnboardingView.isVisible();
    await OnboardingView.tapImportWalletFromSeedPhrase();

    await MetaMetricsOptIn.isVisible();
    await MetaMetricsOptIn.tapAgreeButton();

    await ImportWalletView.isVisible();
  });

  it('should import wallet with secret recovery phrase', async () => {
    await ImportWalletView.clearSecretRecoveryPhraseInputBox();
    await ImportWalletView.enterSecretRecoveryPhrase(SECRET_RECOVERY_PHRASE);
    await ImportWalletView.enterPassword(PASSWORD);
    await ImportWalletView.reEnterPassword(PASSWORD);
    await WalletView.isVisible();
  });

  it('Should dismiss Automatic Security checks screen', async () => {
    await TestHelpers.delay(3500);
    await EnableAutomaticSecurityChecksView.isVisible();
    await EnableAutomaticSecurityChecksView.tapNoThanks();
  });

  it('should tap on the close button to dismiss the whats new modal', async () => {
    // dealing with flakiness on bitrise.
    await TestHelpers.delay(2500);
    try {
      await WhatsNewModal.isVisible();
      await WhatsNewModal.tapCloseButton();
    } catch {
      //
    }
  });

  it('should dismiss the onboarding wizard', async () => {
    // dealing with flakiness on bitrise.
    await TestHelpers.delay(1000);
    try {
      await OnboardingWizardModal.isVisible();
      await OnboardingWizardModal.tapNoThanksButton();
      await OnboardingWizardModal.isNotVisible();
    } catch {
      //
    }
    await WalletView.isAccountBalanceCorrect();
  });

  it('should be able to add new accounts', async () => {
    // Tap on account icon to prompt modal
    await WalletView.tapIdenticon();
    await AccountListView.isVisible();

    // Tap on Create New Account
    await AccountListView.tapCreateAccountButton();
    await AccountListView.isNewAccountNameVisible();
  });

  it('should be able to import account', async () => {
    await AccountListView.isVisible();
    await AccountListView.tapImportAccountButton();

    await ImportAccountView.isVisible();
    // Tap on import button to make sure alert pops up
    await ImportAccountView.tapImportButton();
    await ImportAccountView.tapOKAlertButton();

    await ImportAccountView.enterPrivateKey(TEST_PRIVATE_KEY);
    // Check that we are on the account succesfully imported screen
    await ImportAccountView.isImportSuccessSreenVisible();
    await ImportAccountView.tapCloseButtonOnImportSuccess();

    await AccountListView.swipeToDimssAccountsModal();

    await WalletView.isVisible();
    await WalletView.isAccountNameCorrect('Account 3');
  });

  it('should be able to switch accounts', async () => {
    // Open Drawer
    await WalletView.tapDrawerButton();

    await DrawerView.isVisible();
    await DrawerView.tapAccountCaretButton();

    await AccountListView.isVisible();
    await AccountListView.swipeOnAccounts();
    await AccountListView.tapAccountByName('Account 1');

    await WalletView.tapDrawerButton();

    await DrawerView.isVisible();
    await DrawerView.tapOnAddFundsButton();

    await RequestPaymentModal.isVisible();
    await RequestPaymentModal.isPublicAddressCorrect(TEST_PUBLIC_ADDRESS);

    // Close Receive screen and go back to wallet screen
    await RequestPaymentModal.closeRequestModal();

    await DrawerView.isVisible();
    await DrawerView.closeDrawer();
    // Check that we are on the wallet screen
    await WalletView.isVisible();
  });

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
    await AddCustomTokenView.isNFTAddressWarningVisible(); // Check that warning appears
    await AddCustomTokenView.tapImportButton();
    // Check that identifier warning appears
    await AddCustomTokenView.isNFTIdentifierWarningVisible(); // Check that warning appears

    await AddCustomTokenView.tapBackButton();

    await WalletView.tapImportNFTButton();

    await AddCustomTokenView.isVisible();
    await AddCustomTokenView.typeInNFTAddress(COLLECTIBLE_CONTRACT_ADDRESS);
    await AddCustomTokenView.typeInNFTIdentifier(COLLECTIBLE_IDENTIFIER);

    await WalletView.isVisible();
    // Wait for asset to load
    await TestHelpers.delay(3000);
    // Check that the crypto kitty was added
    await WalletView.isNFTVisibleInWallet('Refinable721');
    // Tap on Crypto Kitty
    await WalletView.tapOnNFTInWallet('Refinable721');

    await WalletView.isNFTNameVisible('Refinable721 #179');

    await WalletView.scrollUpOnNFTsTab();
  });

  it('should switch back to Mainnet network', async () => {
    await WalletView.isVisible();
    // Tap on TOKENS tab
    await WalletView.tapTokensTab();
    // Switch to mainnet
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
    // Check that we are on the wallet screen
    // Tap on Add Tokens
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

  it('should add a custom token', async () => {
    // Tap on Add Tokens
    await WalletView.tapImportTokensButton();
    // Tap on CUSTOM TOKEN
    await AddCustomTokenView.tapCustomTokenTab();
    // Check that we are on the custom token screen
    await AddCustomTokenView.isVisible();
    // Type incorrect token address
    await AddCustomTokenView.typeTokenAddress('1234');
    // Check that address warning is displayed
    await AddCustomTokenView.isTokenAddressWarningVisible();

    // Type incorrect token symbol
    await AddCustomTokenView.typeTokenSymbol('ROCK');

    // Tap to focus outside of text input field
    await TestHelpers.delay(700);
    await AddCustomTokenView.tapTokenSymbolText();
    await TestHelpers.delay(700);
    // Check that token decimals warning is displayed
    await AddCustomTokenView.isTokenPrecisionWarningVisible();
    // Go back
    await AddCustomTokenView.tapBackButton();

    // Tap on Add Tokens
    await WalletView.tapImportTokensButton();
    // Tap on CUSTOM TOKEN
    await AddCustomTokenView.tapCustomTokenTab();
    // Check that we are on the custom token screen
    await AddCustomTokenView.isVisible();
    // Type correct token address

    await AddCustomTokenView.typeTokenAddress(BLT_TOKEN_ADDRESS);
    await AddCustomTokenView.tapTokenSymbolInputBox();
    await AddCustomTokenView.tapTokenSymbolText();
    await AddCustomTokenView.scrollDownOnImportCustomTokens();
    await AddCustomTokenView.tapCustomTokenImportButton();

    // Check that we are on the wallet screen
    await WalletView.isVisible();
    await TestHelpers.delay(10000); // to prevent flakey behavior in bitrise

    await WalletView.isTokenVisibleInWallet('0 BLT');
  });

  it('should switch to Goerli network', async () => {
    await WalletView.tapNetworksButtonOnNavBar();
    await NetworkListModal.isVisible();
    await NetworkListModal.changeNetwork(GOERLI);
    await WalletView.isNetworkNameVisible(GOERLI);
  });

  it('should input a valid address', async () => {
    // Check that we are on the wallet screen
    await WalletView.isVisible();
    // Open Drawer
    await WalletView.tapDrawerButton();

    await DrawerView.isVisible();
    await DrawerView.tapSendButton();

    await SendView.inputAddress(VALID_ADDRESS);
    await SendView.tapNextButton();
    // Check that we are on the amount view
    await AmountView.isVisible();
  });

  it('should input and validate amount', async () => {
    // Input amount
    await AmountView.typeInTransactionAmount('5');
    await AmountView.tapNextButton();

    // Check that the insufficient funds warning pops up
    await AmountView.isInsufficientFundsErrorVisible();

    // Input acceptable value
    await AmountView.typeInTransactionAmount('0.00004');
    await AmountView.tapNextButton();

    // Check that we are on the confirm view
    await TransactionConfirmationView.isVisible();
  });

  it('should send ETH to Account 2', async () => {
    // Check that the amount is correct
    await TransactionConfirmationView.isTransactionTotalCorrect(
      '0.00004 GoerliETH',
    );
    // Tap on the Send CTA
    await TransactionConfirmationView.tapConfirmButton();
    // Check that we are on the wallet screen
    await WalletView.isVisible();
  });
});
