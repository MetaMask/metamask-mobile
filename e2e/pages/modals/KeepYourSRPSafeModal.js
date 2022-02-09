import TestHelpers from '../../helpers';

const HOLD_TO_REVEAL_SRP_BUTTON_ID = 'seed-phrase-hold-to-reveal';

export default class KeepYourSRPSafeModal {
	static async tapAndHoldToRevealSecretRecoveryPhraseButton() {
		await TestHelpers.tapAndLongPressByID(HOLD_TO_REVEAL_SRP_BUTTON_ID);
	}

	static async isVisible() {
		await TestHelpers.checkIfElementWithTextIsVisible('Keep your SRP safe');
	}

	static async isNotVisible() {
		await TestHelpers.checkIfElementWithTextIsNotVisible('Keep your SRP safe');
	}
}
