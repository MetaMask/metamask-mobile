import { ContactsViewSelectorIDs } from '../../../../app/components/Views/Settings/Contacts/ContactsView.testIds';
import Matchers from '../../../framework/Matchers';
import Gestures from '../../../framework/Gestures';
import Assertions from '../../../framework/Assertions';

class ContactsView {
  get container(): DetoxElement {
    return Matchers.getElementByID(ContactsViewSelectorIDs.CONTAINER);
  }

  get addButton(): DetoxElement {
    return device.getPlatform() === 'ios'
      ? Matchers.getElementByID(ContactsViewSelectorIDs.ADD_BUTTON)
      : Matchers.getElementByLabel(ContactsViewSelectorIDs.ADD_BUTTON);
  }

  async tapOnAlias(alias: string): Promise<void> {
    const contactAlias = Matchers.getElementByText(alias);
    await Gestures.waitAndTap(contactAlias, {
      elemDescription: `Contact Alias: ${alias}`,
    });
  }

  async tapAddContactButton(): Promise<void> {
    await Gestures.waitAndTap(this.addButton, {
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
