import Matchers from '../../../framework/Matchers';
import {
  AddContactViewSelectorsIDs,
  AddContactViewSelectorsText,
} from '../../../../app/components/Views/Settings/Contacts/AddContactView.testIds';
import Gestures from '../../../framework/Gestures';

class AddContactView {
  get container(): DetoxElement {
    return Matchers.getElementByID(AddContactViewSelectorsIDs.CONTAINER);
  }

  get addButton(): DetoxElement {
    return device.getPlatform() === 'ios'
      ? Matchers.getElementByID(AddContactViewSelectorsIDs.ADD_BUTTON)
      : Matchers.getElementByLabel(AddContactViewSelectorsIDs.ADD_BUTTON);
  }

  get editButton(): DetoxElement {
    return device.getPlatform() === 'ios'
      ? Matchers.getElementByID(AddContactViewSelectorsIDs.EDIT_BUTTON)
      : Matchers.getElementByLabel(AddContactViewSelectorsText.EDIT_BUTTON);
  }

  get editContact(): DetoxElement {
    return Matchers.getElementByText(AddContactViewSelectorsText.EDIT_CONTACT);
  }

  get deleteButton(): DetoxElement {
    return device.getPlatform() === 'ios'
      ? Matchers.getElementByID(AddContactViewSelectorsIDs.DELETE_BUTTON)
      : Matchers.getElementByLabel(AddContactViewSelectorsIDs.DELETE_BUTTON);
  }

  get nameInput(): DetoxElement {
    return Matchers.getElementByID(AddContactViewSelectorsIDs.NAME_INPUT);
  }

  get memoLabel(): DetoxElement {
    return Matchers.getElementByText(AddContactViewSelectorsText.MEMO);
  }

  get memoInput(): DetoxElement {
    return Matchers.getElementByID(AddContactViewSelectorsIDs.MEMO_INPUT);
  }

  get addressInput(): DetoxElement {
    return Matchers.getElementByID(AddContactViewSelectorsIDs.ADDRESS_INPUT);
  }

  async tapAddContactButton(): Promise<void> {
    await Gestures.waitAndTap(this.addButton, {
      elemDescription: 'Add Contact Button',
    });
  }

  async tapEditButton(): Promise<void> {
    await Gestures.waitAndTap(this.editButton, {
      elemDescription: 'Edit Button',
    });
  }

  async tapEditContactCTA(): Promise<void> {
    await Gestures.waitAndTap(this.editContact, {
      elemDescription: 'Edit Contact CTA',
    });
  }

  async tapDeleteContactCTA(): Promise<void> {
    await Gestures.waitAndTap(this.deleteButton, {
      elemDescription: 'Delete Contact CTA',
    });
  }

  async typeInName(name: string): Promise<void> {
    await Gestures.replaceText(this.nameInput, name, {
      elemDescription: 'Name Input',
    });
    await Gestures.waitAndTap(this.memoLabel, {
      elemDescription: 'Memo Label',
    }); // tap somewhere to dismiss keyboard
  }

  async typeInMemo(memo: string): Promise<void> {
    await Gestures.replaceText(this.memoInput, memo, {
      elemDescription: 'Memo Input',
    });
    await Gestures.waitAndTap(this.memoLabel, {
      elemDescription: 'Memo Label',
    }); // tap somewhere to dismiss keyboard
  }

  async typeInAddress(address: string): Promise<void> {
    await Gestures.replaceText(this.addressInput, address, {
      elemDescription: 'Address Input',
    });
    await Gestures.waitAndTap(this.memoLabel, {
      elemDescription: 'Memo Label',
    }); // tap somewhere to dismiss keyboard
  }

  async clearAddressInputBox(): Promise<void> {
    await Gestures.typeText(this.addressInput, '', {
      elemDescription: 'Address Input',
    });
  }

  async selectNetwork(networkName: string): Promise<void> {
    const networkSelector = Matchers.getElementByID(
      AddContactViewSelectorsIDs.NETWORK_INPUT,
    );
    await Gestures.waitAndTap(networkSelector, {
      elemDescription: 'Network Selector',
    });
    const networkOption = Matchers.getElementByText(networkName);
    await Gestures.waitAndTap(networkOption, {
      elemDescription: `Network Option: ${networkName}`,
    });
  }
}

export default new AddContactView();
