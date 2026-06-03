import { AddAddressModalSelectorsIDs } from '../../../app/components/UI/AddToAddressBookWrapper/AddAddressModal.testIds';
import Matchers from '../../framework/Matchers';
import {
  encapsulated,
  EncapsulatedElementType,
} from '../../framework/EncapsulatedElement';
import PlaywrightMatchers from '../../framework/PlaywrightMatchers';
import UnifiedGestures from '../../framework/UnifiedGestures';

class AddAddressModal {
  get container(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(AddAddressModalSelectorsIDs.CONTAINER),
      appium: () =>
        PlaywrightMatchers.getElementById(
          AddAddressModalSelectorsIDs.CONTAINER,
        ),
    });
  }

  get aliasInput(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(AddAddressModalSelectorsIDs.ENTER_ALIAS_INPUT),
      appium: () =>
        PlaywrightMatchers.getElementById(
          AddAddressModalSelectorsIDs.ENTER_ALIAS_INPUT,
        ),
    });
  }

  get saveButton(): DetoxElement {
    return device.getPlatform() === 'android'
      ? Matchers.getElementByLabel(AddAddressModalSelectorsIDs.SAVE_BUTTON)
      : Matchers.getElementByID(AddAddressModalSelectorsIDs.SAVE_BUTTON);
  }

  get title(): EncapsulatedElementType {
    return encapsulated({
      detox: () => Matchers.getElementByID(AddAddressModalSelectorsIDs.TITLE),
      appium: () =>
        PlaywrightMatchers.getElementById(AddAddressModalSelectorsIDs.TITLE),
    });
  }

  async typeInAlias(name: string): Promise<void> {
    await UnifiedGestures.typeText(this.aliasInput, name, {
      elemDescription: 'Alias Input Field in Add Address Modal',
      hideKeyboard: true,
    });
  }

  async tapSaveButton(): Promise<void> {
    await UnifiedGestures.waitAndTap(this.saveButton, {
      elemDescription: 'Save Button in Add Address Modal',
    });
  }

  async tapTitle(): Promise<void> {
    await UnifiedGestures.waitAndTap(this.title, {
      elemDescription: 'Title in Add Address Modal',
    });
  }
}

export default new AddAddressModal();
