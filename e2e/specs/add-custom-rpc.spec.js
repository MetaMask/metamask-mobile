'use strict';
import TestHelpers from '../helpers';

import OnboardingView from '../pages/Onboarding/OnboardingView';
import OnboardingCarouselView from '../pages/Onboarding/OnboardingCarouselView';
import ProtectYourWalletView from '../pages/Onboarding/ProtectYourWalletView';
import CreatePasswordView from '../pages/Onboarding/CreatePasswordView';

import NetworkView from '../pages/Drawer/Settings/NetworksView';

import MetaMetricsOptIn from '../pages/Onboarding/MetaMetricsOptInView';
import WalletView from '../pages/WalletView';
import DrawerView from '../pages/Drawer/DrawerView';
import SettingsView from '../pages/Drawer/Settings/SettingsView';

import NetworkListModal from '../pages/modals/NetworkListModal';
import NetworkEducationModal from '../pages/modals/NetworkEducationModal';

import SkipAccountSecurityModal from '../pages/modals/SkipAccountSecurityModal';
import OnboardingWizardModal from '../pages/modals/OnboardingWizardModal';
import ProtectYourWalletModal from '../pages/modals/ProtectYourWalletModal';
import WhatsNewModal from '../pages/modals/WhatsNewModal';
import EnableAutomaticSecurityChecksView from '../pages/EnableAutomaticSecurityChecksView';
const GORELI = 'Goerli Test Network';
const XDAI_URL = 'https://rpc.gnosischain.com';
const MAINNET = 'Ethereum Main Network';
const PASSWORD = '12345678';

describe('Custom RPC Tests', () => {
  beforeEach(() => {
    jest.setTimeout(170000);
  });

  it('should create new wallet', async () => {
    await OnboardingCarouselView.isVisible();
    await OnboardingCarouselView.tapOnGetStartedButton();

    await OnboardingView.isVisible();
    await OnboardingView.tapCreateWallet();

    await MetaMetricsOptIn.isVisible();
    await MetaMetricsOptIn.tapNoThanksButton();

    await CreatePasswordView.isVisible();
    await CreatePasswordView.enterPassword(PASSWORD);
    await CreatePasswordView.reEnterPassword(PASSWORD);
    await CreatePasswordView.tapIUnderstandCheckBox();
    await CreatePasswordView.tapCreatePasswordButton();
  });

  it('Should skip backup check', async () => {
    // Check that we are on the Secure your wallet screen
    await ProtectYourWalletView.isVisible();
    await ProtectYourWalletView.tapOnRemindMeLaterButton();

    await SkipAccountSecurityModal.tapIUnderstandCheckBox();
    await SkipAccountSecurityModal.tapSkipButton();
    await WalletView.isVisible();
  });

  it('Should dismiss Automatic Security checks screen', async () => {
    await TestHelpers.delay(3500);
    await EnableAutomaticSecurityChecksView.isVisible();
    await EnableAutomaticSecurityChecksView.tapNoThanks();
  });

  it('should tap on "Got it" to dimiss the whats new modal', async () => {
    // dealing with flakiness on bitrise.
    await TestHelpers.delay(2500);
    try {
      await WhatsNewModal.isVisible();
      await WhatsNewModal.tapGotItButton();
    } catch {
      //
    }
  });
  it('should dismiss the onboarding wizard', async () => {
    // dealing with flakiness on bitrise
    await TestHelpers.delay(1000);
    try {
      await OnboardingWizardModal.isVisible();
      await OnboardingWizardModal.tapNoThanksButton();
      await OnboardingWizardModal.isNotVisible();
    } catch {
      //
    }
  });

  it('should dismiss the protect your wallet modal', async () => {
    await ProtectYourWalletModal.isCollapsedBackUpYourWalletModalVisible();
    await TestHelpers.delay(1000);

    await ProtectYourWalletModal.tapRemindMeLaterButton();

    await SkipAccountSecurityModal.tapIUnderstandCheckBox();
    await SkipAccountSecurityModal.tapSkipButton();

    await WalletView.isVisible();
  });

  it('should go to settings then networks', async () => {
    // Open Drawer
    await WalletView.tapDrawerButton(); // tapping burger menu

    await DrawerView.isVisible();
    await DrawerView.tapSettings();

    await SettingsView.tapNetworks();

    await NetworkView.isNetworkViewVisible();
  });
  // it('should tap add a popular network from network list modal', async () => {
  // 	await WalletView.tapNetworksButtonOnNavBar();

  // 	await NetworkListModal.isVisible();
  // 	await NetworkListModal.tapAddNetworkButton();
  // 	await NetworkView.isNetworkViewVisible();

  // });
  // it('should add a popular network', async () => {
  // 	await WalletView.tapNetworksButtonOnNavBar();

  // 	await NetworkView.selectPopularNetwork("Optimism");

  // });

  it('should add xDai network', async () => {
    // Tap on Add Network button
    await TestHelpers.delay(3000);
    await NetworkView.tapAddNetworkButton();
    await NetworkView.switchToCustomNetworks();

    //await NetworkView.isRpcViewVisible();
    await NetworkView.typeInNetworkName('xDai');
    await NetworkView.typeInRpcUrl('abc'); // Input incorrect RPC URL
    await NetworkView.isRPCWarningVisble(); // Check that warning is displayed
    await NetworkView.clearRpcInputBox();
    await NetworkView.typeInRpcUrl(XDAI_URL);
    await NetworkView.typeInChainId('100');
    await NetworkView.typeInNetworkSymbol('xDAI\n');

    await NetworkView.swipeToRPCTitleAndDismissKeyboard(); // Focus outside of text input field
    await NetworkView.tapRpcNetworkAddButton();

    await WalletView.isVisible();
    await WalletView.isNetworkNameVisible('xDai');
  });
  it('should dismiss network education modal', async () => {
    await NetworkEducationModal.isVisible();
    await NetworkEducationModal.isNetworkNameCorrect('Xdai');
    await NetworkEducationModal.tapGotItButton();
    await NetworkEducationModal.isNotVisible();
  });

  it('should validate that xDai is added to network list', async () => {
    // Tap to prompt network list
    await WalletView.tapNetworksButtonOnNavBar();

    await NetworkListModal.isVisible();
    await NetworkListModal.isNetworkNameVisibleInListOfNetworks('xDai');
  });
  it('should switch to Goreli then dismiss the network education modal', async () => {
    await NetworkListModal.changeNetwork(GORELI);

    await NetworkEducationModal.isVisible();
    await NetworkEducationModal.isNetworkNameCorrect('Goreli Test Network');

    await NetworkEducationModal.tapGotItButton();
    await NetworkEducationModal.isNotVisible();

    await WalletView.isVisible();
  });

  it('should switch back to xDAI', async () => {
    await WalletView.isNetworkNameVisible(GORELI);
    await WalletView.tapNetworksButtonOnNavBar();

    await NetworkListModal.isVisible();
    await NetworkListModal.scrollToBottomOfNetworkList();

    // Change to back to xDai Network
    await NetworkListModal.changeNetwork('xDai');

    await WalletView.isVisible();
    await WalletView.isNetworkNameVisible('xDai');
    await NetworkEducationModal.isNotVisible();
  });

  it('should go to settings networks and remove xDai network', async () => {
    // Open Drawer
    await WalletView.tapDrawerButton(); // tapping burger menu
    await DrawerView.isVisible();
    await DrawerView.tapSettings();

    await SettingsView.tapNetworks();

    await NetworkView.isNetworkViewVisible();
    await NetworkView.removeNetwork(); // Tap on xDai to remove network
    await NetworkView.tapBackButtonAndReturnToWallet();

    await WalletView.isVisible();
    await WalletView.isNetworkNameVisible(MAINNET);
  });
});
