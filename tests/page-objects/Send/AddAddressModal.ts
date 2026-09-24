import { AddAddressModalSelectorsIDs } from '../../../app/components/UI/AddToAddressBookWrapper/AddAddressModal.testIds';
import Matchers from '../../framework/Matchers';
import Gestures from '../../framework/Gestures';
import { type AppiumElement } from '../../framework';
import { PlatformDetector } from '../../framework/PlatformLocator';

class AddAddressModal {
  get container(): Promise<AppiumElement> {
    return Matchers.getElementByID(AddAddressModalSelectorsIDs.CONTAINER);
  }

  get aliasInput(): Promise<AppiumElement> {
    return Matchers.getElementByID(
      AddAddressModalSelectorsIDs.ENTER_ALIAS_INPUT,
    );
  }

  get saveButton(): Promise<AppiumElement> {
    return PlatformDetector.isAndroid()
      ? Matchers.getElementByLabel(AddAddressModalSelectorsIDs.SAVE_BUTTON)
      : Matchers.getElementByID(AddAddressModalSelectorsIDs.SAVE_BUTTON);
  }

  get title(): Promise<AppiumElement> {
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
