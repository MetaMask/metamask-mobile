'use strict';
import TestHelpers from './helpers';
import { strings } from '../locales/i18n';

// use i18n for these
// this way if the strings ever change the tests will not break :)
const Incorrect_Password_Length = strings('import_from_seed.password_length_error');
const Invalid_Seed_Error = strings('import_from_seed.invalid_seed_phrase');
const Password_Warning = strings('reveal_credential.unknown_error');

const Incorrect_Seed_Words = 'fold media south add since false relax immense pause cloth just falcon';
const Correct_Seed_Words = 'fold media south add since false relax immense pause cloth just raven';
const Correct_Password = `12345678`;
const Incorrect_Password = `1234567`;
const Incorrect_Password2 = `12345679`;

describe('Import seedphrase flow', () => {
	beforeEach(() => {
		jest.setTimeout(150000);
	});

	it('should import via seed phrase and validate in settings', async () => {
		// Check that we are on the onboarding carousel screen
		await TestHelpers.checkIfVisible('onboarding-carousel-screen');
		// Check that Get started CTA is visible & tap it
		await TestHelpers.waitAndTap('onboarding-get-started-button');
		// Check that we are on the onboarding screen
		await TestHelpers.checkIfVisible('onboarding-screen');
		// Check that Import using seed phrase CTA is visible & tap it
		await TestHelpers.waitAndTap('import-wallet-import-from-seed-button');
		// Check that we are on the import wallet screen
		await TestHelpers.checkIfVisible('import-from-seed-screen');
		// Input incorrect seed phrase
		if (device.getPlatform() === 'android') {
			await TestHelpers.replaceTextInField(`input-seed-phrase`, Incorrect_Seed_Words);
			await element(by.id('input-seed-phrase')).tapReturnKey();
		} else {
			await TestHelpers.typeTextAndHideKeyboard(`input-seed-phrase`, Incorrect_Seed_Words);
		}
		// Input short password
		await TestHelpers.typeTextAndHideKeyboard(`input-password-field`, Incorrect_Password);
		// Input short password confirm
		await TestHelpers.typeTextAndHideKeyboard(`input-password-field-confirm`, Incorrect_Password);
		// ensure alert box is displayed with correct text
		await TestHelpers.checkIfElementByTextIsVisible(Invalid_Seed_Error);
		// dismiss alert by tapping ok
		await TestHelpers.tapAlertWithButton('OK');
		// Clear field content
		await TestHelpers.clearField('input-seed-phrase');
		// Input correct seed phrase
		if (device.getPlatform() === 'android') {
			await TestHelpers.replaceTextInField(`input-seed-phrase`, Correct_Seed_Words);
			await element(by.id('input-seed-phrase')).tapReturnKey();
		} else {
			await TestHelpers.typeTextAndHideKeyboard(`input-seed-phrase`, Correct_Seed_Words);
		}
		await TestHelpers.typeTextAndHideKeyboard(`input-password-field`, Incorrect_Password);
		// Input short password confirm
		await TestHelpers.typeTextAndHideKeyboard(`input-password-field-confirm`, Incorrect_Password);
		await TestHelpers.checkIfElementByTextIsVisible(Incorrect_Password_Length);
		await TestHelpers.tapAlertWithButton('OK');
		// Input password
		await TestHelpers.typeTextAndHideKeyboard(`input-password-field`, Correct_Password);
		// Input password confirm
		await TestHelpers.typeTextAndHideKeyboard(`input-password-field-confirm`, Correct_Password);
		// Check that we are on the congrats screen
		await TestHelpers.checkIfVisible('import-congrats-screen');
		// Tap on done CTA
		await TestHelpers.tap('manual-backup-step-3-done-button');
		// Check that we are on the metametrics optIn screen
		await TestHelpers.checkIfVisible('metaMetrics-OptIn');
		// Check that I Agree CTA is visible and tap it
		await TestHelpers.waitAndTap('agree-button', 15000);
		// Should be on wallet screen
		if (!device.getPlatform() === 'android') {
			await TestHelpers.checkIfExists('wallet-screen');
		}
		// Check that No thanks CTA is visible and tap it
		await TestHelpers.waitAndTap('onboarding-wizard-back-button');
		// Check that the onboarding wizard is gone
		await TestHelpers.checkIfNotVisible('onboarding-wizard-step1-view');
		// Open Drawer
		await TestHelpers.tap('hamburger-menu-button-wallet');
		// Check that the drawer is visbile
		await TestHelpers.checkIfVisible('drawer-screen');
		// Tap on settings
		await TestHelpers.tapByText('Settings');
		// Tap on the "Security & Privacy" option
		await TestHelpers.tapByText('Security & Privacy');
		// Tap on Reveal Seed Phrase Button
		await TestHelpers.waitAndTap('reveal-seed-button');
		// Check that we are on the reveal seed phrase screen
		await TestHelpers.checkIfVisible('reveal-private-credential-screen');
		// Input incorrect password
		await TestHelpers.typeTextAndHideKeyboard('private-credential-password-text-input', Incorrect_Password);
		// Ensure error is displayed
		await TestHelpers.checkIfHasText('password-warning', Password_Warning);
		// Input correct password
		await TestHelpers.typeTextAndHideKeyboard('private-credential-password-text-input', Correct_Password);
		// Ensure password field no longer is shown
		await TestHelpers.checkIfNotVisible('private-credential-password-text-input');
		// Seed phrase should now be revealed
		await TestHelpers.checkIfVisible('private-credential-touchable');
		// Check that the seed phrase displayed matches what we inputted in the beginning
		await TestHelpers.checkIfHasText('private-credential-text', Correct_Seed_Words);
	});

	it('should be able to log in', async () => {
		// Relaunch app
		await TestHelpers.relaunchApp();
		// Check that we are on login screen
		await TestHelpers.checkIfVisible('login');
		// Fail login attempt
		await TestHelpers.typeTextAndHideKeyboard('login-password-input', Incorrect_Password2);
		await TestHelpers.checkIfVisible('invalid-password-error');
		// Login
		await TestHelpers.typeTextAndHideKeyboard('login-password-input', Correct_Password);
		// Check that we are on the wallet screen
		await TestHelpers.checkIfVisible('wallet-screen');
	});
});
