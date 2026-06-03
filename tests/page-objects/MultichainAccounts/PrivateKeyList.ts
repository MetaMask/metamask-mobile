import Matchers from '../../framework/Matchers';
import {
  PrivateKeyListIds,
  PrivateKeyListSelectorsText,
} from '../../../app/components/Views/MultichainAccounts/PrivateKeyList/PrivateKeyList.testIds';
import {
  encapsulated,
  EncapsulatedElementType,
} from '../../framework/EncapsulatedElement';
import PlaywrightMatchers from '../../framework/PlaywrightMatchers';
import UnifiedGestures from '../../framework/UnifiedGestures';

class PrivateKeyList {
  get passwordInput(): EncapsulatedElementType {
    return encapsulated({
      detox: () => Matchers.getElementByID(PrivateKeyListIds.PASSWORD_INPUT),
      appium: () =>
        PlaywrightMatchers.getElementById(PrivateKeyListIds.PASSWORD_INPUT),
    });
  }

  get continueButton(): EncapsulatedElementType {
    return encapsulated({
      detox: () => Matchers.getElementByID(PrivateKeyListIds.CONTINUE_BUTTON),
      appium: () =>
        PlaywrightMatchers.getElementById(PrivateKeyListIds.CONTINUE_BUTTON),
    });
  }

  get copyToClipboard(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(PrivateKeyListIds.COPY_TO_CLIPBOARD_BUTTON),
      appium: () =>
        PlaywrightMatchers.getElementById(
          PrivateKeyListIds.COPY_TO_CLIPBOARD_BUTTON,
        ),
    });
  }

  get privateKeyCopiedLabel(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByText(
          PrivateKeyListSelectorsText.PRIVATE_KEY_COPIED,
        ),
      appium: () =>
        PlaywrightMatchers.getElementByText(
          PrivateKeyListSelectorsText.PRIVATE_KEY_COPIED,
        ),
    });
  }

  get wrongPasswordLabel(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByText(
          PrivateKeyListSelectorsText.WRONG_PASSWORD_ERROR,
        ),
      appium: () =>
        PlaywrightMatchers.getElementByText(
          PrivateKeyListSelectorsText.WRONG_PASSWORD_ERROR,
        ),
    });
  }

  async typePassword(password: string): Promise<void> {
    await UnifiedGestures.typeText(this.passwordInput, password, {
      elemDescription: 'Password Input in Private Keys',
    });
  }

  async tapContinue(): Promise<void> {
    await UnifiedGestures.waitAndTap(this.continueButton, {
      elemDescription: 'Continue Button in Private Keys',
    });
  }

  async tapCopyToClipboardAtIndex(accountIndex: number): Promise<void> {
    await UnifiedGestures.tapAtIndex(this.copyToClipboard, accountIndex, {
      elemDescription: `Copy to clipboard button at index ${accountIndex}`,
    });
  }
}

export default new PrivateKeyList();
