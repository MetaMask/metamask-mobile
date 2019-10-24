'use strict';
import TestHelpers from './helpers';

const Correct_Seed_Words = 'fold media south add since false relax immense pause cloth just raven';
const Correct_Password = `12345678`;
const TEST_PUBLIC_ADDRESS = '0xd3B9Cbea7856AECf4A6F7c3F4E8791F79cBeeD62';
const Rinkeby = 'Rinkeby Test Network';
const COLLECTIBLE_CONTRACT_ADDRESS = '0x16baf0de678e52367adc69fd067e5edd1d33e3bf';
const COLLECTIBLE_IDENTIFIER = '404';

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
		await TestHelpers.typeTextAndHideKeyboard(`input-seed-phrase`, Correct_Seed_Words);
		// Input password
		await TestHelpers.typeTextAndHideKeyboard(`input-password-field`, Correct_Password);
		// Input password confirm
		await TestHelpers.typeTextAndHideKeyboard(`input-password-field-confirm`, Correct_Password);
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

	it('should switch to ropsten network and validate ETH value', async () => {
		// Tap on Ethereum Main Network to prompt modal
		await TestHelpers.tapAtPoint('wallet-screen', { x: 200, y: -5 });
		// Check that the Networks modal pops up
		await TestHelpers.checkIfVisible('networks-list');
		// Tap on Ropsten Test Nework
		await TestHelpers.tapByText(Rinkeby);
		// Check that we are on Ropsten network
		await TestHelpers.checkIfElementWithTextIsVisible(Rinkeby);
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
		// Clear address field content
		await TestHelpers.clearField('input-collectible-address');
		// Input correct contract address
		await TestHelpers.typeTextAndHideKeyboard('input-collectible-address', COLLECTIBLE_CONTRACT_ADDRESS);
		// Input correct identifier
		await TestHelpers.typeTextAndHideKeyboard('input-token-decimals', COLLECTIBLE_IDENTIFIER);
	});

	// it('should ', async () => {
	// 	// Check that we are on the onboarding carousel screen
	// 	await TestHelpers.checkIfVisible('onboarding-carousel-screen');
	// });
});
