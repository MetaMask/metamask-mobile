'use strict';
import TestHelpers from '../helpers';

import OnboardingView from '../pages/Onboarding/OnboardingView';
import OnboardingCarouselView from '../pages/Onboarding/OnboardingCarouselView';
import ImportWalletView from '../pages/Onboarding/ImportWalletView';
import MetaMetricsOptIn from '../pages/Onboarding/MetaMetricsOptInView';

import WalletView from '../pages/WalletView';
import AccountListView from '../pages/AccountListView';
import ImportAccountView from '../pages/ImportAccountView';

import DrawerView from '../pages/Drawer/DrawerView';
import SendView from '../pages/SendView';
import AmountView from '../pages/AmountView';

import OnboardingWizardModal from '../pages/modals/OnboardingWizardModal';
import NetworkListModal from '../pages/modals/NetworkListModal';
import RequestPaymentModal from '../pages/modals/RequestPaymentModal';

const CORRECT_SEED_WORDS = 'fold media south add since false relax immense pause cloth just raven';
const CORRECT_PASSWORD = `12345678`;
const TEST_PUBLIC_ADDRESS = '0xd3B9Cbea7856AECf4A6F7c3F4E8791F79cBeeD62';
const RINKEBY = 'Rinkeby Test Network';
const ETHEREUM = 'Ethereum Main Network';
const COLLECTIBLE_CONTRACT_ADDRESS = '0x16baf0de678e52367adc69fd067e5edd1d33e3bf';
const COLLECTIBLE_IDENTIFIER = '404';
const TOKEN_ADDRESS = '0x107c4504cd79c5d2696ea0030a8dd4e92601b82e';
const TEST_PRIVATE_KEY = 'cbfd798afcfd1fd8ecc48cbecb6dc7e876543395640b758a90e11d986e758ad1';
const VALID_ADDRESS = '0xebe6CcB6B55e1d094d9c58980Bc10Fed69932cAb';

describe('Wallet Tests', () => {
	beforeEach(() => {
		jest.setTimeout(200000);
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
		await ImportWalletView.enterSecretRecoveryPhrase(CORRECT_SEED_WORDS);
		await ImportWalletView.enterPassword(CORRECT_PASSWORD);
		await ImportWalletView.reEnterPassword(CORRECT_PASSWORD);
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
		await WalletView.isAccountBalanceCorrect();
	});

	it('should be able to add new accounts', async () => {
		// Tap on account icon to prompt modal
		await WalletView.tapIdenticon();
		await AccountListView.isVisible();

		// Tap on Create New Account
		await AccountListView.tapCreateAccountButton();
		await AccountListView.isnewAccountNameVisible();
	});

	it('should be able to import account', async () => {
		await AccountListView.isVisible();
		await AccountListView.tapImportAccountButton();

		await ImportAccountView.isVisible();
		// Tap on import button to make sure alert pops up
		await ImportAccountView.tapImportButton();
		await ImportAccountView.tapOKAlertButton();

		// Input incorrect private key
		await ImportAccountView.enterPrivateKey('1234');
		await ImportAccountView.tapOKAlertButton();
		await ImportAccountView.clearPrivateKeyInputBox();

		await ImportAccountView.enterPrivateKey(TEST_PRIVATE_KEY);
		// Check that we are on the account succesfully imported screen
		await ImportAccountView.isImportSuccessSreenVisible();
		await ImportAccountView.tapCloseButtonOnImportSuccess();

		await WalletView.isVisible();
		await WalletView.isAccountNameCorrect('Account 3');
	});

	it('should be able to switch accounts', async () => {
		// Open Drawer
		await WalletView.tapDrawerButton();

		await DrawerView.isVisible();
		await DrawerView.tapAccountCaretButton();

		await AccountListView.isVisible();
		await AccountListView.tapAccountByName('Account 1');

		await WalletView.tapDrawerButton();

		await DrawerView.isVisible();
		await DrawerView.tapOnAddFundsButton();

		await RequestPaymentModal.isVisible();
		await RequestPaymentModal.isPublicAddressCorrect(TEST_PUBLIC_ADDRESS);

		// Close Receive screen and go back to wallet screen
		await RequestPaymentModal.closeRequestModal();

		await DrawerView.isVisible();
		await DrawerView.closeDrawer();
		// Check that we are on the wallet screen
		await WalletView.isVisible();
	});

	it('should switch to Rinkeby network', async () => {
		await WalletView.tapNetworksButtonOnNavBar();
		await NetworkListModal.isVisible();
		await NetworkListModal.changeNetwork(RINKEBY);
		await WalletView.isNetworkNameVisible(RINKEBY);
	});

	it('should add a collectible', async () => {
		// Check that we are on the wallet screen
		await WalletView.isVisible();
		// Tap on COLLECTIBLES tab
		await WalletView.tapNFTButton();
		// Tap on the add collectibles button
		await TestHelpers.tap('add-collectible-button');
		// Check that we are on the add collectible asset screen
		await TestHelpers.checkIfVisible('add-custom-token-screen');
		// Input incorrect contract address
		await TestHelpers.typeTextAndHideKeyboard('input-collectible-address', '1234');
		// Check that warning appears
		await TestHelpers.checkIfVisible('collectible-address-warning');
		// Tap on ADD button
		await TestHelpers.tapByText('IMPORT');
		// Check that identifier warning appears
		await TestHelpers.checkIfVisible('collectible-identifier-warning');
		// Go Back one view
		await TestHelpers.tap('asset-back-button');
		// Tap on the add collectibles button
		await TestHelpers.tap('add-collectible-button');
		// Check that we are on the add collectible asset screen
		await TestHelpers.checkIfVisible('add-custom-token-screen');
		// Input incorrect contract address
		if (device.getPlatform() === 'android') {
			await TestHelpers.replaceTextInField(`input-collectible-address`, COLLECTIBLE_CONTRACT_ADDRESS);
			await element(by.id('input-collectible-address')).tapReturnKey();
		} else {
			await TestHelpers.typeTextAndHideKeyboard(`input-collectible-address`, COLLECTIBLE_CONTRACT_ADDRESS);
		}
		// Input correct identifier
		await TestHelpers.typeTextAndHideKeyboard('input-token-decimals', COLLECTIBLE_IDENTIFIER);
		// Check that we are on the wallet screen
		await WalletView.isVisible();
		// Wait for asset to load
		await TestHelpers.delay(3000);
		// Check that the crypto kitty was added
		await TestHelpers.checkIfElementByTextIsVisible('CryptoKitties');
		// Tap on Crypto Kitty
		await TestHelpers.tapByText('CryptoKitties');
		// Check that we are on the overview screen

		// DO WE NEED THIS CHECK?
		//await TestHelpers.checkIfVisible('collectible-overview-screen');

		// Check that the asset is correct
		await TestHelpers.checkIfElementHasString('collectible-name', '1 CryptoKitties');
	});

	it('should add a token', async () => {
		// Check that we are on the wallet screen
		await WalletView.isVisible();
		// Tap on TOKENS tab
		await TestHelpers.tapByText('TOKENS');
		// Switch to mainnet
		await WalletView.tapNetworksButtonOnNavBar();

		await NetworkListModal.isVisible();
		await NetworkListModal.changeNetwork(ETHEREUM);
		await WalletView.isNetworkNameVisible(ETHEREUM);

		// Tap on Add Tokens
		await TestHelpers.tap('add-token-button');
		// Search for SAI
		await TestHelpers.typeTextAndHideKeyboard('input-search-asset', 'DAI Stablecoin');
		// Wait for results to load
		await TestHelpers.delay(2000);
		// Select SAI
		await TestHelpers.tapItemAtIndex('searched-token-result');
		await TestHelpers.delay(500);
		// Tap on Add Token button
		await TestHelpers.tapByText('IMPORT');
		// Check that we are on the wallet screen
		await WalletView.isVisible();
		// Check that SAI is added to wallet
		await TestHelpers.delay(10000); // to prevent flakey behavior in bitrise
		await TestHelpers.checkIfElementWithTextIsVisible('0 DAI');
		// Tap on SAI to remove network
		await element(by.text('0 DAI')).longPress();
		// Tap remove
		await TestHelpers.tapByText('Remove');
		// Tap OK in alert box
		await TestHelpers.tapAlertWithButton('OK');
	});

	it('should add a custom token', async () => {
		// Tap on Add Tokens
		await TestHelpers.tap('add-token-button');
		// Tap on CUSTOM TOKEN
		await TestHelpers.tapByText('CUSTOM TOKEN');
		// Check that we are on the custom token screen
		await TestHelpers.checkIfVisible('add-custom-token-screen');
		// Type incorrect token address
		await TestHelpers.typeTextAndHideKeyboard('input-token-address', '1234');
		// Check that address warning is displayed
		await TestHelpers.checkIfVisible('token-address-warning');
		// Type incorrect token symbol
		await TestHelpers.typeTextAndHideKeyboard('input-token-symbol', 'ROCK');
		// Tap to focus outside of text input field
		await TestHelpers.delay(700);
		await TestHelpers.tapByText('Token Address');
		await TestHelpers.delay(700);
		// Check that token decimals warning is displayed
		await TestHelpers.checkIfVisible('token-decimals-warning');
		// Go back
		if (device.getPlatform() === 'android') {
			await device.pressBack();
		} else {
			await TestHelpers.tap('asset-back-button');
		}
		// Tap on Add Tokens
		await TestHelpers.tap('add-token-button');
		// Tap on CUSTOM TOKEN
		await TestHelpers.tapByText('CUSTOM TOKEN');
		// Check that we are on the custom token screen
		await TestHelpers.checkIfVisible('add-custom-token-screen');
		// Type correct token address
		if (device.getPlatform() === 'android') {
			await TestHelpers.replaceTextInField(`input-token-address`, TOKEN_ADDRESS);
			await element(by.id('input-token-address')).tapReturnKey();
		} else {
			await TestHelpers.typeText('input-token-address', TOKEN_ADDRESS);
		}
		// Add token
		if (device.getPlatform() === 'android') {
			await TestHelpers.tapByText('Token Address');
			await TestHelpers.delay(1500);
			await TestHelpers.tap('add-custom-asset-confirm-button');
		} else {
			await TestHelpers.tapByText('Token Address');
			await TestHelpers.tap('add-custom-asset-confirm-button');
		}
		// Check that we are on the wallet screen
		await WalletView.isVisible();

		await TestHelpers.delay(10000); // to prevent flakey behavior in bitrise
		// Check that TENX is added to wallet
		await TestHelpers.checkIfElementWithTextIsVisible('0 BLT');
	});

	it('should switch back to Rinkeby network', async () => {
		await WalletView.tapNetworksButtonOnNavBar();
		await NetworkListModal.isVisible();
		await NetworkListModal.changeNetwork(RINKEBY);
		await WalletView.isNetworkNameVisible(RINKEBY);
	});

	it('should input a valid address', async () => {
		// Check that we are on the wallet screen
		await WalletView.isVisible();
		// Open Drawer
		await WalletView.tapDrawerButton();

		await DrawerView.isVisible();
		await DrawerView.tapSendButton();

		await SendView.inputAddress(VALID_ADDRESS);
		await SendView.tapNextButton();
		// Check that we are on the amount view
		await AmountView.isVisible();
	});

	it('should input and validate amount', async () => {
		// Input amount
		await AmountView.typeInTransactionAmount('5');
		await AmountView.tapNextButton();

		// Check that the insufficient funds warning pops up
		await AmountView.isInsufficientFundsErrorVisible();

		// Input acceptable value
		await AmountView.typeInTransactionAmount('0.00004');
		await AmountView.tapNextButton();

		// Check that we are on the confirm view
		await TestHelpers.checkIfVisible('txn-confirm-screen');
	});

	it('should send ETH to Account 2', async () => {
		// Check that the amount is correct
		await TestHelpers.checkIfHasText('confirm-txn-amount', '0.00004 ETH');
		// Tap on the Send CTA
		await TestHelpers.tap('txn-confirm-send-button');
		// Check that we are on the wallet screen
		await WalletView.isVisible();
	});
});
