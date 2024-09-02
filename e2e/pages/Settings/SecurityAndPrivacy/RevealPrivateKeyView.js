import {
  RevealSeedViewSelectorsIDs,
  RevealSeedViewSelectorsText,
} from '../../../selectors/Settings/SecurityAndPrivacy/RevealSeedView.selectors';
import Matchers from '../../../utils/Matchers';
import Gestures from '../../../utils/Gestures';

class RevealPrivateKey {
  get container() {
    return Matchers.getElementByID(
      RevealSeedViewSelectorsIDs.REVEAL_CREDENTIAL_CONTAINER_ID,
    );
  }
  get passwordInputToRevealCredential() {
    return Matchers.getElementByID(
      RevealSeedViewSelectorsIDs.PASSWORD_INPUT_BOX_ID,
    );
  }

  get passwordWarning() {
    return Matchers.getElementByID(
      RevealSeedViewSelectorsIDs.PASSWORD_WARNING_ID,
    );
  }

  get scrollViewIdentifier() {
    return Matchers.getIdentifier(
      RevealSeedViewSelectorsIDs.REVEAL_CREDENTIAL_SCROLL_ID,
    );
  }

  get privateKey() {
    return Matchers.getElementByText(
      RevealSeedViewSelectorsIDs.REVEAL_CREDENTIAL_TEXT,
    );
  }
  get revealPrivateKeyButton() {
    return Matchers.getElementByID(
      RevealSeedViewSelectorsIDs.REVEAL_CREDENTIAL_BUTTON_ID,
    );
  }
  get revealCredentialCopyToClipboardButton() {
    return Matchers.getElementByID(
      RevealSeedViewSelectorsIDs.REVEAL_CREDENTIAL_COPY_TO_CLIPBOARD_BUTTON,
    );
  }

  get revealCredentialQRCodeTab() {
    return Matchers.getElementByText(
      RevealSeedViewSelectorsText.REVEAL_CREDENTIAL_QR_CODE_TAB_ID,
    );
  }

  get revealCredentialQRCodeImage() {
    return Matchers.getElementByID(
      RevealSeedViewSelectorsIDs.REVEAL_CREDENTIAL_QR_CODE_IMAGE_ID,
    );
  }

  get doneButton() {
    return Matchers.getElementByText(
      RevealSeedViewSelectorsText.REVEAL_CREDENTIAL_DONE,
    );
  }

  async tapDoneButton() {
    await Gestures.waitAndTap(this.doneButton);
  }

  async tapToReveal() {
    await Gestures.waitAndTap(this.revealPrivateKeyButton);
  }

  async tapToCopyCredentialToClipboard() {
    await Gestures.tap(this.revealCredentialCopyToClipboardButton);
  }

  async tapToRevealPrivateCredentialQRCode() {
    await Gestures.tap(this.revealCredentialQRCodeTab);
  }

  async scrollToDone() {
    await Gestures.scrollToElement(this.doneButton, this.scrollViewIdentifier);
  }
  async enterPasswordToRevealSecretCredential(password) {
    await Gestures.typeTextAndHideKeyboard(
      this.passwordInputToRevealCredential,
      password,
    );
  }
}

export default new RevealPrivateKey();
