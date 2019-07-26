'use strict';
import TestHelpers from './helpers';

const TEST_SEED_WORDS = 'recipe silver label ensure thing vendor abuse twin wait receive unaware flower';
const TEST_ADDRESS = '0x4a6D01f1BBf8197AB8f6b0b5BD88e04CD525fAb8';
const TEST_TOKEN_ADDRESS = '0x4CEdA7906a5Ed2179785Cd3A40A69ee8bc99C466';
const TEST_TOKEN_SYMBOL = 'TN';
const TEST_TOKEN_PRECISION = '18';

describe('Wallet', () => {
	it('should be able to restore accounts from seed', async () => {
		// Go to import seed screen
		await TestHelpers.tap('import-seed-button');
		await TestHelpers.checkIfVisible('import-from-seed-screen');
		// Input seed phrase
		await TestHelpers.typeText('input-seed-phrase', `${TEST_SEED_WORDS}\n`);
		// Input password
		await TestHelpers.typeText('input-password', 'Str0ngP@ss!\n');
		// Input password confirmation and submit
		await TestHelpers.typeText('input-password-confirm', 'Str0ngP@ss!\n');
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
			await element(by.traits(['button']).and(by.label('Settings')));
			await element(by.traits(['button']).and(by.label('')));
		}
		await TestHelpers.checkIfHasText('navbar-title-network', 'Ethereum Main Network');
	});

	it('should be able to add custom token', async () => {
		await TestHelpers.relaunchApp();
		// Check we're in the wallet screen
		await TestHelpers.checkIfVisible('wallet-screen');
		// Tap on add tokens button
		await TestHelpers.tap('add-token-button');
		// Check we're in the add asset screen
		await TestHelpers.checkIfVisible('add-asset-screen');
		// Go to custom token tab
		await TestHelpers.swipe('search-token-screen', 'left');
		// Select first input and write address
		await TestHelpers.typeText('input-token-address', `${TEST_TOKEN_ADDRESS}\n`);
		// Select second input and write symbol
		await TestHelpers.typeText('input-token-symbol', `${TEST_TOKEN_SYMBOL}\n`);
		// Select third input and write precision and submit
		await TestHelpers.typeNumbers('input-token-decimals', `${TEST_TOKEN_PRECISION}\n`, 'Done');
		// Check we're in the wallet screen
		await TestHelpers.checkIfVisible('wallet-screen');
		// Find token added on list
		await TestHelpers.checkIfElementByTextIsVisible(TEST_TOKEN_SYMBOL);
	});
});
