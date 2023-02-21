'use strict';
import TestHelpers from '../helpers';

import OnboardingView from '../pages/Onboarding/OnboardingView';
import OnboardingCarouselView from '../pages/Onboarding/OnboardingCarouselView';
import ImportWalletView from '../pages/Onboarding/ImportWalletView';
import MetaMetricsOptIn from '../pages/Onboarding/MetaMetricsOptInView';
import WalletView from '../pages/WalletView';
import ImportAccountView from '../pages/ImportAccountView';
import TabBarComponent from '../pages/TabBarComponent';
import TransactionConfirmationView from '../pages/TransactionConfirmView';

import Browser from '../pages/Drawer/Browser';
import { BROWSER_SCREEN_ID } from '../../wdio/screen-objects/testIDs/BrowserScreen/BrowserScreen.testIds';
import EnableAutomaticSecurityChecksView from '../pages/EnableAutomaticSecurityChecksView';
import AccountListView from '../pages/AccountListView';

import ConnectModal from '../pages/modals/ConnectModal';
import ConnectedAccountsModal from '../pages/modals/ConnectedAccountsModal';
import NetworkListModal from '../pages/modals/NetworkListModal';
import NetworkEducationModal from '../pages/modals/NetworkEducationModal';

import OnboardingWizardModal from '../pages/modals/OnboardingWizardModal';
import WhatsNewModal from '../pages/modals/WhatsNewModal';

const TEST_DAPP = 'https://metamask.github.io/test-dapp/';
const PASSWORD = '12345678';
const GOERLI = 'Goerli Test Network';

const SECRET_RECOVERY_PHRASE =
  'ketchup width ladder rent cheap eye torch employ quantum evidence artefact render protect delay wrap identify valley umbrella yard ridge wool swap differ kidney';
const TEST_PRIVATE_KEY =
  '0d5ccb94db3953df52183134e0bce82a132afb5fddd14a157e2ae91c4d3cf141';

describe('Permission System Test: Revoking accounts after connecting to a dapp', () => {
  beforeEach(() => {
    jest.setTimeout(150000);
  });

  it('should import wallet with secret recovery phrase', async () => {
    await OnboardingCarouselView.isVisible();
    await OnboardingCarouselView.tapOnGetStartedButton();

    await OnboardingView.isVisible();
    await OnboardingView.tapImportWalletFromSeedPhrase();

    await MetaMetricsOptIn.isVisible();
    await MetaMetricsOptIn.tapAgreeButton();

    await ImportWalletView.isVisible();
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
    await TestHelpers.delay(2000);
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
  });

  it('should navigate to browser', async () => {
    await TestHelpers.delay(2000);
    await TabBarComponent.tapBrowser();
    // Check that we are on the browser screen
    await Browser.isVisible();
  });

  it('should connect to the test dapp', async () => {
    await TestHelpers.delay(3000);
    // Tap on search in bottom navbar
    await Browser.tapUrlInputBox();
    await Browser.navigateToURL(TEST_DAPP);
    await TestHelpers.delay(3000);
    await TestHelpers.tapAtPoint(BROWSER_SCREEN_ID, { x: 150, y: 270 });
    await ConnectModal.isVisible();
  });

  it('should go to multiconnect in the connect account modal', async () => {
    // Wait for page to load
    await ConnectModal.tapConnectMultipleAccountsButton();
  });

  it('should import account and connect to dapp', async () => {
    // Wait for page to load
    await ConnectModal.tapImportAccountButton();
    await ImportAccountView.isVisible();
    await ImportAccountView.enterPrivateKey(TEST_PRIVATE_KEY);
    // Check that we are on the account succesfully imported screen
    await ImportAccountView.isImportSuccessSreenVisible();
    await ImportAccountView.tapCloseButtonOnImportSuccess();

    await ConnectModal.tapSelectAllButton();

    await ConnectModal.tapAccountConnectMultiSelectButton();
  });

  it('should set the imported account as primary account', async () => {
    await Browser.tapNetworkAvatarButtonOnBrowser();
    await TestHelpers.delay(1500);
    await ConnectedAccountsModal.tapToSetAsPrimaryAccount();
  });

  it('should switch to Goreli', async () => {
    await Browser.tapNetworkAvatarButtonOnBrowser();
    await TestHelpers.tap('accounts-connected-network-picker');
    await NetworkListModal.changeNetwork(GOERLI);
  });

  it('should dismiss the network education modal', async () => {
    await NetworkEducationModal.isVisible();
    await NetworkEducationModal.tapGotItButton();
    await NetworkEducationModal.isNotVisible();
  });

  it('should dismiss the connected accounts modal', async () => {
    await ConnectedAccountsModal.swipeToDimssConnectedAccountsModal();
    await ConnectedAccountsModal.isNotVisible();
  });

  it('should submit a dapp transaction ', async () => {
    await TestHelpers.swipe(BROWSER_SCREEN_ID, 'up', 'slow', 0.2);
    await TestHelpers.tapAtPoint(BROWSER_SCREEN_ID, { x: 250, y: 420 }); // tapping connect button

    await TestHelpers.tapByText('Confirm', 1);
    await TransactionConfirmationView.isNotVisible();
  });

  it('should navigate to wallet view', async () => {
    await TabBarComponent.tapWallet();
    // Check that we are on the browser screen
    await WalletView.isVisible();
  });

  it('should remove imported account', async () => {
    // Wait for page to load
    await WalletView.tapIdenticon();
    await AccountListView.isVisible();
    await AccountListView.longPressImportedAccount();
    await AccountListView.tapYesToRemoveImportedAccountAlertButton();
    await AccountListView.accountNameNotVisible('Account 2');
  });

  it('should return to browser', async () => {
    await AccountListView.swipeToDimssAccountsModal();
    await TabBarComponent.tapBrowser();
    // Check that we are on the browser screen
    await Browser.isVisible();
  });

  it('imported account is not visible', async () => {
    await Browser.tapNetworkAvatarButtonOnBrowser();
    // await Browser.tapNetworkAvatarButtonOnBrowser();
    await ConnectedAccountsModal.isVisible();
    await AccountListView.accountNameNotVisible('Account 2');
  });
});
