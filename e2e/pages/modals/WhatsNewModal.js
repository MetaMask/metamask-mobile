import TestHelpers from '../../helpers';
import {
  WHATS_NEW_MODAL_CONTAINER_ID,
  WHATS_NEW_MODAL_CLOSE_BUTTON_ID,
  WHATS_NEW_MODAL_GOT_IT_BUTTON_ID,
} from '../../../app/constants/test-ids';

export default class WhatsNewModal {
  static async tapGotItButton() {
    await TestHelpers.tap(WHATS_NEW_MODAL_GOT_IT_BUTTON_ID);
  }

  static async tapCloseButton() {
    await TestHelpers.tap(WHATS_NEW_MODAL_CLOSE_BUTTON_ID);
  }

  static async isVisible() {
    await TestHelpers.checkIfVisible(WHATS_NEW_MODAL_CONTAINER_ID);
  }

  static async isNotVisible() {
    await TestHelpers.checkIfNotVisible(WHATS_NEW_MODAL_CONTAINER_ID);
  }
}
