import Matchers from '../../utils/Matchers';
import Gestures from '../../utils/Gestures';
import { ExportCredentialsIds } from '../../selectors/MultichainAccounts/ExportCredentials.selectors';
import { RevealSeedViewSelectorsIDs } from '../../selectors/Settings/SecurityAndPrivacy/RevealSeedView.selectors';
import { IndexableNativeElement } from 'detox/detox';

class ExportCredentials {
  get srpInfoContainer() {
    return Matchers.getElementByID(ExportCredentialsIds.CONTAINER);
  }

  get revealContainer() {
    return Matchers.getElementByID(
      RevealSeedViewSelectorsIDs.REVEAL_CREDENTIAL_CONTAINER_ID,
    );
  }

  get exportPrivateKeyButton() {
    return Matchers.getElementByID(
      ExportCredentialsIds.EXPORT_PRIVATE_KEY_BUTTON,
    );
  }

  get exportSrpButton() {
    return Matchers.getElementByID(ExportCredentialsIds.EXPORT_SRP_BUTTON);
  }

  get passwordInput() {
    return Matchers.getElementByID(
      RevealSeedViewSelectorsIDs.PASSWORD_INPUT_BOX_ID,
    ) as Promise<IndexableNativeElement>;
  }

  get nextButton() {
    return Matchers.getElementByID(ExportCredentialsIds.NEXT_BUTTON);
  }

  get learnMoreButton() {
    return Matchers.getElementByID(ExportCredentialsIds.LEARN_MORE_BUTTON);
  }

  async tapExportPrivateKeyButton() {
    await Gestures.waitAndTap(this.exportPrivateKeyButton);
  }

  async tapExportSrpButton() {
    await Gestures.waitAndTap(this.exportSrpButton);
  }

  async enterPassword(password: string) {
    await Gestures.typeTextAndHideKeyboard(this.passwordInput, password);
  }

  async tapNextButton() {
    await Gestures.waitAndTap(this.nextButton);
  }

  async tapLearnMoreButton() {
    await Gestures.waitAndTap(this.learnMoreButton);
  }
}

export default new ExportCredentials();
