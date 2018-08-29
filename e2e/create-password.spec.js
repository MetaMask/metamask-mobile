'use strict';

describe('Create Password', () => {
	beforeEach(async () => {
		await device.reloadReactNative();
		await expect(element(by.id('create-password-screen'))).toBeVisible();
	});

	it('should validate the password length (min. 8 chars)', async () => {
		await element(by.id('input-password')).tap();
		await element(by.id('input-password')).typeText('1234567');
		if (device.getPlatform() === 'android') {
			device.pressBack();
		}
		await element(by.id('input-password-confirm')).typeText('1234567\n');

		await waitFor(element(by.id('submit')))
			.toBeVisible()
			.withTimeout(3000);

		await element(by.id('submit')).tap();

		if (device.getPlatform() === 'android') {
			await element(by.text('OK'))
				.atIndex(0)
				.tap();
		} else {
			await element(by.label('OK'))
				.atIndex(0)
				.tap();
		}
	});

	it('should validate that the passwords match', async () => {
		await element(by.id('input-password')).tap();
		await element(by.id('input-password')).typeText('foo');
		if (device.getPlatform() === 'android') {
			device.pressBack();
		}
		await element(by.id('input-password-confirm')).typeText('bar\n');

		await waitFor(element(by.id('submit')))
			.toBeVisible()
			.withTimeout(3000);

		await element(by.id('submit')).tap();

		if (device.getPlatform() === 'android') {
			await element(by.text('OK'))
				.atIndex(0)
				.tap();
		} else {
			await element(by.label('OK'))
				.atIndex(0)
				.tap();
		}
	});

	it('should create the password succesfully', async () => {
		await element(by.id('input-password')).tap();
		await element(by.id('input-password')).typeText('Str0ngP@ss!');
		if (device.getPlatform() === 'android') {
			device.pressBack();
		}
		await element(by.id('input-password-confirm')).typeText('Str0ngP@ss!\n');

		await waitFor(element(by.id('submit')))
			.toBeVisible()
			.withTimeout(3000);

		await element(by.id('submit')).tap();
		await waitFor(element(by.id('wallet-screen')))
			.toBeVisible()
			.withTimeout(10000);
	});
});
