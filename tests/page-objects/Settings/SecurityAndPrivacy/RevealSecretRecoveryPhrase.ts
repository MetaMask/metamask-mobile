import {
  RevealSeedViewSelectorsIDs,
  RevealSeedViewSelectorsText,
} from '../../../../app/components/Views/RevealPrivateCredential/RevealSeedView.testIds';
import Matchers from '../../../framework/Matchers';
import Utilities from '../../../framework/Utilities';
import {
  encapsulated,
  EncapsulatedElementType,
} from '../../../framework/EncapsulatedElement';
import PlaywrightMatchers from '../../../framework/PlaywrightMatchers';
import UnifiedGestures from '../../../framework/UnifiedGestures';

class RevealSecretRecoveryPhrase {
  get container(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(
          RevealSeedViewSelectorsIDs.REVEAL_CREDENTIAL_CONTAINER_ID,
        ),
      appium: () =>
        PlaywrightMatchers.getElementById(
          RevealSeedViewSelectorsIDs.REVEAL_CREDENTIAL_CONTAINER_ID,
        ),
    });
  }

  get passwordWarning(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(RevealSeedViewSelectorsIDs.PASSWORD_WARNING_ID),
      appium: () =>
        PlaywrightMatchers.getElementById(
          RevealSeedViewSelectorsIDs.PASSWORD_WARNING_ID,
        ),
    });
  }

  get passwordInputToRevealCredential(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByLabel(
          RevealSeedViewSelectorsIDs.PASSWORD_INPUT_BOX_ID,
        ),
      appium: () =>
        PlaywrightMatchers.getElementByAccessibilityId(
          RevealSeedViewSelectorsIDs.PASSWORD_INPUT_BOX_ID,
        ),
    });
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
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(
          RevealSeedViewSelectorsIDs.REVEAL_CREDENTIAL_BUTTON_ID,
        ),
      appium: () =>
        PlaywrightMatchers.getElementById(
          RevealSeedViewSelectorsIDs.REVEAL_CREDENTIAL_BUTTON_ID,
        ),
    });
  }

  get revealCredentialCopyToClipboardButton(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(
          RevealSeedViewSelectorsIDs.REVEAL_CREDENTIAL_COPY_TO_CLIPBOARD_BUTTON,
        ),
      appium: () =>
        PlaywrightMatchers.getElementById(
          RevealSeedViewSelectorsIDs.REVEAL_CREDENTIAL_COPY_TO_CLIPBOARD_BUTTON,
        ),
    });
  }

  get revealCredentialQRCodeTab(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByText(
          RevealSeedViewSelectorsText.REVEAL_CREDENTIAL_QR_CODE_TAB_ID,
        ),
      appium: () =>
        PlaywrightMatchers.getElementByText(
          RevealSeedViewSelectorsText.REVEAL_CREDENTIAL_QR_CODE_TAB_ID,
        ),
    });
  }

  get revealCredentialQRCodeImage(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(
          RevealSeedViewSelectorsIDs.REVEAL_CREDENTIAL_QR_CODE_IMAGE_ID,
        ),
      appium: () =>
        PlaywrightMatchers.getElementById(
          RevealSeedViewSelectorsIDs.REVEAL_CREDENTIAL_QR_CODE_IMAGE_ID,
        ),
    });
  }

  get doneButton(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByText(
          RevealSeedViewSelectorsText.REVEAL_CREDENTIAL_DONE,
        ),
      appium: () =>
        PlaywrightMatchers.getElementByText(
          RevealSeedViewSelectorsText.REVEAL_CREDENTIAL_DONE,
        ),
    });
  }

  get confirmButton(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(
          RevealSeedViewSelectorsIDs.SECRET_RECOVERY_PHRASE_NEXT_BUTTON_ID,
        ),
      appium: () =>
        PlaywrightMatchers.getElementById(
          RevealSeedViewSelectorsIDs.SECRET_RECOVERY_PHRASE_NEXT_BUTTON_ID,
        ),
    });
  }

  async enterPasswordToRevealSecretCredential(password: string): Promise<void> {
    // Wait for password screen to be ready (e.g. after navigation or quiz on iOS/Android CI)
    await Utilities.waitForElementToBeVisible(
      this.passwordInputToRevealCredential,
      15000,
    );
    await UnifiedGestures.typeText(
      this.passwordInputToRevealCredential,
      password,
      {
        hideKeyboard: true,
        elemDescription: 'Password input to reveal credential',
      },
    );
  }

  async tapConfirmButton(): Promise<void> {
    await UnifiedGestures.waitAndTap(this.confirmButton, {
      elemDescription: 'Confirm button to reveal credential',
    });
  }

  /**
   * Check if the component is already unlocked (blur overlay / "Tap to reveal" visible).
   * Waits up to 3s so we can detect transition after keyboard submit (onSubmitEditing → tryUnlock).
   */
  async isUnlocked(): Promise<boolean> {
    try {
      await Utilities.waitForElementToBeVisible(
        this.revealSecretRecoveryPhraseButton,
        3000,
      );
      return true;
    } catch {
      return false;
    }
  }

  async tapToReveal(): Promise<void> {
    await UnifiedGestures.waitAndTap(this.revealSecretRecoveryPhraseButton, {
      elemDescription: 'Reveal secret recovery phrase button',
    });
  }

  async tapToCopyCredentialToClipboard() {
    await UnifiedGestures.tap(this.revealCredentialCopyToClipboardButton, {
      elemDescription: 'Reveal credential copy to clipboard button',
    });
  }

  async tapToRevealPrivateCredentialQRCode(): Promise<void> {
    await UnifiedGestures.tap(this.revealCredentialQRCodeTab, {
      elemDescription: 'Reveal credential QR code tab',
    });
  }

  async scrollToDone(): Promise<void> {
    await UnifiedGestures.scrollToElement(
      this.doneButton,
      this.scrollViewIdentifier,
      {
        elemDescription: 'Done button',
      },
    );
  }

  async tapDoneButton(): Promise<void> {
    await UnifiedGestures.waitAndTap(this.doneButton, {
      elemDescription: 'Done button',
    });
  }

  async scrollToCopyToClipboardButton(): Promise<void> {
    await UnifiedGestures.scrollToElement(
      this.revealCredentialCopyToClipboardButton,
      this.tabScrollViewTextIdentifier,
      {
        elemDescription: 'Copy to clipboard button',
      },
    );
  }

  async scrollToQR(): Promise<void> {
    await UnifiedGestures.scrollToElement(
      this.revealCredentialQRCodeImage,
      this.tabScrollViewQRCodeIdentifier,
      {
        elemDescription: 'QR code',
      },
    );
  }
}

export default new RevealSecretRecoveryPhrase();
