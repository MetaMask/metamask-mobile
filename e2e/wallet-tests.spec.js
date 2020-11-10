'use strict';
import TestHelpers from './helpers';

const CORRECT_SEED_WORDS = 'fold media south add since false relax immense pause cloth just raven';
const CORRECT_PASSWORD = `12345678`;
const TEST_PUBLIC_ADDRESS = '0xd3B9Cbea7856AECf4A6F7c3F4E8791F79cBeeD62';
const RINKEBY = 'Rinkeby Test Network';
const COLLECTIBLE_CONTRACT_ADDRESS = '0x16baf0de678e52367adc69fd067e5edd1d33e3bf';
const COLLECTIBLE_IDENTIFIER = '404';
const TOKEN_ADDRESS = '0x12525e53a7fB9e072e60062D087b19a05442BD8f';
const TEST_PRIVATE_KEY = 'cbfd798afcfd1fd8ecc48cbecb6dc7e876543395640b758a90e11d986e758ad1';
const VALID_ADDRESS = '0xebe6CcB6B55e1d094d9c58980Bc10Fed69932cAb';

describe('Wallet Tests', () => {
	beforeEach(() => {
		jest.setTimeout(150000);
	});

	it('should import wallet via seed phrase', async () => {
		// Check that we are on the onboarding carousel screen
		await TestHelpers.checkIfVisible('onboarding-carousel-screen');
		// Check that Get started CTA is visible & tap it
		await TestHelpers.waitAndTap('onboarding-get-started-button');
		// Check that we are on the onboarding screen
		await TestHelpers.checkIfVisible('onboarding-screen');
		// Check that Import using seed phrase CTA is visible & tap it
		await TestHelpers.waitAndTap('import-wallet-import-from-seed-button');
		// Check that we are on the import wallet screen
		await TestHelpers.checkIfVisible('import-from-seed-screen');
		// Input seed phrase
		if (device.getPlatform() === 'android') {
			await TestHelpers.replaceTextInField(`input-seed-phrase`, CORRECT_SEED_WORDS);
		} else {
			await TestHelpers.typeTextAndHideKeyboard(`input-seed-phrase`, CORRECT_SEED_WORDS);
		}
		// Input password
		await TestHelpers.typeTextAndHideKeyboard(`input-password-field`, CORRECT_PASSWORD);
		// Input password confirm
		await TestHelpers.typeTextAndHideKeyboard(`input-password-field-confirm`, CORRECT_PASSWORD);
		// Check that we are on the congrats screen
		await TestHelpers.checkIfVisible('import-congrats-screen');
		// Tap on done CTA
		await TestHelpers.tap('manual-backup-step-3-done-button');
		// Check that we are on the metametrics optIn screen
		await TestHelpers.checkIfVisible('metaMetrics-OptIn');
		// Check that I Agree CTA is visible and tap it
		await TestHelpers.waitAndTap('agree-button', 15000);
		// Should be on wallet screen
		if (!device.getPlatform() === 'android') {
			// Check that we are on the wallet screen
			await TestHelpers.checkIfExists('wallet-screen');
		}
		// Check that the onboarding wizard is present
		await TestHelpers.checkIfVisible('onboarding-wizard-step1-view');
		// Check that No thanks CTA is visible and tap it
		await TestHelpers.waitAndTap('onboarding-wizard-back-button');
		// Check that the onboarding wizard is gone
		await TestHelpers.checkIfNotVisible('onboarding-wizard-step1-view');
		// Ensure ETH Value is correct
		await TestHelpers.checkIfElementHasString('balance', '0 ETH');
	});

	it('should be able to add new accounts', async () => {
		// Tap on account icon to prompt modal
		await TestHelpers.tap('wallet-account-identicon');
		// Check that the account list view is visible
		await TestHelpers.checkIfVisible('account-list');
		// Tap on Create New Account
		await TestHelpers.waitAndTap('create-account-button');
		// Check if account was added
		await TestHelpers.checkIfElementWithTextIsVisible('Account 2');
	});

	it('should be able to import account', async () => {
		// Check that the account list view is visible
		await TestHelpers.checkIfVisible('account-list');
		// Tap to import an account
		await TestHelpers.waitAndTap('import-account-button');
		// Check that we are on the import screen
		await TestHelpers.checkIfVisible('import-account-screen');
		// Tap on import button to make sure alert pops up
		await TestHelpers.waitAndTap('import-button');
		// Dimsiss alert
		await TestHelpers.tapAlertWithButton('OK');
		// Input incorrect private key
		await TestHelpers.typeTextAndHideKeyboard('input-private-key', '1234');
		// Dimsiss alert
		await TestHelpers.tapAlertWithButton('OK');
		// Clear text
		await TestHelpers.clearField('input-private-key');
		// Input correct private key
		if (device.getPlatform() === 'android') {
			await TestHelpers.replaceTextInField('input-private-key', TEST_PRIVATE_KEY);
			await element(by.id('input-private-key')).tapReturnKey();
		} else {
			await TestHelpers.typeTextAndHideKeyboard('input-private-key', TEST_PRIVATE_KEY);
		}
		// Check that we are on the account succesfully imported screen
		await TestHelpers.checkIfVisible('import-success-screen');
		// Tap X to close modal
		await TestHelpers.tap('import-close-button');
		// Check that we are on the wallet screen
		await TestHelpers.checkIfExists('wallet-screen');
		// Check if account was added
		await TestHelpers.checkIfElementHasString('account-label-text-input', 'Account 3');
	});

	it('should be able to switch accounts', async () => {
		// Open Drawer
		await TestHelpers.tap('hamburger-menu-button-wallet');
		// Check that the drawer is visbile
		await TestHelpers.checkIfVisible('drawer-screen');
		// Tap on account button to expand modal
		await TestHelpers.waitAndTap('navbar-account-button');
		// Check that the account list view is visible
		await TestHelpers.checkIfVisible('account-list');
		// Switch to account 1
		await TestHelpers.tapByText('Account 1');
		// Open Drawer
		await TestHelpers.tap('hamburger-menu-button-wallet');
		// Check that the drawer is visbile
		await TestHelpers.checkIfVisible('drawer-screen');
		// Tap on Receive button
		await TestHelpers.waitAndTap('drawer-receive-button');
		// Check that we are on the receive screen
		await TestHelpers.checkIfVisible('receive-request-screen');
		// Check that the public address matches that of account 1
		await TestHelpers.checkIfElementHasString('account-address', TEST_PUBLIC_ADDRESS);

		// Close Receive screen and go back to wallet screen
		if (device.getPlatform() === 'android') {
			// Close modal
			await device.pressBack();
			await TestHelpers.delay(1000);
			// Check that you are on the drawer screen
			await TestHelpers.checkIfVisible('drawer-screen');
			// Close drawer
			await device.pressBack();
			await TestHelpers.delay(1000);
		} else {
			// Close modal
			await TestHelpers.swipe('receive-request-screen', 'down');
			// Check that you are on the drawer screen
			await TestHelpers.checkIfVisible('drawer-screen');
			// Close drawer
			await TestHelpers.swipe('drawer-screen', 'left');
		}

		// Check that we are on the wallet screen
		await TestHelpers.checkIfVisible('wallet-screen');
	});

	it('should switch to Rinkeby network', async () => {
		// Tap on Ethereum Main Network to prompt modal
		await TestHelpers.waitAndTap('open-networks-button');
		// Check that the Networks modal pops up
		await TestHelpers.checkIfVisible('networks-list');
		// Tap on Rinkeby Test Nework
		await TestHelpers.tapByText(RINKEBY);
		// Check that we are on Rinkeby network
		await TestHelpers.checkIfElementWithTextIsVisible(RINKEBY);
	});

	it('should add a collectible', async () => {
		// Check that we are on the wallet screen
		await TestHelpers.checkIfVisible('wallet-screen');
		// Tap on COLLECTIBLES tab
		await TestHelpers.tapByText('COLLECTIBLES');
		// Tap on the add collectibles button
		await TestHelpers.waitAndTap('add-collectible-button');
		// Check that we are on the add collectible asset screen
		await TestHelpers.checkIfVisible('add-custom-token-screen');
		// Input incorrect contract address
		await TestHelpers.typeTextAndHideKeyboard('input-collectible-address', '1234');
		// Check that warning appears
		await TestHelpers.checkIfVisible('collectible-address-warning');
		// Tap on ADD button
		await TestHelpers.tapByText('ADD');
		// Check that identifier warning appears
		await TestHelpers.checkIfVisible('collectible-identifier-warning');

		// Go Back one view
		if (device.getPlatform() === 'android') {
			await device.pressBack();
			await TestHelpers.delay(1000);
		} else {
			await TestHelpers.tapAtPoint('add-custom-token-screen', { x: 25, y: -22 });
		}

		// Tap on the add collectibles button
		await TestHelpers.waitAndTap('add-collectible-button');
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
		await TestHelpers.checkIfExists('wallet-screen');
		// Wait for asset to load
		await TestHelpers.delay(3000);
		// Check that the crypto kitty was added
		await TestHelpers.checkIfElementByTextIsVisible('CryptoKitties');
		// Tap on Crypto Kitty
		await TestHelpers.tapByText('CryptoKitties');
		// Check that we are on the overview screen
		await TestHelpers.checkIfVisible('collectible-overview-screen');
		// Check that the asset is correct
		await TestHelpers.checkIfElementHasString('collectible-name', '1 CryptoKitties');
		// Tap on back arrow
		if (device.getPlatform() === 'android') {
			await device.pressBack();
			await TestHelpers.delay(1000);
		} else {
			await TestHelpers.tapAtPoint('collectible-overview-screen', { x: 25, y: -22 });
		}
	});

	it('should add a token', async () => {
		// Check that we are on the wallet screen
		await TestHelpers.checkIfVisible('wallet-screen');
		// Tap on TOKENS tab
		await TestHelpers.tapByText('TOKENS');
		// Tap on Add Tokens
		await TestHelpers.tap('add-token-button');
		// Search for SAI
		await TestHelpers.typeTextAndHideKeyboard('input-search-asset', 'SAI');
		// Wait for results to load
		await TestHelpers.delay(2000);
		// Select SAI
		if (device.getPlatform() === 'android') {
			await TestHelpers.tapItemAtIndex('searched-token-result');
			await TestHelpers.delay(500);
		} else {
			await TestHelpers.tapAtPoint('search-token-screen', { x: 115, y: 160 });
		}
		// Tap on Add Token button
		await TestHelpers.tapByText('ADD TOKEN');
		// Check that we are on the wallet screen
		await TestHelpers.checkIfVisible('wallet-screen');
		// Check that SAI is added to wallet
		await TestHelpers.checkIfElementWithTextIsVisible('0 SAI');
		// Tap on SAI to remove network
		await element(by.text('0 SAI')).longPress();
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
		// Tap on cancel button
		if (device.getPlatform() === 'android') {
			await device.pressBack();
		} else {
			await TestHelpers.tapByText('CANCEL');
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
		await TestHelpers.checkIfVisible('wallet-screen');
		// Check that TENX is added to wallet
		await TestHelpers.checkIfElementWithTextIsVisible('0 TENX');
	});

	it('should input a valid address', async () => {
		// Check that we are on the wallet screen
		await TestHelpers.checkIfVisible('wallet-screen');
		// Tap on ETH asset
		await TestHelpers.waitAndTap('eth-logo');
		// Check that we are on the token overview screen
		await TestHelpers.checkIfVisible('token-asset-overview');
		// Tap on Send button
		await TestHelpers.tapByText('SEND');
		// Check that we are on the send screen
		await TestHelpers.checkIfVisible('send-screen');
		// Input test address
		await TestHelpers.replaceTextInField('txn-to-address-input', VALID_ADDRESS);
		// Tap the Next CTA
		await TestHelpers.waitAndTap('address-book-next-button');
		// Check that we are on the amount view
		await TestHelpers.checkIfVisible('amount-screen');
	});

	it('should input and validate amount', async () => {
		// Input amount
		if (device.getPlatform() === 'android') {
			await TestHelpers.replaceTextInField('txn-amount-input', '5');
		} else {
			await TestHelpers.typeTextAndHideKeyboard('txn-amount-input', '5');
		}
		// Tap Next CTA
		await TestHelpers.tap('txn-amount-next-button');
		// Check that the insufficient funds warning pops up
		await TestHelpers.checkIfVisible('amount-error');
		// Input acceptable value
		await TestHelpers.replaceTextInField('txn-amount-input', '0.00004');
		// Tap Next CTA
		await TestHelpers.tap('txn-amount-next-button');
		// Check that we are on the confirm view
		await TestHelpers.checkIfVisible('txn-confirm-screen');
	});

	it('should send ETH to Account 2', async () => {
		// Check that the amount is correct
		await TestHelpers.checkIfHasText('confirm-txn-amount', '0.00004 ETH');
		// Tap on the Send CTA
		await TestHelpers.tap('txn-confirm-send-button');
		// Check that we are on the token overview screen
		await TestHelpers.checkIfVisible('token-asset-overview');
	});
});
