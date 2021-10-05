import TestHelpers from '../../../helpers';

export default class SettingsView {
	static async tapGeneral() {
		await TestHelpers.tapByText('General');
	}

	static async tapContacts() {
		await TestHelpers.tapByText('Contacts');
	}

	static async tapSecurityAndPrivacy() {
		await TestHelpers.tapByText('Security & Privacy');
	}

	static async tapNetworks() {
		await TestHelpers.tapByText('Networks');
	}
}
