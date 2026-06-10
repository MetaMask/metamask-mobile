import {
  RevealSeedViewSelectorsIDs,
  RevealSeedViewSelectorsText,
} from '../../../../app/components/Views/RevealPrivateCredential/RevealSeedView.testIds';
import Matchers from '../../../framework/Matchers';
import Gestures from '../../../framework/Gestures';
import Utilities from '../../../framework/Utilities';
import {
  EncapsulatedElementType,
  asPlaywrightElement,
  asDetoxElement,
} from '../../../framework';
import { encapsulatedAction } from '../../../framework/encapsulatedAction';
import PlaywrightAssertions from '../../../framework/PlaywrightAssertions';
import PlaywrightGestures from '../../../framework/PlaywrightGestures';
import UnifiedGestures from '../../../framework/UnifiedGestures';
import { PlatformDetector } from '../../../framework/PlatformLocator';

class RevealSecretRecoveryPhrase {
  get container(): EncapsulatedElementType {
    return Matchers.getElementByID(
      RevealSeedViewSelectorsIDs.REVEAL_CREDENTIAL_CONTAINER_ID,
    );
  }

  get passwordWarning(): EncapsulatedElementType {
    return Matchers.getElementByID(
      RevealSeedViewSelectorsIDs.PASSWORD_WARNING_ID,
    );
  }

  get passwordInputToRevealCredential(): EncapsulatedElementType {
    return Matchers.getElementByLabel(
      RevealSeedViewSelectorsIDs.PASSWORD_INPUT_BOX_ID,
    );
  }

  get scrollViewIdentifier(): Promise<DetoxMatcher> {
    return Matchers.getIdentifier(
      RevealSeedViewSelectorsIDs.REVEAL_CREDENTIAL_SCROLL_ID,
    );
  }

  get tabScrollViewTextIdentifier(): Promise<DetoxMatcher> {
    return Matchers.getIdentifier(
      RevealSeedViewSelectorsIDs.TAB_SCROLL_VIEW_TEXT,
    );
  }

  get tabScrollViewQRCodeIdentifier(): Promise<DetoxMatcher> {
    return Matchers.getIdentifier(
      RevealSeedViewSelectorsIDs.TAB_SCROLL_VIEW_QR_CODE,
    );
  }

  get revealSecretRecoveryPhraseButton(): EncapsulatedElementType {
    return Matchers.getElementByID(
      RevealSeedViewSelectorsIDs.REVEAL_CREDENTIAL_BUTTON_ID,
    );
  }

  get revealCredentialCopyToClipboardButton(): EncapsulatedElementType {
    return Matchers.getElementByID(
      RevealSeedViewSelectorsIDs.REVEAL_CREDENTIAL_COPY_TO_CLIPBOARD_BUTTON,
    );
  }

  get revealCredentialQRCodeTab(): EncapsulatedElementType {
    return Matchers.getElementByText(
      RevealSeedViewSelectorsText.REVEAL_CREDENTIAL_QR_CODE_TAB_ID,
    );
  }

  get revealCredentialQRCodeImage(): EncapsulatedElementType {
    return Matchers.getElementByID(
      RevealSeedViewSelectorsIDs.REVEAL_CREDENTIAL_QR_CODE_IMAGE_ID,
    );
  }

  get doneButton(): EncapsulatedElementType {
    return Matchers.getElementByText(
      RevealSeedViewSelectorsText.REVEAL_CREDENTIAL_DONE,
    );
  }

  get confirmButton(): EncapsulatedElementType {
    return Matchers.getElementByID(
      RevealSeedViewSelectorsIDs.SECRET_RECOVERY_PHRASE_NEXT_BUTTON_ID,
    );
  }

  async enterPasswordToRevealSecretCredential(password: string): Promise<void> {
    await encapsulatedAction({
      detox: async () => {
        await Utilities.waitForElementToBeVisible(
          asDetoxElement(this.passwordInputToRevealCredential),
          15000,
        );
        await Gestures.typeText(
          asDetoxElement(this.passwordInputToRevealCredential),
          password,
          {
            hideKeyboard: true,
            elemDescription: 'Password input to reveal credential',
          },
        );
      },
      appium: async () => {
        await PlaywrightAssertions.expectElementToBeVisible(
          await asPlaywrightElement(this.passwordInputToRevealCredential),
          {
            timeout: 15000,
            description: 'Password input to reveal credential',
          },
        );
        const textToType = PlatformDetector.isIOS()
          ? `${password}\n`
          : password;
        await UnifiedGestures.typeText(
          this.passwordInputToRevealCredential,
          textToType,
          {
            description: 'Password input to reveal credential',
          },
        );
        if (PlatformDetector.isAndroid()) {
          await PlaywrightGestures.hideKeyboard();
        }
      },
    });
  }

  async tapConfirmButton(): Promise<void> {
    await UnifiedGestures.waitAndTap(this.confirmButton, {
      description: 'Confirm button to reveal credential',
    });
  }

  /**
   * Check if the component is already unlocked (blur overlay / "Tap to reveal" visible).
   * Waits up to 3s so we can detect transition after keyboard submit (onSubmitEditing → tryUnlock).
   */
  async isUnlocked(): Promise<boolean> {
    try {
      await encapsulatedAction({
        detox: async () => {
          await Utilities.waitForElementToBeVisible(
            asDetoxElement(this.revealSecretRecoveryPhraseButton),
            3000,
          );
        },
        appium: async () => {
          await PlaywrightAssertions.expectElementToBeVisible(
            await asPlaywrightElement(this.revealSecretRecoveryPhraseButton),
            { timeout: 3000 },
          );
        },
      });
      return true;
    } catch {
      return false;
    }
  }

  async tapToReveal(): Promise<void> {
    await UnifiedGestures.waitAndTap(this.revealSecretRecoveryPhraseButton, {
      description: 'Reveal secret recovery phrase button',
    });
  }

  async tapToCopyCredentialToClipboard() {
    await UnifiedGestures.tap(this.revealCredentialCopyToClipboardButton, {
      description: 'Reveal credential copy to clipboard button',
    });
  }

  async tapToRevealPrivateCredentialQRCode(): Promise<void> {
    await UnifiedGestures.tap(this.revealCredentialQRCodeTab, {
      description: 'Reveal credential QR code tab',
    });
  }

  async scrollToDone(): Promise<void> {
    await UnifiedGestures.scrollToElement(
      this.doneButton,
      RevealSeedViewSelectorsIDs.REVEAL_CREDENTIAL_SCROLL_ID,
      {
        description: 'Done button',
      },
    );
  }

  async tapDoneButton(): Promise<void> {
    await UnifiedGestures.waitAndTap(this.doneButton, {
      description: 'Done button',
    });
  }

  async scrollToCopyToClipboardButton(): Promise<void> {
    await UnifiedGestures.scrollToElement(
      this.revealCredentialCopyToClipboardButton,
      RevealSeedViewSelectorsIDs.TAB_SCROLL_VIEW_TEXT,
      {
        description: 'Copy to clipboard button',
      },
    );
  }

  async scrollToQR(): Promise<void> {
    await UnifiedGestures.scrollToElement(
      this.revealCredentialQRCodeImage,
      RevealSeedViewSelectorsIDs.TAB_SCROLL_VIEW_QR_CODE,
      {
        description: 'QR code',
      },
    );
  }
}

export default new RevealSecretRecoveryPhrase();
