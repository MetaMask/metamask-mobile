'use strict';

describe('Create Password', () => {
	beforeEach(async () => {
		await device.reloadReactNative();
		await expect(element(by.id('create-password-screen'))).toBeVisible();
	});

	it('should validate the password length (min. 8 chars)', async () => {
		await element(by.id('input-password')).tap();
		await element(by.id('input-password')).typeText('1234567');
		await element(by.id('input-password-confirm')).typeText('1234567\n');
		await element(by.id('submit')).tap();
		await element(by.label('OK'))
			.atIndex(0)
			.tap();
	});

	it('should validate that the passwords match', async () => {
		await element(by.id('input-password')).tap();
		await element(by.id('input-password')).typeText('foo');
		await element(by.id('input-password-confirm')).typeText('bar\n');
		await element(by.id('submit')).tap();
		await element(by.label('OK'))
			.atIndex(0)
			.tap();
	});

	it('should create the password succesfully', async () => {
		await element(by.id('input-password')).tap();
		await element(by.id('input-password')).typeText('Str0ngP@ss!');
		await element(by.id('input-password-confirm')).typeText('Str0ngP@ss!\n');
		await element(by.id('submit')).tap();
		await waitFor(element(by.id('wallet-screen')))
			.toBeVisible()
			.withTimeout(10000);
	});
});
