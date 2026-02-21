import Matchers from '../../../tests/framework/Matchers';
import Gestures from '../../../tests/framework/Gestures';
import {
  PrivateKeyListIds,
  PrivateKeyListSelectorsText,
} from '../../../app/components/Views/MultichainAccounts/PrivateKeyList/PrivateKeyList.testIds';

class PrivateKeyList {
  get passwordInput(): DetoxElement {
    return Matchers.getElementByID(PrivateKeyListIds.PASSWORD_INPUT);
  }

  get continueButton(): DetoxElement {
    return Matchers.getElementByID(PrivateKeyListIds.CONTINUE_BUTTON);
  }

  get copyToClipboard(): DetoxElement {
    return Matchers.getElementByID(PrivateKeyListIds.COPY_TO_CLIPBOARD_BUTTON);
  }

  get privateKeyCopiedLabel(): DetoxElement {
    return Matchers.getElementByText(
      PrivateKeyListSelectorsText.PRIVATE_KEY_COPIED,
    );
  }

  get wrongPasswordLabel(): DetoxElement {
    return Matchers.getElementByText(
      PrivateKeyListSelectorsText.WRONG_PASSWORD_ERROR,
    );
  }

  async typePassword(password: string): Promise<void> {
    await Gestures.typeText(this.passwordInput, password, {
      elemDescription: 'Password Input in Private Keys',
    });
  }

  async tapContinue(): Promise<void> {
    await Gestures.waitAndTap(this.continueButton, {
      elemDescription: 'Continue Button in Private Keys',
    });
  }

  async tapCopyToClipboardAtIndex(accountIndex: number): Promise<void> {
    await Gestures.tapAtIndex(this.copyToClipboard, accountIndex, {
      elemDescription: `Copy to clipboard button at index ${accountIndex}`,
    });
  }
}

export default new PrivateKeyList();
