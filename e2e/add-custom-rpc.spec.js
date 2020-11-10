'use strict';
import TestHelpers from './helpers';

const RINKEBY = 'Rinkeby Test Network';
const XDAI_URL = 'https://dai.poa.network/';
const MAINNET = 'Ethereum Main Network';
const PASSWORD = '12345678';

describe('Custom RPC Tests', () => {
	beforeEach(() => {
		jest.setTimeout(170000);
	});

	it('should create new wallet and dismiss tutorial', async () => {
		// Check that we are on the onboarding carousel screen
		await TestHelpers.checkIfVisible('onboarding-carousel-screen');
		// Check that Get started CTA is visible & tap it
		await TestHelpers.waitAndTap('onboarding-get-started-button');
		// Check that we are on the onboarding screen
		await TestHelpers.checkIfVisible('onboarding-screen');
		// Check that Create a new wallet CTA is visible & tap it
		await TestHelpers.waitAndTap('create-wallet-button');
		// Check that we are on the Create password screen
		await TestHelpers.checkIfVisible('create-password-screen');
		// Input new password
		await TestHelpers.typeTextAndHideKeyboard('input-password', PASSWORD);
		// Input confirm password
		await TestHelpers.typeTextAndHideKeyboard('input-password-confirm', PASSWORD);
		// Mark the checkbox that you understand the password cannot be recovered
		if (device.getPlatform() === 'ios') {
			await TestHelpers.tap('password-understand-box');
		} else {
			// Tap by the I understand text
			await TestHelpers.delay(1000);
			await TestHelpers.tap('i-understand-text');
		}
		// Tap on create password button
		await TestHelpers.tap('submit-button');
		// Check that we are on the Secure your wallet screen
		await TestHelpers.checkIfVisible('protect-your-account-screen');
		// Tap on the remind me later button
		await TestHelpers.tap('remind-me-later-button');
		// Check the box to state you understand
		if (device.getPlatform() === 'ios') {
			await TestHelpers.tap('skip-backup-check');
		} else {
			// Tap by the I understand text
			await TestHelpers.delay(1000);
			await TestHelpers.tap('skip-backup-text');
		}
		// Tap on Skip button
		await TestHelpers.tapByText('Skip');
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
		// Check that the protect your wallet modal is visible
		await TestHelpers.checkIfVisible('backup-alert');
		// Tap on remind me later
		await TestHelpers.tap('notification-remind-later-button');
		// Check the box to state you understand
		if (device.getPlatform() === 'ios') {
			await TestHelpers.tap('skip-backup-check');
		} else {
			// Tap by the I understand text
			await TestHelpers.delay(1000);
			await TestHelpers.tap('skip-backup-text');
		}
		// Tap on Skip button
		await TestHelpers.tapByText('Skip');
	});

	it('should go to settings then networks', async () => {
		// Open Drawer
		await TestHelpers.tap('hamburger-menu-button-wallet');
		// Check that the drawer is visbile
		await TestHelpers.checkIfVisible('drawer-screen');
		// Tap on settings
		await TestHelpers.tapByText('Settings');
		// Tap on the "Networks" option
		await TestHelpers.tapByText('Networks');
		// Check that we are on the networks screen
		await TestHelpers.checkIfVisible('networks-screen');
	});

	it('should add xDai network', async () => {
		// Tap on Add Network button
		await TestHelpers.tap('add-network-button');
		// Check that we are on the add new rpc network screen
		await TestHelpers.checkIfVisible('new-rpc-screen');
		// Input Network Name
		await TestHelpers.typeTextAndHideKeyboard('input-network-name', 'xDai');
		// Input incorrect RPC URL
		await TestHelpers.typeTextAndHideKeyboard('input-rpc-url', 'abc');
		// Check that warning is displayed
		await TestHelpers.checkIfVisible('rpc-url-warning');
		// Clear RPC URL field
		await TestHelpers.clearField('input-rpc-url');
		// Input correct RPC URL for Ganache network
		await TestHelpers.typeTextAndHideKeyboard('input-rpc-url', XDAI_URL);
		// Focus outside of text input field
		await TestHelpers.tap('rpc-screen-title');
		// Input Symbol
		await TestHelpers.typeTextAndHideKeyboard('input-network-symbol', 'xDAI');
		await TestHelpers.delay(1000);
		// Focus outside of text input field
		await TestHelpers.tap('rpc-screen-title');
		// Tap on Add button
		await TestHelpers.waitAndTap('network-add-button');
		// Check that we are on the wallet screen
		await TestHelpers.checkIfVisible('wallet-screen');
		// Check that we are on correct network
		await TestHelpers.checkIfElementHasString('network-name', 'xDai');
	});

	it('should validate that xDai is added to network list then switch networks', async () => {
		// Tap to prompt network list
		await TestHelpers.tap('open-networks-button');
		// Check that networks list is visible
		await TestHelpers.checkIfVisible('networks-list');
		// Swipe down on networks list
		await TestHelpers.swipe('networks-list', 'up');
		// Check that our network is added
		await TestHelpers.checkIfElementHasString('other-network-name', 'xDai');

		// iOS change networks tests
		if (device.getPlatform() === 'ios') {
			// Change to Rinkeby Network
			await TestHelpers.tapByText(RINKEBY);
			// Check that we are on correct network
			await TestHelpers.checkIfElementHasString('network-name', RINKEBY);
			// Tap to prompt network list
			await TestHelpers.tap('open-networks-button');
			// Check that networks list is visible
			await TestHelpers.checkIfVisible('networks-list');
			// Swipe down on networks list
			await TestHelpers.swipe('networks-list', 'up');
			// Change to back to xDai Network
			await TestHelpers.tapByText('xDai');
		} else {
			// Close list
			await TestHelpers.tapByText('Close');
		}

		// Check that we are on the wallet screen
		await TestHelpers.checkIfVisible('wallet-screen');
		// Check that we are on correct network
		await TestHelpers.checkIfElementHasString('network-name', 'xDai');
	});

	it('should go to settings networks and remove xDai network', async () => {
		// Open Drawer
		await TestHelpers.tap('hamburger-menu-button-wallet');
		// Check that the drawer is visbile
		await TestHelpers.checkIfVisible('drawer-screen');
		// Tap on settings
		await TestHelpers.tapByText('Settings');
		// Tap on the "Networks" option
		await TestHelpers.tapByText('Networks');
		// Check that we are on the networks screen
		await TestHelpers.checkIfVisible('networks-screen');
		// Tap on xDai to remove network
		await element(by.text('xDai')).longPress();
		// Tap remove
		await TestHelpers.tapByText('Remove');

		// Go back to wallet screen
		if (device.getPlatform() === 'ios') {
			// Tap on back arrow
			await TestHelpers.tapAtPoint('networks-screen', { x: 25, y: -22 });
			// Tap close
			await TestHelpers.tapByText('Close');
		} else {
			// Go Back for android
			await device.pressBack();
			await device.pressBack();
		}

		// Check that we are on the wallet screen
		await TestHelpers.checkIfExists('wallet-screen');
		// Check that we are on Mainnet
		await TestHelpers.checkIfElementHasString('network-name', MAINNET);
	});
});
