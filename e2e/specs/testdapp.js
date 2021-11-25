'use strict';
import TestHelpers from '../helpers';

import OnboardingView from '../pages/Onboarding/OnboardingView';
import OnboardingCarouselView from '../pages/Onboarding/OnboardingCarouselView';
import TransactionConfirmationView from '../pages/TransactionConfirmView';
import ImportWalletView from '../pages/Onboarding/ImportWalletView';
import NetworkListModal from '../pages/modals/NetworkListModal';

import MetaMetricsOptIn from '../pages/Onboarding/MetaMetricsOptInView';
import WalletView from '../pages/WalletView';
import DrawerView from '../pages/Drawer/DrawerView';
import { BROWSER_SCREEN_ID, Browser } from '../pages/Drawer/Browser';

import ConnectModal from '../pages/modals/ConnectModal';
import OnboardingWizardModal from '../pages/modals/OnboardingWizardModal';

const RINKEBY = 'Rinkeby Test Network';
const PASSWORD = '12345678';
const SEED_WORDS = 'fold media south add since false relax immense pause cloth just raven';
describe('Browser Tests', () => {
	beforeEach(() => {
		jest.setTimeout(150000);
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
		await ImportWalletView.enterSecretRecoveryPhrase(SEED_WORDS);
		await ImportWalletView.enterPassword(PASSWORD);
		await ImportWalletView.reEnterPassword(PASSWORD);
		await WalletView.isVisible();
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
	it('should change network', async () => {
		await WalletView.tapNetworksButtonOnNavBar();

		await NetworkListModal.isVisible();
		await NetworkListModal.changeNetwork(RINKEBY);

		await WalletView.isNetworkNameVisible(RINKEBY);
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
			await TestHelpers.tapAtPoint(BROWSER_SCREEN_ID, { x: 100, y: 125 });
			// Tap on first option
			await TestHelpers.tapAtPoint(BROWSER_SCREEN_ID, { x: 80, y: 100 });
			// Tap back button
			await Browser.tapBrowserBackButton();
			await Browser.tapBrowserBackButton();
			await TestHelpers.delay(1000);
			// Check that we are on the browser screen
			await Browser.isVisible();
		}
	});

	it('should go to test dapp', async () => {
		await TestHelpers.delay(3000);
		// Tap on search in bottom navbar
		await Browser.tapBrowser();
		await Browser.navigateToURL('https://metamask.github.io/test-dapp/');

		// Wait for page to load
		await Browser.waitForBrowserPageToLoad();

		await TestHelpers.tapAtPoint(BROWSER_SCREEN_ID, { x: 150, y: 270 }); // tapping connect button
		await ConnectModal.isVisible();

		await ConnectModal.tapConnectButton();

		//await TestHelpers.tapAtPoint(BROWSER_SCREEN_ID, { x: 750, y: 270 }); // tapping connect button
	});
	it('should create token', async () => {
		await TestHelpers.swipe(BROWSER_SCREEN_ID, 'up', 'slow', 0.4);
		await TestHelpers.tapAtPoint(BROWSER_SCREEN_ID, { x: 150, y: 225 }); // tapping connect button
		//await ConnectModal.tapConnectButton();
		// SET THE GAS FEE TO HIGH
		await TransactionConfirmationView.tapConfirmButtonInTestDapp();
		await TransactionConfirmationView.isNotVisible();
		await TestHelpers.delay(38000);

		await Browser.tapNoThanksButton();

		await TestHelpers.tapAtPoint(BROWSER_SCREEN_ID, { x: 150, y: 260 }); // tapping transfer tokens

		//await TestHelpers.tapAtPoint(BROWSER_SCREEN_ID, { x: 150, y: 270 }); // tapping transfer tokens
	});
	it('should approve token', async () => {
		// Click approve token
		// ensure transfer appears on the confirm modal
		// approve transfer
	});
	it('should transfer token', async () => {
		// Click approve token
		// ensure approve appears on the confirm modal
		// approve transfer
	});

	it('should Eth Sign', async () => {
		// Click approve token
		// ensure approve appears on the confirm modal
		// approve transfer
	});

	it('should personal Sign', async () => {
		// Click approve token
		// ensure approve appears on the confirm modal
		// approve transfer
	});

	it('should Sign typed Data', async () => {
		// Click approve token
		// ensure approve appears on the confirm modal
		// approve transfer
	});

	it('should Sign typed Data V3', async () => {
		// Click approve token
		// ensure approve appears on the confirm modal
		// approve transfer
	});

	it('should Sign typed Data V4', async () => {
		// Click approve token
		// ensure approve appears on the confirm modal
		// approve transfer
	});
});
