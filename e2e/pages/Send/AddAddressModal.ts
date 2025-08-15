import { AddAddressModalSelectorsIDs } from '../../selectors/SendFlow/AddAddressModal.selectors';
import Matchers from '../../framework/Matchers';
import Gestures from '../../framework/Gestures';

class AddAddressModal {
  get container(): DetoxElement {
    return Matchers.getElementByID(AddAddressModalSelectorsIDs.CONTAINER);
  }

  get aliasInput(): DetoxElement {
    return Matchers.getElementByID(
      AddAddressModalSelectorsIDs.ENTER_ALIAS_INPUT,
    );
  }

  get saveButton(): DetoxElement {
    return device.getPlatform() === 'android'
      ? Matchers.getElementByLabel(AddAddressModalSelectorsIDs.SAVE_BUTTON)
      : Matchers.getElementByID(AddAddressModalSelectorsIDs.SAVE_BUTTON);
  }

  get title(): DetoxElement {
    return Matchers.getElementByID(AddAddressModalSelectorsIDs.TITLE);
  }

  async typeInAlias(name: string): Promise<void> {
    await Gestures.typeText(this.aliasInput, name, {
      elemDescription: 'Alias Input Field in Add Address Modal',
      hideKeyboard: true,
    });
  }

  async tapSaveButton(): Promise<void> {
    await Gestures.waitAndTap(this.saveButton, {
      elemDescription: 'Save Button in Add Address Modal',
    });
  }

  async tapTitle(): Promise<void> {
    await Gestures.waitAndTap(this.title, {
      elemDescription: 'Title in Add Address Modal',
    });
  }
}

export default new AddAddressModal();
