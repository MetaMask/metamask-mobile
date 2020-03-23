'use strict';
import TestHelpers from './helpers';

const INVALID_ADDRESS = '0xB8B4EE5B1b693971eB60bDa15211570df2dB221L';
const MYTH_ADDRESS = '0x1FDb169Ef12954F20A15852980e1F0C122BfC1D6';
const MEMO = 'Test adding ENS';

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
		await TestHelpers.tap('send-cancel-button');
		// Tap on back button to proceed to wallet view
		await TestHelpers.tap('asset-back-button');
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
		await TestHelpers.checkIfVisible('contacts-screen');
		// Check that Myth address is saved in the address book
		await TestHelpers.checkIfElementWithTextIsVisible('Myth');
	});

	it('should add an address via the contacts view', async () => {
		// Tap on add contact button
		await TestHelpers.tap('add-contact-button');
		// Check that we are on the add contact screen
		await TestHelpers.checkIfVisible('add-contact-screen');
		// Input a name
		await TestHelpers.typeTextAndHideKeyboard('contact-name-input', 'Ibrahim');
		// Input invalid address
		await TestHelpers.replaceTextInField('contact-address-input', INVALID_ADDRESS);
		// Check that warning is shown
		await TestHelpers.checkIfVisible('error-message-warning');
		// Check warning is for the right reason
		await TestHelpers.checkIfElementHasString('error-message-warning', 'Invalid address');
		// Clear address input field
		await TestHelpers.clearField('contact-address-input');
		// Replace address with valid ENS address
		await TestHelpers.replaceTextInField('contact-address-input', 'ibrahim.team.mask.eth');
		// Add a memo
		await TestHelpers.typeTextAndHideKeyboard('contact-memo-input', MEMO);
		// Tap add contact button
		await TestHelpers.tap('contact-add-contact-button');
		// Tap add contact button
		await TestHelpers.tap('contact-add-contact-button');
		// Check that we are on the contacts screen
		await TestHelpers.checkIfVisible('contacts-screen');
		// Check that Ibrahim address is saved in the address book
		await TestHelpers.checkIfElementWithTextIsVisible('Ibrahim');
	});

	it('should edit a contact', async () => {
		// Tap on Myth address
		await TestHelpers.tapByText('Myth');
		// Tap on edit
		await TestHelpers.tapByText('Edit');
		// Change name from Myth to Moon
		await TestHelpers.replaceTextInField('contact-name-input', 'Moon');
		// Tap on Edit contact button
		await TestHelpers.tapByText('Edit contact');
		// Check that we are on the contacts screen
		await TestHelpers.checkIfVisible('contacts-screen');
		// Check that Ibrahim address is saved in the address book
		await TestHelpers.checkIfElementWithTextIsVisible('Moon');
		// Ensure Myth is not visible
		await TestHelpers.checkIfElementWithTextIsNotVisible('Myth');
	});

	it('should remove a contact', async () => {
		// Tap on Moon address
		await TestHelpers.tapByText('Moon');
		// Tap on edit
		await TestHelpers.tapByText('Edit');
		// Tap on Delete
		await TestHelpers.tapByText('Delete');
		// Tap on Delete
		await TestHelpers.tapByText('Delete');
		// Ensure Moon is not visible
		await TestHelpers.checkIfElementWithTextIsNotVisible('Moon');
	});

	it('should go back to send flow to validate newly added address is displayed', async () => {
		// tap on the back arrow
		await TestHelpers.tap('title-back-arrow-button');
		// tap to get out of settings view
		if (device.getPlatform() === 'android') {
			await device.pressBack();
		} else {
			await TestHelpers.tapByText('Close');
		}
		// check we are on wallet screen
		await TestHelpers.checkIfVisible('wallet-screen');
		// Open Drawer
		await TestHelpers.tap('hamburger-menu-button-wallet');
		// Check that the drawer is visbile
		await TestHelpers.checkIfVisible('drawer-screen');
		// Tap on send
		await TestHelpers.tapByText('Send');
		// Check that the new account is on the address list
		await TestHelpers.checkIfElementWithTextIsVisible('Ibrahim');
	});
});
