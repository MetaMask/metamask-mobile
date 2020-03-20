'use strict';
import TestHelpers from './helpers';

const INVALID_ADDRESS = '0xB8B4EE5B1b693971eB60bDa15211570df2dB221L';
const MYTH_ADDRESS = '0x1FDb169Ef12954F20A15852980e1F0C122BfC1D6';

describe('Addressbook Tests', () => {
	beforeEach(() => {
		jest.setTimeout(150000);
	});

	it('should create new wallet and dismiss tutorial', async () => {
		// Check that we are on the onboarding carousel screen
		await TestHelpers.checkIfVisible('onboarding-carousel-screen');
		// Check that Get started CTA is visible & tap it
		await TestHelpers.waitAndTap('onboarding-get-started-button');
		// Check that we are on the onboarding screen
		await TestHelpers.checkIfVisible('onboarding-screen');
		// Check that Start Exploring CTA is visible & tap it
		await TestHelpers.waitAndTap('start-exploring-button');
		// Check that we are on the metametrics optIn screen
		await TestHelpers.checkIfVisible('metaMetrics-OptIn');
		// Check that I Agree CTA is visible and tap it
		await TestHelpers.waitAndTap('agree-button');
		// Check that we are on the wallet screen
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
	});

	it('should go to send view', async () => {
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
		// Make sure view with my accounts visible
		await TestHelpers.checkIfExists('my-accounts-button');
	});

	it('should input a valid address to send to', async () => {
		// Input incorrect address
		await TestHelpers.typeTextAndHideKeyboard('txn-to-address-input', INVALID_ADDRESS);
		// Check that the error is displayed
		await TestHelpers.checkIfVisible('address-error');
		// Clear text
		await TestHelpers.clearField('txn-to-address-input');
		// Input valid myth address
		await TestHelpers.typeTextAndHideKeyboard('txn-to-address-input', MYTH_ADDRESS);
		// Check that the warning appears at the bottom of the screen
		await TestHelpers.checkIfVisible('no-eth-message');
	});

	it('should add a new address to address book via send flow', async () => {
		// Tap on add this address to your address book
		await TestHelpers.waitAndTap('add-address-button');
		// Make sure address book modal is displayed
		await TestHelpers.checkIfExists('add-address-modal');
		// Input alias
		await TestHelpers.typeTextAndHideKeyboard('address-alias-input', 'Myth');
		// Save contact
		await TestHelpers.tapByText('Save');
		// Clear address
		await TestHelpers.tap('clear-address-button');
		// Check that the new account is on the address list
		await TestHelpers.checkIfElementWithTextIsVisible('Myth');
	});

	it('should go to settings then select contacts', async () => {
		// Tap on cancel button

		// Tap on back button to proceed to wallet view

		// Check that we are on the wallet screen
		await TestHelpers.checkIfVisible('wallet-screen');
		// Open Drawer
		await TestHelpers.tap('hamburger-menu-button-wallet');
		// Check that the drawer is visbile
		await TestHelpers.checkIfVisible('drawer-screen');
		// Tap on settings
		await TestHelpers.tap('settings-button');
		// Tap on the "Contacts" option
		await TestHelpers.tapByText('Contacts');
		// Check that we are on the contacts screen

		// Check that Myth account is saved in the address book
	});

	// it('should', async () => {
	// 	//
	// });
});
