'use strict';
import TestHelpers from '../helpers';

import OnboardingView from '../pages/Onboarding/OnboardingView';
import OnboardingCarouselView from '../pages/Onboarding/OnboardingCarouselView';
import ProtectYourWalletView from '../pages/Onboarding/ProtectYourWalletView';
import CreatePasswordView from '../pages/Onboarding/CreatePasswordView';

import MetaMetricsOptIn from '../pages/MetaMetricsOptInView';
import WalletView from '../pages/WalletView';
import DrawerView from '../pages/Drawer/DrawerView';
import Browser from '../pages/Drawer/Browser';

import ConnectModal from '../pages/modals/ConnectModal';
import SkipAccountSecurityModal from '../pages/modals/SkipAccountSecurityModal';
import OnboardingWizardModal from '../pages/modals/OnboardingWizardModal';
import ProtectYourWalletModal from '../pages/modals/ProtectYourWalletModal';

const ENS_Example = 'https://brunobarbieri.eth';
const ENS_TLD = 'https://inbox.mailchain.xyz';
const UNISWAP = 'https://uniswap.exchange';
const PASSWORD = '12345678';
const PHISHING_SITE = 'http://www.empowr.com/FanFeed/Home.aspx';

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

	it('Should skip backup check and dismiss tutorial', async () => {
		// Check that we are on the Secure your wallet screen
		await ProtectYourWalletView.isVisible();
		await ProtectYourWalletView.tapOnRemindMeLaterButton();

		await SkipAccountSecurityModal.tapIUnderstandCheckBox();
		await SkipAccountSecurityModal.tapSkipButton();
		await WalletView.isVisible();
	});

	it('should dismiss the onboarding wizard', async () => {
		// dealing with flakiness on bitrise.
		await TestHelpers.delay(1000);
		try {
			await OnboardingWizardModal.isVisible();
			await OnboardingWizardModal.tapNoThanksButton();
			await OnboardingWizardModal.isNotVisible();
		} catch (e) {
			console.log('');
		}
	});

	it('should dismiss the protect your wallet modal', async () => {
		await ProtectYourWalletModal.isVisible();
		await TestHelpers.delay(1000);

		await ProtectYourWalletModal.tapRemindMeLaterButton();

		await SkipAccountSecurityModal.tapIUnderstandCheckBox();
		await SkipAccountSecurityModal.tapSkipButton();

		await WalletView.isVisible();
	});

	it('should navigate to browser', async () => {
		await WalletView.tapDrawerButton();

		await DrawerView.isVisible();
		await DrawerView.tapBrowser();
		// Check that we are on the browser screen
		await Browser.isVisible();
	});

	it('should go to first explore tab and navigate back to homepage', async () => {
		// This can only be done on Android since we removed option for iOS due to Appstore
		if (!device.getPlatform() === 'android') {
			// Tap on first category
			await TestHelpers.tapAtPoint('browser-screen', { x: 100, y: 425 });
			// Tap on first option
			await TestHelpers.tapAtPoint('browser-screen', { x: 80, y: 100 });
			// Tap back button
			await TestHelpers.waitAndTap('go-back-button');
			// Tap back button
			await TestHelpers.waitAndTap('go-back-button');
			// Wait for page to load
			await TestHelpers.delay(1000);
			// Check that we are on the browser screen
			await Browser.isVisible();
		}
	});

	it('should go to uniswap', async () => {
		await TestHelpers.delay(3000);
		// Tap on search in bottom navbar
		await Browser.tapBrowser();
		await Browser.navigateToURL(UNISWAP);

		// Wait for page to load
		await Browser.waitForBrowserPageToLoad();

		if (device.getPlatform() === 'android') {
			// Check that the dapp title is correct
			await TestHelpers.checkIfElementWithTextIsVisible('app.uniswap.org', 0);
		}
		await ConnectModal.tapCancelButton();
		// THIS SUCKS BUT UNISWAP IS ASKING TO CONNECT TWICE
		await TestHelpers.delay(3000);
		await ConnectModal.tapCancelButton();

		// Android has weird behavior where the URL modal stays open, so this closes it
		// Close URL modal
		if (device.getPlatform() === 'android') {
			await device.pressBack();
		}
		await Browser.isVisible();
	});

	it('should add uniswap to favorites', async () => {
		// Check that we are still on the browser screen
		await Browser.isVisible();
		// Tap on options
		await Browser.tapOptionsButton();
		await Browser.tapAddToFavoritesButton();
		await Browser.isAddBookmarkScreenVisible();
		await Browser.tapAddBookmarksButton();

		await Browser.isAddBookmarkScreenNotVisible(); // Add bookmark screen should not be visible
	});

	it('should go back home and navigate to favorites', async () => {
		// Tap on home on bottom navbar
		await Browser.tapHomeButton();
		// Wait for page to load
		await TestHelpers.delay(1000);
		await Browser.isVisible();
		// Tap on Favorites tab
		if (device.getPlatform() === 'ios') {
			// Tap on options
			await Browser.tapOptionsButton();
			// Open new tab
			await TestHelpers.tapByText('New tab');
			await TestHelpers.tapAtPoint(Browser.BROWSER_SCREEN_ID, { x: 174, y: 281 });
			await TestHelpers.delay(1500);
		} else {
			await TestHelpers.tapAtPoint(Browser.BROWSER_SCREEN_ID, { x: 274, y: 223 });
			await TestHelpers.tapAtPoint(Browser.BROWSER_SCREEN_ID, { x: 180, y: 275 });
			await TestHelpers.delay(1500);
		}
		// Wait for connect prompt to display
		await TestHelpers.delay(5000);
		// Tap on Connect button
		await ConnectModal.tapConnectButton();
		// Check that we are still on the browser screen
		await Browser.isVisible();
	});

	it('should test ENS sites', async () => {
		// Tap on home on bottom navbar
		await TestHelpers.tap('home-button');
		// Wait for page to load
		await TestHelpers.delay(1000);
		// Tap on search in bottom navbar
		await TestHelpers.tap('search-button');
		// Navigate to URL
		await TestHelpers.replaceTextInField('url-input', ENS_Example);
		await element(by.id('url-input')).tapReturnKey();
		// Wait for page to load
		await TestHelpers.delay(1000);
		// Check that we are on the browser screen
		await TestHelpers.checkIfVisible('browser-screen');
		// Tap on search in bottom navbar
		await TestHelpers.tap('search-button');
		// Navigate to URL
		await TestHelpers.replaceTextInField('url-input', ENS_TLD);
		await element(by.id('url-input')).tapReturnKey();
		// Wait for page to load
		await TestHelpers.delay(1000);
		// Check that we are on the browser screen
		await TestHelpers.checkIfVisible('browser-screen');
	});

	it('should test phishing sites', async () => {
		// Tap on search in bottom navbar
		await TestHelpers.tap('search-button');
		// Clear text
		await TestHelpers.clearField('url-input');
		// Navigate to URL
		await TestHelpers.replaceTextInField('url-input', PHISHING_SITE);
		await element(by.id('url-input')).tapReturnKey();

		/*
		await TestHelpers.checkIfVisible('browser-screen');
		// Tap on empowr from search results
		if (device.getPlatform() === 'ios') {
			await TestHelpers.tapAtPoint('browser-screen', { x: 60, y: 270 });
		} else {
			await TestHelpers.tapAtPoint('browser-screen', { x: 56, y: 284 });
			await TestHelpers.delay(700);
		}
		*/

		//Wait for page to load
		await TestHelpers.delay(9000); // to prevent flakey behavior in bitrise

		await TestHelpers.checkIfElementWithTextIsVisible('Back to safety');
		// Tap on Back to safety button
		await TestHelpers.tapByText('Back to safety');
		// Check that we are on the browser screen
		if (!device.getPlatform() === 'android') {
			await TestHelpers.delay(1500);
		}
		await TestHelpers.checkIfVisible('browser-screen');
	});
});
