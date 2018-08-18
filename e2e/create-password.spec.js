const TEST_SEED_WORDS = 'recipe silver label ensure thing vendor abuse twin wait receive unaware flower';

describe('Create Password', () => {
	beforeEach(async () => {
		await device.reloadReactNative();
	});

	it('should show the Create Password Screen', async () => {
		await expect(element(by.id('create-password-screen'))).toBeVisible();
	});

	// CANT FIGURE OUT HOW TO ACCESS THE ALERT
	// SEE  https://github.com/wix/detox/issues/890

	it('should validate the password length (min. 8 chars)', async () => {
		element(by.id('input-password')).tap();
		element(by.id('input-password')).typeText('1234567');
		element(by.id('input-password-confirm')).typeText('1234567\n');
		await element(by.id('submit')).tap();
		await waitFor(element(by.label('OK')).atIndex(0))
			.toBeVisible()
			.withTimeout(2000);
		await expect(element(by.label('OK')).atIndex(0)).toBeVisible();
	});

	it('should validate that the passwords match', async () => {
		element(by.id('input-password')).tap();
		element(by.id('input-password')).typeText('foo');
		element(by.id('input-password-confirm')).typeText('bar\n');
		await element(by.id('submit')).tap();
		await element(by.id('submit')).tap();
		await waitFor(element(by.label('OK')).atIndex(0))
			.toBeVisible()
			.withTimeout(2000);
		await expect(element(by.label('OK')).atIndex(0)).toBeVisible();
	});

	it('should create the password succesfully', async () => {
		element(by.id('input-password')).tap();
		element(by.id('input-password')).typeText('Str0ngP@ss!');
		element(by.id('input-password-confirm')).typeText('Str0ngP@ss!\n');
		await element(by.id('submit')).tap();
		await device.reloadReactNative();
	});

	it('should be able to restore accounts from seed', async () => {
		await element(by.id('import-seed-button')).tap();
		await expect(element(by.id('import-from-seed-screen'))).toBeVisible();
		element(by.id('input-seed-phrase')).tap();
		element(by.id('input-seed-phrase')).typeText(`${TEST_SEED_WORDS}`);
		element(by.id('input-password')).typeText('Str0ngP@ss!');
		element(by.id('input-password-confirm')).typeText('Str0ngP@ss!\n');
		await element(by.id('submit')).tap();
	});

	it('should display the seedwords for the current account', async () => {
		await device.reloadReactNative();
		await waitFor(element(by.id('wallet-screen')))
			.toBeVisible()
			.withTimeout(10000);
		await element(by.id('settings-button')).tap();
		await waitFor(element(by.id('settings-screen')))
			.toBeVisible()
			.withTimeout(10000);
		await element(by.text('Seed Words')).tap();
		await waitFor(element(by.id('seed-words-screen')))
			.toBeVisible()
			.withTimeout(10000);
		await expect(element(by.id('current-seed-words'))).toHaveText(TEST_SEED_WORDS);
	});

	it('should be able to switch networks', async () => {
		await waitFor(element(by.id('wallet-screen')))
			.toBeVisible()
			.withTimeout(10000);
		await element(by.id('settings-button')).tap();
		await waitFor(element(by.id('settings-screen')))
			.toBeVisible()
			.withTimeout(10000);
		await element(by.text('Network')).tap();
		await waitFor(element(by.id('network-settings-screen')))
			.toBeVisible()
			.withTimeout(10000);
		await element(by.text('mainnet'))
			.atIndex(0)
			.tap();

		// Go back twice
		await element(by.text('Settings'))
			.atIndex(1)
			.tap();

		await element(by.text('Wallet'))
			.atIndex(2)
			.tap();

		await expect(element(by.id('navbar-title-network'))).toHaveText('Ethereum Main Network');
	});
});
