import TestHelpers from '../../../../helpers';

const CONTACTS_CONTAINER_ID = 'contacts-screen';
const ADD_CONTACT_BUTTON_ID = 'add-contact-button';
const CONTACTS_VIEW_ADDRESS_INPUT_BOX_ID = 'contact-address-input';

export default class ContactsView {
	static async tapAddContactButton() {
		await TestHelpers.tap(ADD_CONTACT_BUTTON_ID);
	}

	static async clearAddressInputBox() {
		await TestHelpers.clearField(CONTACTS_VIEW_ADDRESS_INPUT_BOX_ID);
	}

	static async tapOnAlias(alias) {
		await TestHelpers.tapByText(alias);
	}

	// Assertions

	static async isVisible() {
		await TestHelpers.checkIfVisible(CONTACTS_CONTAINER_ID);
	}

	static async isNotVisible() {
		await TestHelpers.checkIfNotVisible(CONTACTS_CONTAINER_ID);
	}

	static async isContactAliasVisible(alias) {
		await TestHelpers.checkIfElementWithTextIsVisible(alias);
	}
	static async isContactAliasNotVisible(alias) {
		await TestHelpers.checkIfElementWithTextIsNotVisible(alias);
	}
}
