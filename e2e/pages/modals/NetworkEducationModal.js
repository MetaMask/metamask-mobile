import TestHelpers from '../../helpers';
import {
  NETWORK_EDUCATION_MODAL_CONTAINER_ID,
  NETWORK_EDUCATION_MODAL_CLOSE_BUTTON_ID,
  NETWORK_EDUCATION_MODAL_NETWORK_NAME_ID,
} from '../../../wdio/screen-objects/testIDs/Components/NetworkEducationModalTestIds';
import { strings } from '../../../locales/i18n';

const manuallyAddTokenText = strings('network_information.add_token');
export default class NetworkEducationModal {
  static async tapGotItButton() {
    await TestHelpers.tap(NETWORK_EDUCATION_MODAL_CLOSE_BUTTON_ID);
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
    await TestHelpers.checkIfVisible(NETWORK_EDUCATION_MODAL_CONTAINER_ID);
  }

  static async isNotVisible() {
    await TestHelpers.checkIfNotVisible(NETWORK_EDUCATION_MODAL_CONTAINER_ID);
  }
}
