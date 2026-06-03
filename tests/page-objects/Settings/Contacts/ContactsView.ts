import { ContactsViewSelectorIDs } from '../../../../app/components/Views/Settings/Contacts/ContactsView.testIds';
import Matchers from '../../../framework/Matchers';
import Assertions from '../../../framework/Assertions';
import {
  encapsulated,
  EncapsulatedElementType,
} from '../../../framework/EncapsulatedElement';
import PlaywrightMatchers from '../../../framework/PlaywrightMatchers';
import UnifiedGestures from '../../../framework/UnifiedGestures';

class ContactsView {
  get container(): EncapsulatedElementType {
    return encapsulated({
      detox: () => Matchers.getElementByID(ContactsViewSelectorIDs.CONTAINER),
      appium: () =>
        PlaywrightMatchers.getElementById(ContactsViewSelectorIDs.CONTAINER),
    });
  }

  get addButton(): DetoxElement {
    return device.getPlatform() === 'ios'
      ? Matchers.getElementByID(ContactsViewSelectorIDs.ADD_BUTTON)
      : Matchers.getElementByLabel(ContactsViewSelectorIDs.ADD_BUTTON);
  }

  async tapOnAlias(alias: string): Promise<void> {
    const contactAlias = Matchers.getElementByText(alias);
    await UnifiedGestures.waitAndTap(contactAlias, {
      elemDescription: `Contact Alias: ${alias}`,
    });
  }

  async tapAddContactButton(): Promise<void> {
    await UnifiedGestures.waitAndTap(this.addButton, {
      elemDescription: 'Add Contact Button',
    });
  }

  async expectContactIsVisible(alias: string): Promise<void> {
    await Assertions.expectTextDisplayed(alias);
  }

  async expectContactIsNotVisible(alias: string): Promise<void> {
    await Assertions.expectTextNotDisplayed(alias);
  }
}

export default new ContactsView();
