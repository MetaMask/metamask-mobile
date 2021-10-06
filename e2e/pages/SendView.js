import TestHelpers from '../helpers';

const addressInputBox = 'txn-to-address-input';
const addToAddressBookButton = 'add-address-button';
const cancelButton = 'send-cancel-button';
const incorrectAddressError = 'address-error';
const noEthWarningMessage = 'no-eth-message';
const myAccountsButton = 'my-accounts-button';
const removeAddressButton = 'clear-address-button';

export default class SendView {
	static async tapcancelButton() {
		await TestHelpers.tap(cancelButton);
	}

	static async inputAddress(address) {
		if (device.getPlatform() === 'android') {
			await TestHelpers.replaceTextInField(addressInputBox, address);
		} else {
			await TestHelpers.typeTextAndHideKeyboard(addressInputBox, address);
		}
	}

	static async tapAddAddressToAddressBook() {
		await TestHelpers.waitAndTap(addToAddressBookButton);
	}

	static async removeAddress() {
		// Tap x to remove address
		await TestHelpers.tap(removeAddressButton);
		await TestHelpers.delay(1000);
	}

	// Assertions

	static async isTransferBetweenMyAccountsButtonVisible() {
		await TestHelpers.checkIfExists(myAccountsButton);
	}

	static async incorrectAddressErrorMessageIsVisible() {
		await TestHelpers.checkIfVisible(incorrectAddressError);
	}

	static async noEthWarningMessageIsVisible() {
		//Check that the warning appears at the bottom of the screen
		await TestHelpers.checkIfVisible(noEthWarningMessage);
	}

	static async isSavedAliasVisible(name) {
		await TestHelpers.checkIfElementWithTextIsVisible(name);
	}
}
