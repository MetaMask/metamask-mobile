'use strict';
import TestHelpers from './helpers';

const Incorrect_Seed_Words = 'fold media south add since false relax immense pause cloth just falcon';
const Correct_Seed_Words = 'fold media south add since false relax immense pause cloth just raven';
const Incorrect_Password_Length = 'The password needs to be at least 8 characters long';
const Invalid_Seed_Error = `Error: Seed phrase is invalid.`;
const Correct_Password = `12345678`;
const Incorrect_Password = `1234567`;
const Password_Warning = "Couldn't unlock your account. Please try again.";

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
		// Check that Sync or import your wallet CTA is visible & tap it
		await TestHelpers.waitAndTap('onboarding-import-button');
		// Check that we are on the import wallet screen
		await TestHelpers.checkIfVisible('import-wallet-screen');
		// Check that Import using seed phrase CTA is visible & tap it
		await TestHelpers.waitAndTap('import-wallet-import-from-seed-button');
		// Check that we are on the import from seed screen
		await TestHelpers.checkIfVisible('import-from-seed-screen');
		// Input incorrect seed phrase
		await TestHelpers.typeTextAndHideKeyboard(`input-seed-phrase`, Incorrect_Seed_Words);
		// Input short password
		await TestHelpers.typeTextAndHideKeyboard(`input-password-field`, Incorrect_Password);
		// Input short password confirm
		await TestHelpers.typeTextAndHideKeyboard(`input-password-field-confirm`, Incorrect_Password);
		// ensure alert box is displayed with correct text
		await TestHelpers.checkIfElementByTextIsVisible(Incorrect_Password_Length);
		// dismiss alert by tapping ok
		await element(by.label('OK'))
			.atIndex(0)
			.tap();
		// Input password
		await TestHelpers.typeTextAndHideKeyboard(`input-password-field`, Correct_Password);
		// Input password confirm
		await TestHelpers.typeTextAndHideKeyboard(`input-password-field-confirm`, Correct_Password);
		// Ensure error is displayed
		await TestHelpers.checkIfHasText('invalid-seed-phrase', Invalid_Seed_Error);
		// Clear field content
		await TestHelpers.clearField('input-seed-phrase');
		// Input correct seed phrase
		await TestHelpers.typeTextAndHideKeyboard(`input-seed-phrase`, Correct_Seed_Words);
		// Tap outside of box
		await TestHelpers.tapAtPoint('import-from-seed-screen', { x: 40, y: 20 });
		// Tap import to continue
		await TestHelpers.waitAndTap('submit');
		// Check that we are on the metametrics optIn screen
		await TestHelpers.checkIfVisible('metaMetrics-OptIn');
		// Check that I Agree CTA is visible and tap it
		await TestHelpers.waitAndTap('agree-button');
		// Check that we are on the wallet screen
		await TestHelpers.checkIfExists('wallet-screen');
		// Check that No thanks CTA is visible and tap it
		await TestHelpers.waitAndTap('onboarding-wizard-back-button');
		// Check that the onboarding wizard is gone
		await TestHelpers.checkIfNotVisible('onboarding-wizard-step1-view');
		// Open Drawer
		await TestHelpers.tapAtPoint('wallet-screen', { x: 30, y: -5 });
		// Check that the drawer is visbile
		await TestHelpers.checkIfVisible('drawer-screen');
		// Tap on settings
		await TestHelpers.tap('settings-button');
		// Tap on the "Security & Privacy" option
		await TestHelpers.tapByText('Security & Privacy');
		// Swipe up the screen
		await TestHelpers.swipe('clear-privacy', 'up');
		// Check that you are on bottom of screen
		await TestHelpers.checkIfVisible('reveal-seed-title');
		// Tap on Reveal Seed Phrase Button
		await TestHelpers.waitAndTap('reveal-seedphrase-button');
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
		// Relaunch app
		await TestHelpers.relaunchApp();
		// Check that we are on login screen
		await TestHelpers.checkIfVisible('login');
		// Tap on log in button
		await TestHelpers.tap('log-in-button');
		// Check that the invalid error is displayed
		await TestHelpers.checkIfVisible('invalid-password-error');
		// Log in
		await TestHelpers.typeTextAndHideKeyboard('login-password-input', Correct_Password);
		// Check that we are on the Browser page
		await TestHelpers.checkIfVisible('browser-screen');
	});
});
