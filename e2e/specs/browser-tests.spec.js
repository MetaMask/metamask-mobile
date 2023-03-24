'use strict';
import TestHelpers from '../helpers';

import OnboardingView from '../pages/Onboarding/OnboardingView';
import OnboardingCarouselView from '../pages/Onboarding/OnboardingCarouselView';
import ProtectYourWalletView from '../pages/Onboarding/ProtectYourWalletView';
import CreatePasswordView from '../pages/Onboarding/CreatePasswordView';

import MetaMetricsOptIn from '../pages/Onboarding/MetaMetricsOptInView';
import WalletView from '../pages/WalletView';
import { BROWSER_SCREEN_ID, Browser } from '../pages/Drawer/Browser';
import EnableAutomaticSecurityChecksView from '../pages/EnableAutomaticSecurityChecksView';

import ConnectModal from '../pages/modals/ConnectModal';
import SkipAccountSecurityModal from '../pages/modals/SkipAccountSecurityModal';
import OnboardingWizardModal from '../pages/modals/OnboardingWizardModal';
import ProtectYourWalletModal from '../pages/modals/ProtectYourWalletModal';
import WhatsNewModal from '../pages/modals/WhatsNewModal';

const ENS_Example = 'https://brunobarbieri.eth';
const ENS_TLD = 'https://inbox.mailchain.xyz';
const SUSHI_SWAP = 'https://app.sushi.com/swap';
const PASSWORD = '12345678';
const PHISHING_SITE = 'http://www.empowr.com/FanFeed/Home.aspx';
const INVALID_URL = 'https://quackquakc.easq';

describe('Browser Tests', () => {
  beforeEach(() => {
    jest.setTimeout(150000);
  });

  it('should create new wallet', async () => {
    await OnboardingCarouselView.isVisible();
    await OnboardingCarouselView.tapOnGetStartedButton();

    await OnboardingView.isVisible();
    await OnboardingView.tapCreateWallet();

    await MetaMetricsOptIn.isVisible();
    await MetaMetricsOptIn.tapAgreeButton();

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

  it('should dismiss the protect your wallet modal', async () => {
    await ProtectYourWalletModal.isCollapsedBackUpYourWalletModalVisible();
    await TestHelpers.delay(1000);

    await ProtectYourWalletModal.tapRemindMeLaterButton();

    await SkipAccountSecurityModal.tapIUnderstandCheckBox();
    await SkipAccountSecurityModal.tapSkipButton();

    await WalletView.isVisible();
  });

  it('should navigate to browser', async () => {
    await WalletView.tapBrowser();
    // Check that we are on the browser screen
    await Browser.isVisible();
  });

  it('should go to sushi swap', async () => {
    await TestHelpers.delay(3000);
    // Tap on search in bottom navbar
    await Browser.tapUrlInputBox();
    await Browser.navigateToURL(SUSHI_SWAP);

    // Wait for page to load
    await Browser.waitForBrowserPageToLoad();

    if (device.getPlatform() === 'android') {
      // Check that the dapp title is correct
      await TestHelpers.checkIfElementWithTextIsVisible('app.sushi.com', 0);
    }
    await TestHelpers.delay(5000);
    await ConnectModal.tapCancelButton();

    // Android has weird behavior where the URL modal stays open, so this closes it
    // Close URL modal
    if (device.getPlatform() === 'android') {
      await device.pressBack();
    }
    await Browser.isVisible();
  });

  it('should add sushi swap to favorites', async () => {
    // Check that we are still on the browser screen
    await Browser.isVisible();
    // Tap on options
    await Browser.tapOptionsButton();
    await Browser.tapAddToFavoritesButton();
    await Browser.isAddBookmarkScreenVisible();
    await Browser.tapAddBookmarksButton();

    await Browser.isAddBookmarkScreenNotVisible(); // Add bookmark screen should not be visible
  });

  it('tap on home button', async () => {
    // Tap on home on bottom navbar
    await Browser.tapHomeButton();
    // Wait for page to load
    await TestHelpers.delay(1000);
    await Browser.isVisible();
  });

  it('should tap on sushi swap in favorites', async () => {
    if (device.getPlatform() === 'ios') {
      // Tapping on favourite tap
      await TestHelpers.tapAtPoint(BROWSER_SCREEN_ID, { x: 174, y: 281 });
      await TestHelpers.delay(1500);
    } else {
      // Tapping on favourite tap on Android
      await TestHelpers.tapAtPoint(BROWSER_SCREEN_ID, { x: 274, y: 223 });
      await TestHelpers.tapAtPoint(BROWSER_SCREEN_ID, { x: 180, y: 275 });
      await TestHelpers.delay(1500);
    }
    // Wait for connect prompt to display
    await TestHelpers.delay(5000);
    await ConnectModal.tapConnectButton();

    await TestHelpers.tapAtPoint(BROWSER_SCREEN_ID, { x: 20, y: 130 }); // tapping to dismiss keyboard

    await Browser.isVisible();
  });

  it('should test ENS sites', async () => {
    // Tap on home on bottom navbar
    await Browser.tapHomeButton();
    await TestHelpers.delay(1000);

    await Browser.tapBottomSearchBar();

    // Navigate to ENS URL
    await Browser.navigateToURL(ENS_Example);
    await Browser.isVisible();

    await Browser.tapBottomSearchBar();
    // Navigate to URL
    await Browser.navigateToURL(ENS_TLD);
    await Browser.isVisible();
  });

  it('should test invalid URL', async () => {
    await Browser.tapBottomSearchBar();
    // Clear text & Navigate to URL
    await Browser.navigateToURL(INVALID_URL);
    await Browser.waitForBrowserPageToLoad();

    await Browser.tapReturnHomeButton();
    // Check that we are on the browser screen
    if (!device.getPlatform() === 'android') {
      await TestHelpers.delay(1500);
    }
    await Browser.isVisible();
  });

  it('should test phishing sites', async () => {
    await Browser.tapBottomSearchBar();
    // Clear text & Navigate to URL
    await Browser.navigateToURL(PHISHING_SITE);
    await Browser.waitForBrowserPageToLoad();

    await Browser.isBackToSafetyButtonVisible();
    await Browser.tapBackToSafetyButton();

    // Check that we are on the browser screen
    if (!device.getPlatform() === 'android') {
      await TestHelpers.delay(1500);
    }
    await Browser.isVisible();
  });
});
