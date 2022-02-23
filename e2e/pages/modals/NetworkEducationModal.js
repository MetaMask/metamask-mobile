import TestHelpers from '../../helpers';

const NETWORK_EDUCATION_MODAL_CONTAINER_ID = 'education-modal-container-id';
const GOT_IT_BUTTON_ID = 'close-network-info-button';

export default class NetworkEducationModal {
	static async tapGotItButton() {
		await TestHelpers.tap(GOT_IT_BUTTON_ID);
	}

	static async isVisible() {
		await TestHelpers.checkIfVisible(NETWORK_EDUCATION_MODAL_CONTAINER_ID);
	}

	static async isNotVisible() {
		await TestHelpers.checkIfNotVisible(NETWORK_EDUCATION_MODAL_CONTAINER_ID);
	}
}
