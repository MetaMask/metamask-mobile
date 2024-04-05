import TestHelpers from '../../helpers';
import {
  NETWORK_EDUCATION_MODAL_CONTAINER_ID,
  NETWORK_EDUCATION_MODAL_CLOSE_BUTTON_ID,
  NETWORK_EDUCATION_MODAL_NETWORK_NAME_ID,
} from '../../../wdio/screen-objects/testIDs/Components/NetworkEducationModalTestIds';
import { NetworkEducationModalSelectorsText } from '../../selectors/Modals/NetworkEducationModal.selectors';

export default class NetworkEducationModal {
  static async tapGotItButton() {
    if (device.getPlatform() === 'ios') {
      await TestHelpers.waitAndTap(NETWORK_EDUCATION_MODAL_CLOSE_BUTTON_ID);
    } else {
      await TestHelpers.waitAndTapByLabel(
        NETWORK_EDUCATION_MODAL_CLOSE_BUTTON_ID,
      );
    }
  }

  static async tapManuallyAddTokenLink() {
    await TestHelpers.tapByText(NetworkEducationModalSelectorsText.ADD_TOKEN);
  }

  static async isNetworkNameCorrect(networkName) {
    await TestHelpers.checkIfElementHasString(
      NETWORK_EDUCATION_MODAL_NETWORK_NAME_ID,
      networkName,
    );
  }

  static async isVisible() {
    if (device.getPlatform() === 'ios') {
      await TestHelpers.checkIfVisible(NETWORK_EDUCATION_MODAL_CONTAINER_ID);
    }
  }

  static async isNotVisible() {
    await TestHelpers.checkIfNotVisible(NETWORK_EDUCATION_MODAL_CONTAINER_ID);
  }
}
