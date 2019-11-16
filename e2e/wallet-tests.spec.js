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
		// Check that Sync or import your wallet CTA is visible & tap it
		await TestHelpers.waitAndTap('onboarding-import-button');
		// Check that we are on the import wallet screen
		await TestHelpers.checkIfVisible('import-wallet-screen');
		// Check that Import using seed phrase CTA is visible & tap it
		await TestHelpers.waitAndTap('import-wallet-import-from-seed-button');
		// Check that we are on the import from seed screen
		await TestHelpers.checkIfVisible('import-from-seed-screen');
		// Input seed phrase
		await TestHelpers.typeTextAndHideKeyboard(`input-seed-phrase`, CORRECT_SEED_WORDS);
		// Input password
		await TestHelpers.typeTextAndHideKeyboard(`input-password-field`, CORRECT_PASSWORD);
		// Input password confirm
		await TestHelpers.typeTextAndHideKeyboard(`input-password-field-confirm`, CORRECT_PASSWORD);
		// Check that we are on the metametrics optIn screen
		await TestHelpers.checkIfVisible('metaMetrics-OptIn');
		// Check that I Agree CTA is visible and tap it
		await TestHelpers.waitAndTap('agree-button');
		// Check that we are on the wallet screen
		await TestHelpers.checkIfExists('wallet-screen');
		// Check that No thanks CTA is visible and tap it
		await TestHelpers.waitAndTap('onboarding-wizard-back-button');
		// Check that the onboarding wizard is gone
		await TestHelpers.checkIfNotVisible('onboarding-wizard-step1-view');
		// Ensure ETH Value is correct
		await TestHelpers.checkIfElementHasString('balance', '0 ETH');
	});

	it('should be able to add new accounts', async () => {
		// Tap on account icon to prompt modal
		await TestHelpers.tapAtPoint('wallet-screen', { x: 190, y: 50 });
		// Check that the account list view is visible
		await TestHelpers.checkIfVisible('account-list');
		// Tap on Create New Account
		await TestHelpers.waitAndTap('create-account-button');
		// Check if account was added
		await TestHelpers.checkIfElementWithTextIsVisible('Account 2');
		// Tap outside modal
		await TestHelpers.tapAtPoint('wallet-screen', { x: 50, y: 50 });
	});

	it('should be able to import account', async () => {
		// Tap on account icon to prompt modal
		await TestHelpers.tapAtPoint('wallet-screen', { x: 190, y: 50 });
		// Check that the account list view is visible
		await TestHelpers.checkIfVisible('account-list');
		// Tap on Create New Account
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
		await TestHelpers.typeTextAndHideKeyboard('input-private-key', TEST_PRIVATE_KEY);
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
		await TestHelpers.tapAtPoint('wallet-screen', { x: 30, y: -5 });
		// Check that the drawer is visbile
		await TestHelpers.checkIfVisible('drawer-screen');
		// Tap on account button to expand modal
		await TestHelpers.waitAndTap('navbar-account-button');
		// Check that the account list view is visible
		await TestHelpers.checkIfVisible('account-list');
		// Switch to account 1
		await TestHelpers.tapByText('Account 1');
		// Open Drawer
		await TestHelpers.tapAtPoint('wallet-screen', { x: 30, y: -5 });
		// Check that the drawer is visbile
		await TestHelpers.checkIfVisible('drawer-screen');
		// Tap on Receive button
		await TestHelpers.waitAndTap('drawer-receive-button');
		// Check that we are on the reveive screen
		await TestHelpers.checkIfVisible('receive-request-screen');
		// Tap on QR Code button
		await TestHelpers.tapByText('QR Code');
		// Check that QR Modal pops up
		await TestHelpers.checkIfVisible('qr-modal');
		// Check that the public address matches that of account 1
		await TestHelpers.checkIfElementHasString('public-address-input', TEST_PUBLIC_ADDRESS);
		// Close modal
		await TestHelpers.tap('close-qr-modal');
		// Check that we are on the reveive screen
		await TestHelpers.checkIfVisible('receive-request-screen');
		// Close Receive screen
		await TestHelpers.swipe('receive-request-screen', 'down');
		// Check that the drawer is visbile
		await TestHelpers.checkIfVisible('drawer-screen');
		// Close drawer screen
		await TestHelpers.swipe('drawer-screen', 'left');
		// Check that we are on the wallet screen
		await TestHelpers.checkIfExists('wallet-screen');
	});

	it('should switch to Rinkeby network', async () => {
		// Tap on Ethereum Main Network to prompt modal
		await TestHelpers.tapAtPoint('wallet-screen', { x: 200, y: -5 });
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
		// Tap on back arrow
		await TestHelpers.tapAtPoint('add-custom-token-screen', { x: 25, y: -22 });
		// Tap on the add collectibles button
		await TestHelpers.waitAndTap('add-collectible-button');
		// Check that we are on the add collectible asset screen
		await TestHelpers.checkIfVisible('add-custom-token-screen');
		// Input incorrect contract address
		await TestHelpers.typeTextAndHideKeyboard('input-collectible-address', COLLECTIBLE_CONTRACT_ADDRESS);
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
		await TestHelpers.tapAtPoint('collectible-overview-screen', { x: 25, y: -22 });
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
		// Tap on DAI
		await TestHelpers.tapAtPoint('search-token-screen', { x: 115, y: 160 });
		// Tap on Add Token button
		await TestHelpers.tapByText('ADD TOKEN');
		// Check that we are on the wallet screen
		await TestHelpers.checkIfVisible('wallet-screen');
		// Check that SAI is added to wallet
		await TestHelpers.checkIfElementWithTextIsVisible('0 SAI');
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
		await TestHelpers.tapAtPoint('add-custom-token-screen', { x: 180, y: 15 });
		// Check that token decimals warning is displayed
		await TestHelpers.checkIfVisible('token-decimals-warning');
		// Tap on cancel button
		await TestHelpers.tapByText('CANCEL');
		// Tap on Add Tokens
		await TestHelpers.tap('add-token-button');
		// Tap on CUSTOM TOKEN
		await TestHelpers.tapByText('CUSTOM TOKEN');
		// Check that we are on the custom token screen
		await TestHelpers.checkIfVisible('add-custom-token-screen');
		// Type incorrect token address
		await TestHelpers.typeText('input-token-address', TOKEN_ADDRESS);
		// Tap to focus outside of text input field
		await TestHelpers.tapAtPoint('add-custom-token-screen', { x: 180, y: 15 });
		// Tap on Add Token button
		await TestHelpers.tapByText('ADD TOKEN');
		// Check that we are on the wallet screen
		await TestHelpers.checkIfVisible('wallet-screen');
		// Check that TENX is added to wallet
		await TestHelpers.checkIfElementWithTextIsVisible('0 TENX');
	});

	it('should send ETH to account 2', async () => {
		// Check that we are on the wallet screen
		await TestHelpers.checkIfVisible('wallet-screen');
		// Tap on ETH asset
		await TestHelpers.waitAndTap('eth-logo');
		//await TestHelpers.tapAtPoint('wallet-screen', { x: 190, y: 250 });
		// Check that we are on the token overview screen
		await TestHelpers.checkIfVisible('token-asset-overview');
		// Check that the token amount is correct
		await TestHelpers.checkIfElementHasString('token-asset-overview', '3 ETH');
		// Tap on Send button
		await TestHelpers.tapByText('SEND');
		// Tap on account drop down arrow
		await TestHelpers.tap('account-drop-down');
		// Tap on Account 2
		await TestHelpers.tapByText('Account 2');
		// Input Amount
		await TestHelpers.replaceTextInField('amount-input', '0.000001');
		// Tap on NEXT button
		await TestHelpers.tapByText('NEXT');
		// Tap on CONFIRM button
		await TestHelpers.tapByText('CONFIRM');
		// Check that we are on the token overview screen
		await TestHelpers.checkIfVisible('token-asset-overview');
		// Wait for enable notifications alert to show up
		await TestHelpers.delay(10000);
		// Dismiss alert
		await TestHelpers.tapAlertWithButton('No, thanks');
		// Check that the token amount is correct
		await TestHelpers.checkIfElementHasString('token-asset-overview', '3 ETH');
	});
});
