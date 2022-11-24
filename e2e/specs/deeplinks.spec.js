'use strict';
import TestHelpers from '../helpers';

import OnboardingView from '../pages/Onboarding/OnboardingView';
import OnboardingCarouselView from '../pages/Onboarding/OnboardingCarouselView';
import MetaMetricsOptIn from '../pages/Onboarding/MetaMetricsOptInView';
import ImportWalletView from '../pages/Onboarding/ImportWalletView';

import OnboardingWizardModal from '../pages/modals/OnboardingWizardModal';
import ConnectModal from '../pages/modals/ConnectModal';
//import NetworkEducationModal from '../pages/modals/NetworkEducationModal';
import NetworkApprovalModal from '../pages/modals/NetworkApprovalModal';
import NetworkAddedModal from '../pages/modals/NetworkAddedModal';
import WhatsNewModal from '../pages/modals/WhatsNewModal';

import { Browser } from '../pages/Drawer/Browser';
import DrawerView from '../pages/Drawer/DrawerView';
import NetworkView from '../pages/Drawer/Settings/NetworksView';
import SettingsView from '../pages/Drawer/Settings/SettingsView';
import LoginView from '../pages/LoginView';
import TransactionConfirmationView from '../pages/TransactionConfirmView';
import EnableAutomaticSecurityChecksView from '../pages/EnableAutomaticSecurityChecksView';

import SecurityAndPrivacy from '../pages/Drawer/Settings/SecurityAndPrivacy/SecurityAndPrivacyView';

import WalletView from '../pages/WalletView';

const SECRET_RECOVERY_PHRASE =
  'fold media south add since false relax immense pause cloth just raven';
const PASSWORD = `12345678`;

const BINANCE_RPC_URL = 'https://bsc-dataseed1.binance.org';

const BINANCE_DEEPLINK_URL =
  'https://metamask.app.link/send/0xB8B4EE5B1b693971eB60bDa15211570df2dB228A@56?value=1e14';

const POLYGON_DEEPLINK_URL =
  'https://metamask.app.link/send/0x0000000000000000000000000000000000001010@137/transfer?address=0xC5b2b5ae370876c0122910F92a13bef85A133E56&uint256=3e18';

const ETHEREUM_DEEPLINK_URL =
  'https://metamask.app.link/send/0x1FDb169Ef12954F20A15852980e1F0C122BfC1D6@1?value=1e13';
const GOERLI_DEEPLINK_URL =
  'https://metamask.app.link/send/0x1FDb169Ef12954F20A15852980e1F0C122BfC1D6@5?value=1e13';

const DAPP_DEEPLINK_URL = 'https://metamask.app.link/dapp/app.sushi.com';

const networkNotFoundText = 'Network not found';
const networkErrorBodyMessage =
  'Network with chain id 56 not found in your wallet. Please add the network first.';

describe('Deep linking Tests', () => {
  beforeEach(() => {
    jest.setTimeout(150000);
  });

  it('should import via seed phrase and validate in settings', async () => {
    await OnboardingCarouselView.isVisible();
    await OnboardingCarouselView.tapOnGetStartedButton();

    await OnboardingView.isVisible();
    await OnboardingView.tapImportWalletFromSeedPhrase();

    await MetaMetricsOptIn.isVisible();
    await MetaMetricsOptIn.tapAgreeButton();

    await ImportWalletView.isVisible();
  });

  it('should attempt to import wallet with invalid secret recovery phrase', async () => {
    //await ImportWalletView.toggleRememberMe();
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

  it('should tap on the close button in the whats new modal', async () => {
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
  });

  it('should go to the Privacy and settings view', async () => {
    await WalletView.tapDrawerButton(); // tapping burger menu

    await DrawerView.isVisible();
    await DrawerView.tapSettings();

    await SettingsView.tapSecurityAndPrivacy();

    await SecurityAndPrivacy.scrollToTurnOnRememberMe();
    TestHelpers.delay(3000);
  });

  it('should enable remember me', async () => {
    await SecurityAndPrivacy.isRememberMeToggleOff();
    await SecurityAndPrivacy.tapTurnOnRememberMeToggle();
    await SecurityAndPrivacy.isRememberMeToggleOn();

    TestHelpers.delay(1500);
  });

  it('should relaunch the app then enable remember me', async () => {
    // Relaunch app
    await TestHelpers.relaunchApp();
    await LoginView.isVisible();
    await LoginView.toggleRememberMe();

    await LoginView.enterPassword(PASSWORD);
    await WalletView.isVisible();
  });

  it('should deep link to Binance Smart Chain & show a network not found error message', async () => {
    await TestHelpers.openDeepLink(BINANCE_DEEPLINK_URL);
    await TestHelpers.delay(3000);
    await TestHelpers.checkIfElementWithTextIsVisible(networkNotFoundText);
    await TestHelpers.checkIfElementWithTextIsVisible(networkErrorBodyMessage);

    await WalletView.tapOKAlertButton();
  });

  it('should go to settings then networks', async () => {
    // Open Drawer
    await WalletView.tapDrawerButton(); // tapping burger menu

    await DrawerView.isVisible();
    await DrawerView.tapSettings();

    await SettingsView.tapNetworks();

    await NetworkView.isNetworkViewVisible();
  });

  it('should add BSC network', async () => {
    // Tap on Add Network button
    await TestHelpers.delay(3000);
    await NetworkView.tapAddNetworkButton();

    await NetworkView.isRpcViewVisible();
    await NetworkView.tapPopularNetworkByName('BNB Smart Chain');

    await NetworkApprovalModal.isVisible();
    await NetworkApprovalModal.isDisplayNameVisible('BNB Smart Chain');
    await NetworkApprovalModal.isNetworkURLVisible(BINANCE_RPC_URL);
    await NetworkApprovalModal.isChainIDVisible('56');
    await NetworkApprovalModal.tapApproveButton();

    await NetworkAddedModal.isVisible();
    await NetworkAddedModal.tapCloseButton();
    await NetworkView.isRpcViewVisible();

    //await WalletView.isVisible();
  });

  it('should add polygon network', async () => {
    await NetworkView.tapPopularNetworkByName('Polygon Mainnet');

    await NetworkApprovalModal.isVisible();
    await NetworkApprovalModal.isDisplayNameVisible('Polygon Mainnet');
    //await NetworkApprovalModal.isNetworkURLVisible(POLYGON_RPC_URL);
    await NetworkApprovalModal.isChainIDVisible('137');

    await NetworkApprovalModal.tapApproveButton();
    await TestHelpers.delay(1000);

    await NetworkAddedModal.isVisible();
    await NetworkAddedModal.tapSwitchToNetwork();

    await WalletView.isVisible();
    await WalletView.isNetworkNameVisible('Polygon Mainnet');
  });

  it('should deep link to the send flow on matic', async () => {
    await TestHelpers.openDeepLink(POLYGON_DEEPLINK_URL);

    await TestHelpers.delay(4500);
    await TransactionConfirmationView.isVisible();
    await TransactionConfirmationView.isNetworkNameVisible('Polygon Mainnet');
    await TestHelpers.delay(1500);
    await TransactionConfirmationView.tapCancelButton();
  });
  it('should deep link to the send flow on BSC', async () => {
    await TestHelpers.openDeepLink(BINANCE_DEEPLINK_URL);
    await TestHelpers.delay(4500);
    await TransactionConfirmationView.isVisible();
    await TransactionConfirmationView.isNetworkNameVisible('BNB Smart Chain');
  });

  it('should deep link to the send flow on Goerli and submit the transaction', async () => {
    await TestHelpers.openDeepLink(GOERLI_DEEPLINK_URL);
    await TestHelpers.delay(4500);
    await TransactionConfirmationView.isVisible();
    await TransactionConfirmationView.isNetworkNameVisible(
      'Goerli Test Network',
    );
    await TransactionConfirmationView.isTransactionTotalCorrect(
      '0.00001 GoerliETH',
    );
    // Tap on the Send CTA
    await TransactionConfirmationView.tapConfirmButton();
    // Check that we are on the wallet screen
    await WalletView.isVisible();
  });

  it('should deep link to the send flow on mainnet', async () => {
    await TestHelpers.openDeepLink(ETHEREUM_DEEPLINK_URL);
    await TestHelpers.delay(4500);

    await TransactionConfirmationView.isVisible();
    await TransactionConfirmationView.isNetworkNameVisible(
      'Ethereum Main Network',
    );
    await TransactionConfirmationView.tapCancelButton();
  });

  it('should deep link to a dapp (Sushi swap)', async () => {
    await TestHelpers.openDeepLink(DAPP_DEEPLINK_URL);
    await TestHelpers.delay(4500);

    await ConnectModal.isVisible();
    await ConnectModal.tapConnectButton();

    await TestHelpers.checkIfElementWithTextIsVisible('app.sushi.com', 0);

    await Browser.isVisible();
    await ConnectModal.isNotVisible();
  });
});
