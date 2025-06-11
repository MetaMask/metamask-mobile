import { ChoosePasswordSelectorsIDs } from '../../selectors/Onboarding/ChoosePassword.selectors';
import Matchers from '../../utils/Matchers';
import Gestures from '../../utils/Gestures';

class CreatePasswordView {
  get container() {
    return Matchers.getElementByID(ChoosePasswordSelectorsIDs.CONTAINER_ID);
  }

  get newPasswordInput() {
    return Matchers.getElementByID(
      ChoosePasswordSelectorsIDs.NEW_PASSWORD_INPUT_ID,
    );
  }

  get confirmPasswordInput() {
    return Matchers.getElementByID(
      ChoosePasswordSelectorsIDs.CONFIRM_PASSWORD_INPUT_ID,
    );
  }

  get iUnderstandCheckbox() {
    return device.getPlatform() === 'ios'
      ? Matchers.getElementByID(
          ChoosePasswordSelectorsIDs.IOS_I_UNDERSTAND_BUTTON_ID,
        )
      : Matchers.getElementByID(
          ChoosePasswordSelectorsIDs.ANDROID_I_UNDERSTAND_BUTTON_ID,
        );
  }

  get submitButton() {
    return device.getPlatform() === 'ios'
      ? Matchers.getElementByID(ChoosePasswordSelectorsIDs.SUBMIT_BUTTON_ID)
      : Matchers.getElementByLabel(ChoosePasswordSelectorsIDs.SUBMIT_BUTTON_ID);
  }

  async enterPassword(password) {
    await Gestures.typeTextAndHideKeyboard(this.newPasswordInput, password);
  }

  async reEnterPassword(password) {
    await Gestures.typeTextAndHideKeyboard(this.confirmPasswordInput, password);
  }

  async tapIUnderstandCheckBox() {
    await Gestures.waitAndTap(this.iUnderstandCheckbox);
  }

  async tapCreatePasswordButton() {
    await Gestures.waitAndTap(this.submitButton);
  }
}

export default new CreatePasswordView();
