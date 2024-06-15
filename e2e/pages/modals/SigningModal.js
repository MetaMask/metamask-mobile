import TestHelpers from '../../helpers';
import { SigningModalSelectorsIDs } from '../../selectors/Modals/SigningModal.selectors';

export default class SigningModal {
  static async tapSignButton() {
    if (device.getPlatform() === 'android') {
      await TestHelpers.waitAndTapByLabel(SigningModalSelectorsIDs.SIGN_BUTTON);
    } else {
      await TestHelpers.waitAndTap(SigningModalSelectorsIDs.SIGN_BUTTON);
    }
  }

  static async tapCancelButton() {
    if (device.getPlatform() === 'android') {
      await TestHelpers.waitAndTapByLabel(
        SigningModalSelectorsIDs.CANCEL_BUTTON,
      );
    } else {
      await TestHelpers.waitAndTap(SigningModalSelectorsIDs.CANCEL_BUTTON);
    }
  }

  static async isEthRequestVisible() {
    await TestHelpers.checkIfVisible(SigningModalSelectorsIDs.ETH_REQUEST);
  }

  static async isPersonalRequestVisible() {
    await TestHelpers.checkIfVisible(SigningModalSelectorsIDs.PERSONAL_REQUEST);
  }

  static async isTypedRequestVisible() {
    await TestHelpers.checkIfVisible(SigningModalSelectorsIDs.TYPED_REQUEST);
  }

  static async isNotVisible() {
    await TestHelpers.checkIfNotVisible(SigningModalSelectorsIDs.ETH_REQUEST);
    await TestHelpers.checkIfNotVisible(
      SigningModalSelectorsIDs.PERSONAL_REQUEST,
    );
    await TestHelpers.checkIfNotVisible(SigningModalSelectorsIDs.TYPED_REQUEST);
  }
}
