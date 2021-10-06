import TestHelpers from '../../../../helpers';

const addContactButton = 'contact-add-contact-button';
const container = 'add-contact-screen';
const contactInputBox = 'contact-name-input';
const addressInputBox = 'contact-address-input';
const memoInputBox = 'contact-memo-input';
const errorMessageLabel = 'error-message-warning';

export default class AddContactView {
	static async tapAddContactButton() {
		if (device.getPlatform() === 'android') {
			await TestHelpers.tap(addContactButton);
			await TestHelpers.delay(700);
			await TestHelpers.tap(addContactButton);
		} else {
			await TestHelpers.tap(addContactButton);
		}
	}

	static async tapEditButton() {
		await TestHelpers.tapByText('Edit'); // edit button when you tap on the alias
	}

	static async tapEditContactCTA() {
		await TestHelpers.doubleTapByText('Edit contact'); // edit CTA button after you make changes to a contact
	}

	static async typeInName(name) {
		if (device.getPlatform() === 'android') {
			await TestHelpers.replaceTextInField(contactInputBox, name);
			await element(by.id(contactInputBox)).tapReturnKey();
		} else {
			await TestHelpers.replaceTextInField(contactInputBox, name);
		}
	}

	static async typeInAddress(address) {
		await TestHelpers.replaceTextInField(addressInputBox, address);
	}

	static async typeInMemo(memo) {
		await TestHelpers.replaceTextInField(memoInputBox, memo);
	}
	static async clearAddressInputBox() {
		await TestHelpers.clearField(addressInputBox);
	}

	// Assertions

	static async isVisible() {
		await TestHelpers.checkIfVisible(container);
	}

	static async isNotVisible() {
		await TestHelpers.checkIfNotVisible(container);
	}

	static async isErrorMessageVisible() {
		await TestHelpers.checkIfVisible(errorMessageLabel);
	}
	static async isErrorMessageTextCorrect() {
		await TestHelpers.checkIfElementHasString(errorMessageLabel, 'Invalid address');
	}
}
