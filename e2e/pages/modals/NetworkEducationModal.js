import TestHelpers from '../../helpers';
import {
  NETWORK_EDUCATION_MODAL_CONTAINER_ID,
  NETWORK_EDUCATION_MODAL_CLOSE_BUTTON_ID,
  NETWORK_EDUCATION_MODAL_NETWORK_NAME_ID,
} from '../../../wdio/screen-objects/testIDs/Components/NetworkEducationModalTestIds';
import messages from '../../../locales/languages/en.json';

const manuallyAddTokenText = messages.network_information.add_token;
// const gotItButtonText = messages.network_information.got_it;
export default class NetworkEducationModal {
  static async tapGotItButton() {
    if (device.getPlatform() === 'ios') {
      await TestHelpers.tap(NETWORK_EDUCATION_MODAL_CLOSE_BUTTON_ID);
    } else {
      await TestHelpers.waitAndTapByLabel(
        NETWORK_EDUCATION_MODAL_CLOSE_BUTTON_ID,
      );
    }
  }

  static async tapManuallyAddTokenLink() {
    await TestHelpers.tapByText(manuallyAddTokenText);
  }

  static async isNetworkNameCorrect(network) {
    await TestHelpers.checkIfElementHasString(
      NETWORK_EDUCATION_MODAL_NETWORK_NAME_ID,
      network,
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
