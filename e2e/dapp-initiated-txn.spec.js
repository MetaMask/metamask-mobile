'use strict';
import TestHelpers from './helpers';

const CORRECT_SEED_WORDS = 'fold media south add since false relax immense pause cloth just raven';
const CORRECT_PASSWORD = `12345678`;
const Ropsten = 'Ropsten Test Network';
const Ropsten_Faucet = 'https://faucet.metamask.io';
const CryptoKitties_url = 'https://cryptokitties.co';
const ETH_Faucet = 'Test Ether Faucet';

describe('MM Faucet Dapp Initiated Txn', () => {
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

	it('should switch to ropsten network and validate ETH value', async () => {
		// Tap on Ethereum Main Network to prompt modal
		await TestHelpers.waitAndTap('open-networks-button');
		// Check that the Networks modal pops up
		await TestHelpers.checkIfVisible('networks-list');
		// Tap on Ropsten Test Nework
		await TestHelpers.tapByText(Ropsten);
		// Check that we are on Ropsten network
		await TestHelpers.checkIfElementWithTextIsVisible(Ropsten);
		// Ensure ETH Value is correct
		await TestHelpers.checkIfElementHasString('balance', '1.9');
	});

	it('should go to browser and navigate to MM Ropsten faucet', async () => {
		// Open Drawer
		await TestHelpers.tap('hamburger-menu-button-wallet');
		// Check that the drawer is visbile
		await TestHelpers.checkIfVisible('drawer-screen');
		// Tap on Browser
		await TestHelpers.tapByText('Browser');
		// Wait for page to load
		await TestHelpers.delay(1000);
		// Check that we are on the browser screen
		await TestHelpers.checkIfVisible('browser-screen');
		// Tap on search in bottom navbar
		await TestHelpers.tap('search-button');
		// Navigate to URL
		await TestHelpers.typeTextAndHideKeyboard('url-input', Ropsten_Faucet);
		// Check that we are still on the browser screen
		await TestHelpers.checkIfVisible('browser-screen');
		// Tap on header URL
		await TestHelpers.tap('navbar-title-network');
		// Clear text
		await TestHelpers.replaceTextInField('url-input', CryptoKitties_url);
		// Tap on an autocomplete option
		if (device.getPlatform() === 'android') {
			await element(by.id('url-input')).tapReturnKey();
		} else {
			await element(by.text('CryptoKitties'))
				.atIndex(1)
				.tap();
		}
		// Check that we are still on the browser screen
		await TestHelpers.checkIfVisible('browser-screen');
		// Tap on options
		await TestHelpers.waitAndTap('options-button');
		// Tap on New tab
		await TestHelpers.tapByText('New tab');
		// Tap on tabs on bottom navbar
		await TestHelpers.tap('show-tabs-button');
		// Tap on faucet tab
		if (device.getPlatform() === 'android') {
			await TestHelpers.tapAtPoint('browser-screen', { x: 160, y: 60 });
		} else {
			await TestHelpers.tapAtPoint('browser-screen', { x: 220, y: 120 });
		}
		// Check that we are still on the browser screen
		await TestHelpers.checkIfVisible('browser-screen');
		// Tap back button
		await TestHelpers.waitAndTap('go-back-button');
	});

	it('should donate ETH on MM Ropsten', async () => {
		// Tap to donate 1 ETH
		if (device.getPlatform() === 'android') {
			await TestHelpers.tapAtPoint('browser-screen', { x: 65, y: 176 });
			await TestHelpers.delay(2000);
		} else {
			await TestHelpers.tapAtPoint('browser-screen', { x: 76, y: 189 });
		}
		// Check that account approval is displayed with correct dapp name
		await TestHelpers.checkIfHasText('dapp-name-title', ETH_Faucet);
		// Tap on CONNECT button
		await TestHelpers.tapByText('CONNECT');
		// Check that we are on the confirm transaction screen
		await TestHelpers.checkIfVisible('confirm-transaction-screen');
		// Tap Edit
		await TestHelpers.tap('confirm-txn-edit-button');
		// Input Amount
		await TestHelpers.replaceTextInField('amount-input', '0.000001');
		// Tap on NEXT button
		await TestHelpers.tapByText('NEXT');
		// Tap on CONFIRM button
		await TestHelpers.tapByText('CONFIRM');
		// Wait for enable notifications alert to show up
		if (device.getPlatform() === 'ios') {
			await TestHelpers.checkIfVisible('browser-screen');
			await TestHelpers.delay(10000);
			// Dismiss alert
			await TestHelpers.tapAlertWithButton('No, thanks');
		}
		// Open Drawer
		await TestHelpers.tap('hamburger-menu-button-browser');
		// Check that the drawer is visbile
		await TestHelpers.checkIfVisible('drawer-screen');
		// Tap on Wallet
		await TestHelpers.tapByText('Wallet');
		// Check that we are on the wallet screen
		await TestHelpers.checkIfVisible('wallet-screen');
		// Ensure ETH Value is correct
		await TestHelpers.checkIfElementHasString('balance', '1.9 ETH');
	});

	it('should log out', async () => {
		// Open Drawer
		await TestHelpers.tap('hamburger-menu-button-wallet');
		// Check that the drawer is visbile
		await TestHelpers.checkIfVisible('drawer-screen');
		// Tap on Log Out
		await TestHelpers.tapByText('Log Out');
		// Tap YES
		await TestHelpers.tapAlertWithButton('YES');
		// Check that we are on the wallet screen
		await TestHelpers.checkIfVisible('login');
	});
});
