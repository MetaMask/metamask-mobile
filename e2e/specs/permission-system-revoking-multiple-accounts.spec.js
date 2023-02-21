'use strict';
import TestHelpers from '../helpers';

import OnboardingView from '../pages/Onboarding/OnboardingView';
import OnboardingCarouselView from '../pages/Onboarding/OnboardingCarouselView';
import ImportWalletView from '../pages/Onboarding/ImportWalletView';
import MetaMetricsOptIn from '../pages/Onboarding/MetaMetricsOptInView';
import WalletView from '../pages/WalletView';
import Browser from '../pages/Drawer/Browser';
import { BROWSER_SCREEN_ID } from '../../wdio/screen-objects/testIDs/BrowserScreen/BrowserScreen.testIds';

import EnableAutomaticSecurityChecksView from '../pages/EnableAutomaticSecurityChecksView';
import AccountListView from '../pages/AccountListView';
import TabBarComponent from '../pages/TabBarComponent';

import ConnectModal from '../pages/modals/ConnectModal';
import ConnectedAccountsModal from '../pages/modals/ConnectedAccountsModal';
import NetworkListModal from '../pages/modals/NetworkListModal';

import OnboardingWizardModal from '../pages/modals/OnboardingWizardModal';
import WhatsNewModal from '../pages/modals/WhatsNewModal';

const SUSHI_SWAP = 'https://app.sushi.com/swap';
const TEST_DAPP = 'https://metamask.github.io/test-dapp/';

const PASSWORD = '12345678';

const SECRET_RECOVERY_PHRASE =
  'fold media south add since false relax immense pause cloth just raven';

describe('Connecting to multiple dapps and revoking permission on one but staying connected to the other', () => {
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
    await TabBarComponent.tapBrowser();
    // Check that we are on the browser screen
    await Browser.isVisible();
  });

  it('should connect to sushi swap dapp', async () => {
    await TestHelpers.delay(3000);
    // Tap on search in bottom navbar
    await Browser.tapUrlInputBox();
    await Browser.navigateToURL(SUSHI_SWAP);
    await ConnectModal.isVisible();
    await ConnectModal.tapConnectButton();
  });

  it('should go to the test dapp', async () => {
    // Tap on search in bottom navbar
    await Browser.tapOpenAllTabsButton();
    await Browser.tapOpenNewTabButton();
    await Browser.tapUrlInputBox();
    await Browser.navigateToURL(TEST_DAPP);
    await Browser.waitForBrowserPageToLoad();
    await TestHelpers.tapAtPoint(BROWSER_SCREEN_ID, { x: 150, y: 270 });
    await ConnectModal.isVisible();
  });

  it('should go to multiconnect in the connect account modal', async () => {
    await ConnectModal.tapConnectMultipleAccountsButton();
  });

  it('should connect with multiple accounts', async () => {
    // Wait for page to load
    await ConnectModal.tapCreateAccountButton();
    await AccountListView.isNewAccountNameVisible();
    await AccountListView.tapAccountByName('Account 2');

    await ConnectModal.tapAccountConnectMultiSelectButton();
  });

  it('should revoke accounts', async () => {
    await Browser.tapNetworkAvatarButtonOnBrowser();
    await ConnectedAccountsModal.tapPermissionsButton();
    await TestHelpers.delay(1500);
    await ConnectedAccountsModal.tapRevokeAllButton();
  });

  it('should no longer be connected to the test dapp', async () => {
    await Browser.tapNetworkAvatarButtonOnBrowser();
    await ConnectedAccountsModal.isNotVisible();
    await NetworkListModal.tapNetworkListCloseIcon();
  });

  it('should open sushi swap dapp', async () => {
    // Wait for page to load
    await Browser.tapOpenAllTabsButton();
    await TestHelpers.tapByText('app.sushi.com');
  });

  it('should still be connected to sushi swap', async () => {
    // Wait for page to load
    await Browser.tapNetworkAvatarButtonOnBrowser();
    await ConnectedAccountsModal.isVisible();
  });
});
