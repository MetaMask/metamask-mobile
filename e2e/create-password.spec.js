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
		await TestHelpers.typeText('input-password', '1234567\n');
		// Confirm the short password and submit
		await TestHelpers.typeText('input-password-confirm', '1234567\n');
		// Confirm the error message
		await TestHelpers.tapAlertWithButton('OK');
	});

	it('should validate that the passwords match', async () => {
		// Enter a one password
		await TestHelpers.typeText('input-password', 'foo\n');
		// Enter a different password and submit
		await TestHelpers.typeText('input-password-confirm', 'bar\n');
		// Confirm the error message
		await TestHelpers.tapAlertWithButton('OK');
	});

	it('should create the password succesfully', async () => {
		// Enter a valid password
		await TestHelpers.typeText('input-password', 'Str0ngP@ss!\n');
		// Confirm the valid password and submit
		await TestHelpers.typeText('input-password-confirm', 'Str0ngP@ss!\n');
		// Check if we're in the wallet screen
		await TestHelpers.checkIfVisible('wallet-screen');
	});
});
