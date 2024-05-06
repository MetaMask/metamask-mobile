import { SigningModalSelectorsIDs } from '../../selectors/Modals/SigningModal.selectors';
import Matchers from '../../utils/Matchers';
import Gestures from '../../utils/Gestures';

class SigningModal {
  get signButton() {
    return device.getPlatform() === 'android'
      ? Matchers.getElementByLabel(SigningModalSelectorsIDs.SIGN_BUTTON)
      : Matchers.getElementByID(SigningModalSelectorsIDs.SIGN_BUTTON);
  }

  get cancelButton() {
    return device.getPlatform() === 'android'
      ? Matchers.getElementByLabel(SigningModalSelectorsIDs.CANCEL_BUTTON)
      : Matchers.getElementByID(SigningModalSelectorsIDs.CANCEL_BUTTON);
  }

  get ethRequest() {
    return Matchers.getElementByID(SigningModalSelectorsIDs.ETH_REQUEST);
  }

  get personalRequest() {
    return Matchers.getElementByID(SigningModalSelectorsIDs.PERSONAL_REQUEST);
  }

  get typedRequest() {
    return Matchers.getElementByID(SigningModalSelectorsIDs.TYPED_REQUEST);
  }

  async tapSignButton() {
    await Gestures.waitAndTap(this.signButton);
  }

  async tapCancelButton() {
    await Gestures.waitAndTap(this.cancelButton);
  }
}

export default new SigningModal();
