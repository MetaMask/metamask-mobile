'use strict';
import TestHelpers from './helpers';

describe('Create Password', () => {
	beforeEach(async () => {
		await device.reloadReactNative();
		await TestHelpers.checkIfVisible('create-password-screen');
	});

	it('should validate the password length (min. 8 chars)', async () => {
		await TestHelpers.tap('input-password');
		await TestHelpers.typeTextAndHideKeyboard('input-password', '1234567');
		await TestHelpers.typeText('input-password-confirm', '1234567\n');
		await TestHelpers.waitAndTap('submit');
		await TestHelpers.tapAlertWithButton('OK');
	});

	it('should validate that the passwords match', async () => {
		await TestHelpers.tap('input-password');
		await TestHelpers.typeTextAndHideKeyboard('input-password', 'foo');
		await TestHelpers.typeText('input-password-confirm', 'bar\n');
		await TestHelpers.waitAndTap('submit');
		await TestHelpers.tapAlertWithButton('OK');
	});

	it('should create the password succesfully', async () => {
		await TestHelpers.tap('input-password');
		await TestHelpers.typeTextAndHideKeyboard('input-password', 'Str0ngP@ss!');
		await TestHelpers.typeText('input-password-confirm', 'Str0ngP@ss!\n');
		await TestHelpers.waitAndTap('submit');
		await TestHelpers.checkIfVisible('wallet-screen');
	});
});
