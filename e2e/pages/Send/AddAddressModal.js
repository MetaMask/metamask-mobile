import { AddAddressModalSelectorsIDs } from '../../selectors/SendFlow/AddAddressModal.selectors';
import Matchers from '../../utils/Matchers';
import Gestures from '../../utils/Gestures';

class AddAddressModal {
  get container() {
    return Matchers.getElementByID(AddAddressModalSelectorsIDs.CONTAINER);
  }

  get aliasInput() {
    return Matchers.getElementByID(
      AddAddressModalSelectorsIDs.ENTER_ALIAS_INPUT,
    );
  }

  get saveButton() {
    return device.getPlatform() === 'android'
      ? Matchers.getElementByLabel(AddAddressModalSelectorsIDs.SAVE_BUTTON)
      : Matchers.getElementByID(AddAddressModalSelectorsIDs.SAVE_BUTTON);
  }

  get title() {
    return Matchers.getElementByID(AddAddressModalSelectorsIDs.TITLE);
  }

  async typeInAlias(name) {
    await Gestures.typeTextAndHideKeyboard(this.aliasInput, name);
  }

  async tapSaveButton() {
    await Gestures.waitAndTap(this.saveButton);
  }

  async tapTitle() {
    await Gestures.waitAndTap(this.title);
  }
}

export default new AddAddressModal();
