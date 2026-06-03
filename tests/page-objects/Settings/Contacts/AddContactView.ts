import Matchers from '../../../framework/Matchers';
import {
  AddContactViewSelectorsIDs,
  AddContactViewSelectorsText,
} from '../../../../app/components/Views/Settings/Contacts/AddContactView.testIds';
import {
  encapsulated,
  EncapsulatedElementType,
} from '../../../framework/EncapsulatedElement';
import PlaywrightMatchers from '../../../framework/PlaywrightMatchers';
import UnifiedGestures from '../../../framework/UnifiedGestures';

class AddContactView {
  get container(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(AddContactViewSelectorsIDs.CONTAINER),
      appium: () =>
        PlaywrightMatchers.getElementById(AddContactViewSelectorsIDs.CONTAINER),
    });
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

  get editContact(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByText(AddContactViewSelectorsText.EDIT_CONTACT),
      appium: () =>
        PlaywrightMatchers.getElementByText(
          AddContactViewSelectorsText.EDIT_CONTACT,
        ),
    });
  }

  get deleteButton(): DetoxElement {
    return device.getPlatform() === 'ios'
      ? Matchers.getElementByID(AddContactViewSelectorsIDs.DELETE_BUTTON)
      : Matchers.getElementByLabel(AddContactViewSelectorsIDs.DELETE_BUTTON);
  }

  get nameInput(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(AddContactViewSelectorsIDs.NAME_INPUT),
      appium: () =>
        PlaywrightMatchers.getElementById(
          AddContactViewSelectorsIDs.NAME_INPUT,
        ),
    });
  }

  get memoLabel(): EncapsulatedElementType {
    return encapsulated({
      detox: () => Matchers.getElementByText(AddContactViewSelectorsText.MEMO),
      appium: () =>
        PlaywrightMatchers.getElementByText(AddContactViewSelectorsText.MEMO),
    });
  }

  get memoInput(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(AddContactViewSelectorsIDs.MEMO_INPUT),
      appium: () =>
        PlaywrightMatchers.getElementById(
          AddContactViewSelectorsIDs.MEMO_INPUT,
        ),
    });
  }

  get addressInput(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(AddContactViewSelectorsIDs.ADDRESS_INPUT),
      appium: () =>
        PlaywrightMatchers.getElementById(
          AddContactViewSelectorsIDs.ADDRESS_INPUT,
        ),
    });
  }

  async tapAddContactButton(): Promise<void> {
    await UnifiedGestures.waitAndTap(this.addButton, {
      elemDescription: 'Add Contact Button',
    });
  }

  async tapEditButton(): Promise<void> {
    await UnifiedGestures.waitAndTap(this.editButton, {
      elemDescription: 'Edit Button',
    });
  }

  async tapEditContactCTA(): Promise<void> {
    await UnifiedGestures.waitAndTap(this.editContact, {
      elemDescription: 'Edit Contact CTA',
    });
  }

  async tapDeleteContactCTA(): Promise<void> {
    await UnifiedGestures.waitAndTap(this.deleteButton, {
      elemDescription: 'Delete Contact CTA',
    });
  }

  async typeInName(name: string): Promise<void> {
    await UnifiedGestures.replaceText(this.nameInput, name, {
      elemDescription: 'Name Input',
    });
    await UnifiedGestures.waitAndTap(this.memoLabel, {
      elemDescription: 'Memo Label',
    }); // tap somewhere to dismiss keyboard
  }

  async typeInMemo(memo: string): Promise<void> {
    await UnifiedGestures.replaceText(this.memoInput, memo, {
      elemDescription: 'Memo Input',
    });
    await UnifiedGestures.waitAndTap(this.memoLabel, {
      elemDescription: 'Memo Label',
    }); // tap somewhere to dismiss keyboard
  }

  async typeInAddress(address: string): Promise<void> {
    await UnifiedGestures.replaceText(this.addressInput, address, {
      elemDescription: 'Address Input',
    });
    await UnifiedGestures.waitAndTap(this.memoLabel, {
      elemDescription: 'Memo Label',
    }); // tap somewhere to dismiss keyboard
  }

  async clearAddressInputBox(): Promise<void> {
    await UnifiedGestures.typeText(this.addressInput, '', {
      elemDescription: 'Address Input',
    });
  }

  async selectNetwork(networkName: string): Promise<void> {
    const networkSelector = Matchers.getElementByID(
      AddContactViewSelectorsIDs.NETWORK_INPUT,
    );
    await UnifiedGestures.waitAndTap(networkSelector, {
      elemDescription: 'Network Selector',
    });
    const networkOption = Matchers.getElementByText(networkName);
    await UnifiedGestures.waitAndTap(networkOption, {
      elemDescription: `Network Option: ${networkName}`,
    });
  }
}

export default new AddContactView();
