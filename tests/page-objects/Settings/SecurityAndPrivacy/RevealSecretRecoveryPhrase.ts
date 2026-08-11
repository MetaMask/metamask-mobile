import {
  RevealSeedViewSelectorsIDs,
  RevealSeedViewSelectorsText,
} from '../../../../app/components/Views/RevealPrivateCredential/RevealSeedView.testIds';
import Matchers from '../../../framework/Matchers';
import Gestures from '../../../framework/Gestures';
import Assertions from '../../../framework/Assertions';
import { EncapsulatedElementType } from '../../../framework';
import { PlatformDetector } from '../../../framework/PlatformLocator';
import type { TapOptions } from '../../../framework/types';

/** Appium iOS: skip displayed/enabled checks when XCTest falsely reports hidden. */
const iosAppiumTapOptions = (elemDescription: string): TapOptions => {
  const skipDisplayedChecks = PlatformDetector.isIOSAppium();
  return {
    elemDescription,
    checkForDisplayed: !skipDisplayedChecks,
    checkEnabled: !skipDisplayedChecks,
  };
};

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
    await Assertions.expectElementToBeVisible(
      this.passwordInputToRevealCredential,
      {
        timeout: 15000,
        description: 'Password input to reveal credential',
      },
    );
    await Gestures.typeText(this.passwordInputToRevealCredential, password, {
      elemDescription: 'Password input to reveal credential',
      hideKeyboard: true,
      clearFirst: true,
    });
  }

  async tapConfirmButton(): Promise<void> {
    await Gestures.waitAndTap(
      this.confirmButton,
      iosAppiumTapOptions('Confirm button to reveal credential'),
    );
  }

  /**
   * Check if the component is already unlocked (blur overlay / "Tap to reveal" visible).
   * Waits up to 3s so we can detect transition after keyboard submit (onSubmitEditing → tryUnlock).
   */
  async isUnlocked(): Promise<boolean> {
    try {
      await Assertions.expectElementToBeVisible(
        this.revealSecretRecoveryPhraseButton,
        {
          timeout: 3000,
        },
      );
      return true;
    } catch {
      return false;
    }
  }

  async tapToReveal(): Promise<void> {
    await Gestures.waitAndTap(
      this.revealSecretRecoveryPhraseButton,
      iosAppiumTapOptions('Reveal secret recovery phrase button'),
    );
  }

  async tapToCopyCredentialToClipboard() {
    await Gestures.tap(
      this.revealCredentialCopyToClipboardButton,
      iosAppiumTapOptions('Reveal credential copy to clipboard button'),
    );
  }

  async tapToRevealPrivateCredentialQRCode(): Promise<void> {
    await Gestures.tap(
      this.revealCredentialQRCodeTab,
      iosAppiumTapOptions('Reveal credential QR code tab'),
    );
  }

  async scrollToDone(): Promise<void> {
    await Gestures.scrollToElement(
      this.doneButton,
      RevealSeedViewSelectorsIDs.REVEAL_CREDENTIAL_SCROLL_ID,
      {
        elemDescription: 'Done button',
      },
    );
  }

  async tapDoneButton(): Promise<void> {
    await Gestures.waitAndTap(
      this.doneButton,
      iosAppiumTapOptions('Done button'),
    );
  }

  async scrollToCopyToClipboardButton(): Promise<void> {
    await Gestures.scrollToElement(
      this.revealCredentialCopyToClipboardButton,
      RevealSeedViewSelectorsIDs.TAB_SCROLL_VIEW_TEXT,
      {
        elemDescription: 'Copy to clipboard button',
      },
    );
  }

  async scrollToQR(): Promise<void> {
    await Gestures.scrollToElement(
      this.revealCredentialQRCodeImage,
      RevealSeedViewSelectorsIDs.TAB_SCROLL_VIEW_QR_CODE,
      {
        elemDescription: 'QR code',
      },
    );
  }
}

export default new RevealSecretRecoveryPhrase();
