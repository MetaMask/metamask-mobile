import TestHelpers from '../../../../helpers';

const container = 'contacts-screen';
const addContactButton = 'add-contact-button';
const addressInputBox = 'contact-address-input';

export default class ContactsView {
	static async tapAddContactButton() {
		await TestHelpers.tap(addContactButton);
	}

	static async clearAddressInputBox() {
		await TestHelpers.clearField(addressInputBox);
	}

	static async tapOnAlias(alias) {
		await TestHelpers.tapByText(alias);
	}

	// Assertions

	static async isVisible() {
		await TestHelpers.checkIfVisible(container);
	}

	static async isNotVisible() {
		await TestHelpers.checkIfNotVisible(container);
	}

	static async isContactAliasVisible(alias) {
		await TestHelpers.checkIfElementWithTextIsVisible(alias);
	}
	static async isContactAliasNotVisible(alias) {
		await TestHelpers.checkIfElementWithTextIsNotVisible(alias);
	}
}
