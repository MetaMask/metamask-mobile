import {
  ContactsViewSelectorIDs,
  ContactsViewSelectorsText,
} from '../../../../selectors/Settings/Contacts/ContacsView.selectors';
import Matchers from '../../../../utils/Matchers';
import Gestures from '../../../../utils/Gestures';

class ContactsView {
  get container() {
    return Matchers.getElementByID(ContactsViewSelectorIDs.CONTAINER);
  }

  get labelAddButton() {
    return Matchers.getElementByLabel(ContactsViewSelectorIDs.ADD_BUTTON);
  }

  get addButton() {
    return Matchers.getElementByID(ContactsViewSelectorIDs.ADD_BUTTON);
  }

  get mythContact() {
    return Matchers.getElementByText(ContactsViewSelectorsText.MYTH_CONTACT);
  }

  get moonContact() {
    return Matchers.getElementByText(ContactsViewSelectorsText.MOON_CONTACT);
  }

  get aceContact() {
    return Matchers.getElementByText(ContactsViewSelectorsText.ACE_CONTACT);
  }

  get ibrahimContact() {
    return Matchers.getElementByText(ContactsViewSelectorsText.IBRAHIM_CONTACT);
  }

  async tapAddContactButton() {
    if (device.getPlatform() === 'android') {
      await Gestures.waitAndTap(this.labelAddButton);
    } else {
      await Gestures.waitAndTap(this.addButton);
    }
  }

  async tapMythContact() {
    await Gestures.waitAndTap(this.mythContact);
  }

  async tapMoonContact() {
    await Gestures.waitAndTap(this.moonContact);
  }
}

export default new ContactsView();
