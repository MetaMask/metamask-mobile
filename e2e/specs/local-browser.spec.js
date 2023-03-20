'use strict';
import TestHelpers from '../helpers';

import OnboardingView from '../pages/Onboarding/OnboardingView';
import OnboardingCarouselView from '../pages/Onboarding/OnboardingCarouselView';
import ImportWalletView from '../pages/Onboarding/ImportWalletView';

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

import Accounts from '../../wdio/helpers/Accounts';

const LOCALHOST_URL = 'http://localhost:8545/';

describe('Custom RPC Tests', () => {
  let validAccount;

  beforeAll(() => {
    validAccount = Accounts.getValidAccount();
  });

  beforeEach(() => {
    jest.setTimeout(170000);
  });

  it('should import a wallet', async () => {
    await OnboardingCarouselView.isVisible();
    await OnboardingCarouselView.tapOnGetStartedButton();

    await OnboardingView.isVisible();
    await OnboardingView.tapImportWalletFromSeedPhrase();

    await MetaMetricsOptIn.isVisible();
    await MetaMetricsOptIn.tapNoThanksButton();

    await ImportWalletView.isVisible();
    await ImportWalletView.enterSecretRecoveryPhrase(validAccount.seedPhrase);
    await ImportWalletView.enterPassword(validAccount.password);
    await ImportWalletView.reEnterPassword(validAccount.password);

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

  it('should go to settings then networks', async () => {
    // Open Drawer
    await WalletView.tapDrawerButton(); // tapping burger menu

    await DrawerView.isVisible();
    await DrawerView.tapSettings();

    await SettingsView.tapNetworks();

    await NetworkView.isNetworkViewVisible();
  });

  it('should add localhost network', async () => {
    // Tap on Add Network button
    await TestHelpers.delay(3000);
    await NetworkView.tapAddNetworkButton();
    await NetworkView.switchToCustomNetworks();

    //await NetworkView.isRpcViewVisible();
    await NetworkView.typeInNetworkName('Localhost');
    await NetworkView.typeInRpcUrl(LOCALHOST_URL);
    await NetworkView.typeInChainId('1337');
    await NetworkView.typeInNetworkSymbol('TST\n');

    await NetworkView.swipeToRPCTitleAndDismissKeyboard(); // Focus outside of text input field
    await NetworkView.tapRpcNetworkAddButton();

    await WalletView.isVisible();
    await WalletView.isNetworkNameVisible('Localhost');
  });
  it('should dismiss network education modal', async () => {
    await NetworkEducationModal.isVisible();
    await NetworkEducationModal.isNetworkNameCorrect('Localhost');
    await NetworkEducationModal.tapGotItButton();
    await NetworkEducationModal.isNotVisible();
  });

  it('should validate that localhost is added to network list', async () => {
    // Tap to prompt network list
    await WalletView.tapNetworksButtonOnNavBar();

    await NetworkListModal.isVisible();
    await NetworkListModal.isNetworkNameVisibleInListOfNetworks('Localhost');
  });
});
