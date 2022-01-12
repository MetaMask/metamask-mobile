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
import SkipAccountSecurityModal from '../pages/modals/SkipAccountSecurityModal';
import OnboardingWizardModal from '../pages/modals/OnboardingWizardModal';
import ProtectYourWalletModal from '../pages/modals/ProtectYourWalletModal';

const RINKEBY = 'Rinkeby Test Network';
const XDAI_URL = 'https://dai.poa.network/';
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

	it('should add xDai network', async () => {
		// Tap on Add Network button
		await TestHelpers.delay(3000);
		await NetworkView.tapAddNetworkButton();

		await NetworkView.isRpcViewVisible();
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

	it('should validate that xDai is added to network list then switch networks', async () => {
		// Tap to prompt network list
		await WalletView.tapNetworksButtonOnNavBar();

		await NetworkListModal.isVisible();
		await NetworkListModal.isNetworkNameVisibleInListOfNetworks('xDai');
		await NetworkListModal.changeNetwork(RINKEBY);

		await WalletView.isNetworkNameVisible(RINKEBY);
		await WalletView.tapNetworksButtonOnNavBar();

		await NetworkListModal.isVisible();
		await NetworkListModal.scrollToBottomOfNetworkList();

		// Change to back to xDai Network
		await NetworkListModal.changeNetwork('xDai');

		await WalletView.isVisible();
		await WalletView.isNetworkNameVisible('xDai');
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
