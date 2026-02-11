import {
  RevealSeedViewSelectorsIDs,
  RevealSeedViewSelectorsText,
} from '../../../../app/components/Views/RevealPrivateCredential/RevealSeedView.testIds';
import Matchers from '../../../framework/Matchers';
import Gestures from '../../../framework/Gestures';
import Utilities from '../../../framework/Utilities';

class RevealSecretRecoveryPhrase {
  get container(): DetoxElement {
    return Matchers.getElementByID(
      RevealSeedViewSelectorsIDs.REVEAL_CREDENTIAL_CONTAINER_ID,
    );
  }

  get passwordWarning(): DetoxElement {
    return Matchers.getElementByID(
      RevealSeedViewSelectorsIDs.PASSWORD_WARNING_ID,
    );
  }

  get passwordInputToRevealCredential(): DetoxElement {
    return Matchers.getElementByID(
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

  get revealSecretRecoveryPhraseButton(): DetoxElement {
    return Matchers.getElementByID(
      RevealSeedViewSelectorsIDs.REVEAL_CREDENTIAL_BUTTON_ID,
    );
  }

  get revealCredentialCopyToClipboardButton(): DetoxElement {
    return Matchers.getElementByID(
      RevealSeedViewSelectorsIDs.REVEAL_CREDENTIAL_COPY_TO_CLIPBOARD_BUTTON,
    );
  }

  get revealCredentialQRCodeTab(): DetoxElement {
    return Matchers.getElementByText(
      RevealSeedViewSelectorsText.REVEAL_CREDENTIAL_QR_CODE_TAB_ID,
    );
  }

  get revealCredentialQRCodeImage(): DetoxElement {
    return Matchers.getElementByID(
      RevealSeedViewSelectorsIDs.REVEAL_CREDENTIAL_QR_CODE_IMAGE_ID,
    );
  }

  get doneButton(): DetoxElement {
    return Matchers.getElementByText(
      RevealSeedViewSelectorsText.REVEAL_CREDENTIAL_DONE,
    );
  }

  get confirmButton(): DetoxElement {
    return Matchers.getElementByID(
      RevealSeedViewSelectorsIDs.SECRET_RECOVERY_PHRASE_NEXT_BUTTON_ID,
    );
  }

  async enterPasswordToRevealSecretCredential(password: string): Promise<void> {
    // Wait for password screen to be ready (e.g. after navigation or quiz on iOS)
    await Utilities.waitForElementToBeVisible(
      this.passwordInputToRevealCredential,
      10000,
    );
    await Gestures.typeText(this.passwordInputToRevealCredential, password, {
      hideKeyboard: true,
      elemDescription: 'Password input to reveal credential',
    });
  }

  async tapConfirmButton(): Promise<void> {
    await Utilities.waitForElementToBeVisible(this.confirmButton, 10000);
    await Gestures.waitAndTap(this.confirmButton, {
      elemDescription: 'Confirm button to reveal credential',
    });
  }

  /**
   * Check if the component is already unlocked (biometrics succeeded).
   * When unlocked, the reveal button (blur overlay) is visible instead of password input.
   */
  async isUnlocked(): Promise<boolean> {
    try {
      // If the reveal button is visible, we're unlocked
      await expect(this.revealSecretRecoveryPhraseButton).toBeVisible();
      return true;
    } catch {
      // If not visible, we need password entry
      return false;
    }
  }

  async tapToReveal(): Promise<void> {
    await Gestures.waitAndTap(this.revealSecretRecoveryPhraseButton, {
      elemDescription: 'Reveal secret recovery phrase button',
    });
  }

  async tapToCopyCredentialToClipboard() {
    await Gestures.tap(this.revealCredentialCopyToClipboardButton, {
      elemDescription: 'Reveal credential copy to clipboard button',
    });
  }

  async tapToRevealPrivateCredentialQRCode(): Promise<void> {
    await Gestures.tap(this.revealCredentialQRCodeTab, {
      elemDescription: 'Reveal credential QR code tab',
    });
  }

  async scrollToDone(): Promise<void> {
    await Gestures.scrollToElement(this.doneButton, this.scrollViewIdentifier, {
      elemDescription: 'Done button',
    });
  }

  async tapDoneButton(): Promise<void> {
    await Gestures.waitAndTap(this.doneButton, {
      elemDescription: 'Done button',
    });
  }

  async scrollToCopyToClipboardButton(): Promise<void> {
    await Gestures.scrollToElement(
      this.revealCredentialCopyToClipboardButton,
      this.tabScrollViewTextIdentifier,
      {
        elemDescription: 'Copy to clipboard button',
      },
    );
  }

  async scrollToQR(): Promise<void> {
    await Gestures.scrollToElement(
      this.revealCredentialQRCodeImage,
      this.tabScrollViewQRCodeIdentifier,
      {
        elemDescription: 'QR code',
      },
    );
  }
}

export default new RevealSecretRecoveryPhrase();
