import TestHelpers from '../../../helpers';
import { ContactsViewSelectorIDs } from '../../../selectors/Settings/Contacts/ContacsView.selectors';
import Matchers from '../../../utils/Matchers';
import Gestures from '../../../utils/Gestures';

class ContactsView {
  get container() {
    return Matchers.getElementByID(ContactsViewSelectorIDs.CONTAINER);
  }

  get addButton() {
    return device.getPlatform() === 'ios'
      ? Matchers.getElementByID(ContactsViewSelectorIDs.ADD_BUTTON)
      : Matchers.getElementByLabel(ContactsViewSelectorIDs.ADD_BUTTON);
  }

  async tapOnAlias(alias) {
    const contactAlias = Matchers.getElementByText(alias);
    await Gestures.waitAndTap(contactAlias);
  }

  async tapAddContactButton() {
    await Gestures.waitAndTap(this.addButton);
  }

  async isContactAliasVisible(alias) {
    await TestHelpers.checkIfElementWithTextIsVisible(alias);
  }

  async isContactAliasNotVisible(alias) {
    await TestHelpers.checkIfElementWithTextIsNotVisible(alias);
  }
}

export default new ContactsView();
