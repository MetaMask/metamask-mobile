import {
  RevealSeedViewSelectorsIDs,
  RevealSeedViewSelectorsText,
} from '../../../selectors/Settings/SecurityAndPrivacy/RevealSeedView.selectors';
import Matchers from '../../../framework/Matchers';
import Gestures from '../../../framework/Gestures';

class RevealPrivateKey {
  get container(): DetoxElement {
    return Matchers.getElementByID(
      RevealSeedViewSelectorsIDs.REVEAL_CREDENTIAL_CONTAINER_ID,
    );
  }
  get passwordInputToRevealCredential(): DetoxElement {
    return Matchers.getElementByID(
      RevealSeedViewSelectorsIDs.PASSWORD_INPUT_BOX_ID,
    );
  }

  get passwordWarning(): DetoxElement {
    return Matchers.getElementByID(
      RevealSeedViewSelectorsIDs.PASSWORD_WARNING_ID,
    );
  }

  get scrollViewIdentifier(): Promise<DetoxMatcher> {
    return Matchers.getIdentifier(
      RevealSeedViewSelectorsIDs.REVEAL_CREDENTIAL_SCROLL_ID,
    );
  }

  get privateKey(): DetoxElement {
    return Matchers.getElementByText(
      RevealSeedViewSelectorsIDs.REVEAL_CREDENTIAL_TEXT,
    );
  }
  get revealPrivateKeyButton(): DetoxElement {
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

  async tapDoneButton(): Promise<void> {
    await Gestures.waitAndTap(this.doneButton, {
      elemDescription: 'Done button',
    });
  }

  async tapToReveal(): Promise<void> {
    await Gestures.waitAndTap(this.revealPrivateKeyButton, {
      elemDescription: 'Reveal private key button',
    });
  }

  async tapToCopyCredentialToClipboard(): Promise<void> {
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
    await Gestures.scrollToElement(this.doneButton, this.scrollViewIdentifier);
  }
  async enterPasswordToRevealSecretCredential(password: string): Promise<void> {
    await Gestures.typeText(this.passwordInputToRevealCredential, password, {
      elemDescription: 'Password input',
      hideKeyboard: true,
    });
  }
}

export default new RevealPrivateKey();
