'use strict';
import TestHelpers from './helpers';

const TEST_SEED_WORDS = 'recipe silver label ensure thing vendor abuse twin wait receive unaware flower';
const TEST_ADDRESS = '0x4a6D01f1BBf8197AB8f6b0b5BD88e04CD525fAb8';

describe('Wallet', () => {
	it('should be able to restore accounts from seed', async () => {
		// Go to import seed screen
		await TestHelpers.tap('import-seed-button');
		await TestHelpers.checkIfVisible('import-from-seed-screen');
		// Input seed phrase
		await TestHelpers.tap('input-seed-phrase');
		await TestHelpers.typeText('input-seed-phrase', TEST_SEED_WORDS);
		// Input password
		await TestHelpers.typeTextAndHideKeyboard('input-password', 'Str0ngP@ss!');
		// Input password confirmation
		await TestHelpers.typeText('input-password-confirm', 'Str0ngP@ss!\n');
		// Submit
		await TestHelpers.waitAndTap('submit');
		// Check we're in the wallet screen
		await TestHelpers.checkIfVisible('wallet-screen');
		// Tap on settings
		await TestHelpers.tap('navbar-settings-button');
		// Check we're in the settings screen
		await TestHelpers.checkIfVisible('settings-screen');
		// Tap on the "seed words" option
		await TestHelpers.tapByText('Seed Words');
		// Check we're in the settings screen
		await TestHelpers.checkIfVisible('seed-words-screen');
		// Check that the seed words for the current account
		// matches the ones we use to import the account
		await TestHelpers.checkIfHasText('current-seed-words', TEST_SEED_WORDS);
	});

	it('should be able to add new accounts', async () => {
		await TestHelpers.relaunchApp();
		// Check we're in the wallet screen
		await TestHelpers.checkIfVisible('wallet-screen');
		// Tap on accounts menu
		await TestHelpers.tap('navbar-account-button');
		// Check we're in the accounts menu
		await TestHelpers.checkIfVisible('account-list');
		// Tap on add account
		await TestHelpers.tap('add-account-button');
		// Check if account was added
		await TestHelpers.checkIfElementWithTextIsVisible('Account 2');
		// Wait to make sure we persist the state
		await TestHelpers.delay(1000);
	});

	it('should be able to switch accounts', async () => {
		await TestHelpers.relaunchApp();
		// Check we're in the wallet screen
		await TestHelpers.checkIfVisible('wallet-screen');
		// Tap on accounts menu
		await TestHelpers.tap('navbar-account-button');
		// Check we're in the accounts menu
		await TestHelpers.checkIfVisible('account-list');
		// Switch Account to "Account 1"
		await TestHelpers.tapByText('Account 1');
		// Close the side menu by tapping outside
		await TestHelpers.tap('account-list-title');
		// Tap on the QR Code to go to account details
		await TestHelpers.tap('account-qr-button');
		// Check we are on the account details screen
		await TestHelpers.checkIfVisible('account-details-screen');
		// Check the address matches with "Account 1"
		await TestHelpers.checkIfHasText('public-address-input', TEST_ADDRESS);
	});

	it('should be able to switch networks', async () => {
		await TestHelpers.relaunchApp();
		// Check we're in the wallet screen
		await TestHelpers.checkIfVisible('wallet-screen');
		// Tap on settings
		await TestHelpers.tap('navbar-settings-button');
		// Check we're in the settings screen
		await TestHelpers.checkIfVisible('settings-screen');
		// Tap on the "network" option
		await TestHelpers.tapByText('Network');
		// Check we're in the settings screen
		await TestHelpers.checkIfVisible('network-settingss-screen');
		// Switch to "mainnet"
		await TestHelpers.tapByText('mainnet');

		//Need to go back 2 levels
		if (device.getPlatform() === 'android') {
			device.pressBack();
			device.pressBack();
		} else {
			await element(by.text('Settings'))
				.atIndex(1)
				.tap();

			await element(by.text('Wallet'))
				.atIndex(2)
				.tap();
		}
		await TestHelpers.checkIfHasText('navbar-title-network', 'Ethereum Main Network');
	});
});
