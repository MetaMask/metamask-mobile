import TestHelpers from '../../helpers';

const container = 'add-address-modal';
const enterAliasInputBox = 'address-alias-input';

export default class AddAddressModal {
	static async typeInAlias(name) {
		if (device.getPlatform() === 'android') {
			await TestHelpers.replaceTextInField(enterAliasInputBox, name);
			await element(by.id(enterAliasInputBox)).tapReturnKey();
		} else {
			await TestHelpers.typeTextAndHideKeyboard(enterAliasInputBox, name);
		}
	}

	static async tapSaveButton() {
		await TestHelpers.tapByText('Save');
	}

	static async isVisible() {
		await TestHelpers.checkIfVisible(container);
	}

	static async isNotVisible() {
		await TestHelpers.checkIfNotVisible(container);
	}
}
