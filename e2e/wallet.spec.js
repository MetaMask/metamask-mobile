'use strict';

const TEST_SEED_WORDS = 'recipe silver label ensure thing vendor abuse twin wait receive unaware flower';

describe('Wallet', () => {
	it('should be able to restore accounts from seed', async () => {
		await element(by.id('import-seed-button')).tap();
		await expect(element(by.id('import-from-seed-screen'))).toBeVisible();
		await element(by.id('input-seed-phrase')).tap();
		await element(by.id('input-seed-phrase')).typeText(`${TEST_SEED_WORDS}`);
		await element(by.id('input-password')).typeText('Str0ngP@ss!');
		await element(by.id('input-password-confirm')).typeText('Str0ngP@ss!\n');
		await element(by.id('submit')).tap();
	});

	it('should display the seedwords for the current account', async () => {
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
		await device.launchApp({ newInstance: true });
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
