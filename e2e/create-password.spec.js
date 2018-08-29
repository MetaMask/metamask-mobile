'use strict';
import TestHelpers from './helpers';

describe('Create Password', () => {
	beforeEach(async () => {
		await device.reloadReactNative();
		// Check we are in the "Create Password screen"
		await TestHelpers.checkIfVisible('create-password-screen');
	});

	it('should validate the password length (min. 8 chars)', async () => {
		// Enter a short password
		await TestHelpers.tap('input-password');
		await TestHelpers.typeTextAndHideKeyboard('input-password', '1234567');
		// Confirm the short password
		await TestHelpers.typeText('input-password-confirm', '1234567\n');
		// Submit
		await TestHelpers.waitAndTap('submit');
		// Confirm the error message
		await TestHelpers.tapAlertWithButton('OK');
	});

	it('should validate that the passwords match', async () => {
		// Enter a one password
		await TestHelpers.tap('input-password');
		await TestHelpers.typeTextAndHideKeyboard('input-password', 'foo');
		// Enter a different password
		await TestHelpers.typeText('input-password-confirm', 'bar\n');
		// Submit
		await TestHelpers.waitAndTap('submit');
		// Confirm the error message
		await TestHelpers.tapAlertWithButton('OK');
	});

	it('should create the password succesfully', async () => {
		// Enter a valid password
		await TestHelpers.tap('input-password');
		await TestHelpers.typeTextAndHideKeyboard('input-password', 'Str0ngP@ss!');
		// Confirm the valid password
		await TestHelpers.typeText('input-password-confirm', 'Str0ngP@ss!\n');
		// Submit
		await TestHelpers.waitAndTap('submit');
		// Check if we're in the wallet screen
		await TestHelpers.checkIfVisible('wallet-screen');
	});
});
