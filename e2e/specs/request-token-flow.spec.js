'use strict';
import OnboardingView from '../pages/Onboarding/OnboardingView';
import OnboardingCarouselView from '../pages/Onboarding/OnboardingCarouselView';
import ProtectYourWalletView from '../pages/Onboarding/ProtectYourWalletView';
import CreatePasswordView from '../pages/Onboarding/CreatePasswordView';

//import SendView from '../pages/SendView';
import RequestPaymentView from '../pages/RequestPaymentView';

import MetaMetricsOptIn from '../pages/MetaMetricsOptInView';
import WalletView from '../pages/WalletView';
import DrawerView from '../pages/Drawer/DrawerView';

//import AddAddressModal from '../pages/modals/AddAddressModal';
import SkipAccountSecurityModal from '../pages/modals/SkipAccountSecurityModal';
import OnboardingWizardModal from '../pages/modals/OnboardingWizardModal';
import ProtectYourWalletModal from '../pages/modals/ProtectYourWalletModal';
import RequestPaymentModal from '../pages/modals/RequestPaymentModal';

import TestHelpers from '../helpers';
const SAI_CONTRACT_ADDRESS = '0x89d24a6b4ccb1b6faa2625fe562bdd9a23260359';
const PASSWORD = '12345678';

describe('Request Token Flow', () => {
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

	it('should go to send view', async () => {
		// Open Drawer
		await WalletView.tapDrawerButton();

		await DrawerView.isVisible();
		await DrawerView.tapOnAddFundsButton();
		// Check that we see  the receive modal
		await RequestPaymentModal.isVisible();
	});

	it('should go to the request view', async () => {
		// Tap on request payment button
		await RequestPaymentModal.tapRequestPaymentButton();
		// Tap on ETH
		await RequestPaymentView.tapETH();
		// Make sure we're on the right screen
		await RequestPaymentView.isRequestTitleVisible();
		// Go back
		await RequestPaymentView.tapBackButton();
		// Make sure we're on the right screen
		await RequestPaymentView.isVisible();
	});

	it('should request DAI', async () => {
		// Search by SAI contract address
		await RequestPaymentView.searchForToken(SAI_CONTRACT_ADDRESS);
		// Make sure SAI shows up in the results
		await RequestPaymentView.isTokenVisibleInSearchResults('SAI');

		// Search DAI
		if (device.getPlatform() === 'android') {
			await TestHelpers.typeTextAndHideKeyboard('request-search-asset-input', 'DAI');
		} else {
			await TestHelpers.replaceTextInField('request-search-asset-input', 'DAI');
			await TestHelpers.delay(1000);
		}
		// Select DAI from search results
		await TestHelpers.tapByText('DAI', 1);
		if (device.getPlatform() === 'ios') {
			await TestHelpers.tapByText('DAI', 1);
		}
		// Request 5.50 DAI
		await TestHelpers.typeTextAndHideKeyboard('request-amount-input', 5.5);
		// Make sure we're on the right screen
		await TestHelpers.checkIfVisible('send-link-screen');
		// Tap on QR Code Button
		await TestHelpers.tap('request-qrcode-button');
		// Check that the QR code is visible
		await TestHelpers.checkIfVisible('payment-request-qrcode');
		// Close QR Code
		await TestHelpers.tap('payment-request-qrcode-close-button');
		// Close view
		await TestHelpers.tap('send-link-close-button');
		// Ensure protect your wallet modal is visible
		await TestHelpers.checkIfVisible('protect-wallet-modal');
	});
});
