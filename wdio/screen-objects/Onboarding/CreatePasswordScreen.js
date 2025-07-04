
import Selectors from '../../helpers/Selectors';
import Gestures from '../../helpers/Gestures';
import { ChoosePasswordSelectorsIDs } from '../../../e2e/selectors/Onboarding/ChoosePassword.selectors';

class CreatePasswordScreen {
  get container() {
    return Selectors.getXpathElementByResourceId(ChoosePasswordSelectorsIDs.CONTAINER_ID);
  }

  get newPasswordInput() {
    return Selectors.getXpathElementByResourceId(
      ChoosePasswordSelectorsIDs.NEW_PASSWORD_INPUT_ID,
    );
  }

  get confirmPasswordInput() {
    return Selectors.getXpathElementByResourceId(
      ChoosePasswordSelectorsIDs.CONFIRM_PASSWORD_INPUT_ID,
    );
  }

  get iUnderstandCheckbox() {
    return Selectors.getXpathElementByResourceId(
      ChoosePasswordSelectorsIDs.I_UNDERSTAND_CHECKBOX_ID,
    );
  }

  get iUnderstandCheckboxNewWallet() {
    return Selectors.getXpathElementByResourceId(
      ChoosePasswordSelectorsIDs.I_UNDERSTAND_CHECKBOX_ID,
     );
  }

  get submitButton() {
    return Selectors.getXpathElementByResourceId(
      ChoosePasswordSelectorsIDs.SUBMIT_BUTTON_ID,
    );
  }

  async enterPassword(password) {
    await Gestures.setValueWithoutTap(this.newPasswordInput, password);
  }

  async reEnterPassword(password) {
    await Gestures.setValueWithoutTap(this.confirmPasswordInput, password);
  }

  async tapIUnderstandCheckBox() {
    await Gestures.waitAndTap(this.iUnderstandCheckbox);
  }

  async tapCreatePasswordButton() {
    await Gestures.waitAndTap(this.submitButton);
  }
}

export default new CreatePasswordScreen();
