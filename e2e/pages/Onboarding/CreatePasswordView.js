import { ChoosePasswordSelectorsIDs } from '../../selectors/Onboarding/ChoosePassword.selectors';
import Matchers from '../../utils/Matchers';
import Gestures from '../../utils/Gestures';
import enContent from '../../../locales/languages/en.json';

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
    return Matchers.getElementByID(
      ChoosePasswordSelectorsIDs.I_UNDERSTAND_CHECKBOX_ID,
    );
  }

  get iUnderstandCheckboxNewWallet() {
    return Matchers.getElementByID(
      ChoosePasswordSelectorsIDs.I_UNDERSTAND_CHECKBOX_ID,
     );
  }

  get submitButton() {
    return Matchers.getElementByID(
      ChoosePasswordSelectorsIDs.SUBMIT_BUTTON_ID,
    );
  }

  get passwordError() {
    return Matchers.getElementByText(
      enContent.import_from_seed.password_error,
    );
  }

  async resetPasswordInputs() {
    await Gestures.clearField(this.newPasswordInput);
    await Gestures.clearField(this.confirmPasswordInput);
  }

  async enterPassword(password) {
    await Gestures.typeTextAndHideKeyboard(this.newPasswordInput, password);
  }

  async reEnterPassword(password) {
    await Gestures.typeTextAndHideKeyboard(this.confirmPasswordInput, password);
  }

  async tapIUnderstandCheckBox() {
    await Gestures.tap(this.iUnderstandCheckbox);
  }

  async tapCreatePasswordButton() {
    await Gestures.waitAndTap(this.submitButton);
  }
}

export default new CreatePasswordView();
